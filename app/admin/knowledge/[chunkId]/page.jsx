"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminKnowledgeChunkPage() {
  const { chunkId } = useParams();
  const router = useRouter();
  const [chunk, setChunk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/knowledge/${chunkId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setChunk(json.data);
          setNotes(json.data.verification_notes || "");
        }
      }
      setLoading(false);
    }
    load();
  }, [chunkId]);

  async function handleAction(action) {
    setActionLoading(true);
    const res = await fetch(`/api/admin/knowledge/${chunkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, verification_notes: notes }),
    });

    if (res.ok) {
      // Reload chunk data
      const reload = await fetch(`/api/admin/knowledge/${chunkId}`);
      if (reload.ok) {
        const json = await reload.json();
        if (json.success) {
          setChunk(json.data);
          setNotes(json.data.verification_notes || "");
        }
      }
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-white/30">Loading chunk...</p>
      </div>
    );
  }

  if (!chunk) {
    return (
      <div className="p-8">
        <p className="text-sm text-white/30">Chunk not found</p>
        <Link href="/admin/knowledge" className="text-xs text-white/40 hover:text-white mt-4 inline-block">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/knowledge"
          className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-md transition-colors">
          Back
        </Link>
        <h1 className="text-lg font-semibold text-white">Chunk Detail</h1>
        {chunk.verified ? (
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full">Verified</span>
        ) : (
          <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full">Pending</span>
        )}
      </div>

      {/* Source info */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-white/30 mb-1">Source</p>
            <p className="text-white/70">{chunk.source_name}</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Document Title</p>
            <p className="text-white/70">{chunk.document_title}</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Source URL</p>
            <a
              href={chunk.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white underline text-xs break-all">
              {chunk.source_url}
            </a>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Chunk</p>
            <p className="text-white/50 text-xs">
              {chunk.chunk_index + 1} of {chunk.total_chunks}
            </p>
          </div>
        </div>

        {/* Monument tags */}
        <div className="mt-4">
          <p className="text-xs text-white/30 mb-2">Monument Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {(chunk.monument_tags || []).map((tag) => (
              <span key={tag} className="text-xs bg-white/5 text-white/50 px-2.5 py-1 rounded-full">
                {tag.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chunk text */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5 mb-4">
        <p className="text-xs text-white/30 mb-3">Chunk Content</p>
        <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-mono bg-white/2 rounded-lg p-4 border border-white/5">
          {chunk.chunk_text}
        </div>
      </div>

      {/* Verification panel */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
        <p className="text-xs text-white/30 mb-3">Verification</p>

        {chunk.verified && (
          <div className="mb-4 text-xs text-white/40">
            Verified by <span className="text-white/60">{chunk.verified_by}</span> on{" "}
            <span className="text-white/60">{new Date(chunk.verified_at).toLocaleString()}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-white/30 block mb-1.5">Verification Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
            placeholder="Add reviewer notes..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleAction("verify")}
            disabled={actionLoading}
            className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            Verify
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={actionLoading}
            className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            Reject Source
          </button>
          <button
            onClick={() => handleAction("note")}
            disabled={actionLoading}
            className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
