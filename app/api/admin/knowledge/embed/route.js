import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getHeritageSql } from "@/lib/server/heritageDb";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
const TARGET_WORDS_PER_CHUNK = 200;
const EMBED_CONCURRENCY = 5;

function chunkText(text, targetWords = TARGET_WORDS_PER_CHUNK) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'\u2018\u201C])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [clean];

  const chunks = [];
  let buf = [];
  let bufWords = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    buf.push(sentence);
    bufWords += words;
    if (bufWords >= targetWords) {
      chunks.push(buf.join(" "));
      buf = [];
      bufWords = 0;
    }
  }
  if (buf.length) chunks.push(buf.join(" "));
  return chunks;
}

async function embedChunk(text, apiKey) {
  const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Gemini response missing embedding.values");
  }
  return values;
}

async function embedAll(chunks, apiKey) {
  const embeddings = new Array(chunks.length).fill(null);
  const errors = [];
  for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
    const slice = chunks.slice(i, i + EMBED_CONCURRENCY);
    const settled = await Promise.allSettled(
      slice.map((c) => embedChunk(c, apiKey))
    );
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") {
        embeddings[i + j] = r.value;
      } else {
        const msg = r.reason?.message || String(r.reason);
        errors.push(`chunk ${i + j}: ${msg}`);
        console.error(`embed chunk ${i + j} failed:`, msg);
      }
    });
  }
  return { embeddings, errors };
}

function toVectorLiteral(vec) {
  return `[${vec.join(",")}]`;
}

export async function POST(request) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    text,
    source_name,
    source_url,
    document_title,
    monument_tags,
    auto_verify,
  } = body || {};

  if (!text || !source_name || !source_url) {
    return NextResponse.json(
      {
        success: false,
        error: "text, source_name, and source_url are required",
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const tags = Array.isArray(monument_tags)
    ? monument_tags.filter(Boolean)
    : [];
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json(
      { success: false, error: "Document has no usable text" },
      { status: 400 }
    );
  }

  const { embeddings, errors: embedErrors } = await embedAll(chunks, apiKey);
  const embeddedCount = embeddings.filter(Boolean).length;
  if (embeddedCount === 0) {
    return NextResponse.json(
      {
        success: false,
        error: `All chunks failed to embed. First error: ${embedErrors[0] || "unknown"}`,
      },
      { status: 502 }
    );
  }

  const sql = getHeritageSql();
  const verifiedAt = auto_verify ? new Date().toISOString() : null;
  const verifiedBy = auto_verify ? adminCheck.payload.email : null;

  let sourceId;
  try {
    const sourceRows = await sql`
      INSERT INTO heritage_knowledge_sources
        (source_name, source_url, document_title, is_active)
      VALUES
        (${source_name}, ${source_url}, ${document_title || null}, true)
      ON CONFLICT (source_url) DO UPDATE SET
        source_name = EXCLUDED.source_name,
        document_title = EXCLUDED.document_title,
        is_active = true
      RETURNING id
    `;
    sourceId = sourceRows[0]?.id;
    if (!sourceId) throw new Error("source insert returned no id");
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Source upsert failed: ${err.message}` },
      { status: 500 }
    );
  }

  let inserted = 0;
  const insertErrors = [];
  for (let i = 0; i < chunks.length; i++) {
    const vec = embeddings[i];
    if (!vec) continue;
    try {
      await sql`
        INSERT INTO heritage_knowledge_chunks
          (source_id, chunk_text, chunk_index, total_chunks, monument_tags,
           embedding, verified, verified_at, verified_by)
        VALUES
          (${sourceId}, ${chunks[i]}, ${i}, ${chunks.length}, ${tags},
           ${toVectorLiteral(vec)}::vector,
           ${!!auto_verify}, ${verifiedAt}, ${verifiedBy})
      `;
      inserted++;
    } catch (err) {
      insertErrors.push(`chunk ${i}: ${err.message}`);
    }
  }

  if (inserted === 0) {
    return NextResponse.json(
      {
        success: false,
        error: `No chunks inserted. First error: ${insertErrors[0] || "unknown"}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      source_id: sourceId,
      chunks_created: chunks.length,
      chunks_embedded: inserted,
      auto_verified: !!auto_verify,
    },
  });
}
