"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";

const EMPTY_FORM = {
  title: "",
  source_type: "text",
  source_url: "",
  raw_content: "",
  place_type: "",
  monument_tags: "",
};

const SOURCE_TYPES = [
  { value: "text", label: "Paste text" },
  { value: "url", label: "Crawl URL" },
];

const STATUS_COLORS = {
  ready: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  pending: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  embedding: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  failed: "text-rose-300 border-rose-500/40 bg-rose-500/10",
};

export default function KnowledgeSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function load() {
    startTransition(() => setLoading(true));
    try {
      const res = await fetch("/api/admin/knowledge/submissions");
      const json = await res.json();
      if (json.success) {
        startTransition(() => setSubmissions(json.data?.submissions || []));
      }
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        source_type: form.source_type,
        place_type: form.place_type.trim(),
        monument_tags: form.monument_tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (form.source_type === "text") {
        payload.raw_content = form.raw_content;
      } else if (form.source_type === "url") {
        payload.source_url = form.source_url.trim();
      }

      const res = await fetch("/api/admin/knowledge/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Submission failed");
      } else {
        setResult(json.data);
        setForm(EMPTY_FORM);
        await load();
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this submission and all its chunks?")) return;
    const res = await fetch(`/api/admin/knowledge/submissions/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "Delete failed");
      return;
    }
    await load();
  }

  async function onReprocess(id) {
    const res = await fetch(`/api/admin/knowledge/submissions/${id}/reprocess`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "Reprocess failed");
      return;
    }
    await load();
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">Knowledge Submissions</h1>
            <p className="text-white/50 text-sm mt-1">
              Feed verified heritage facts into the RAG corpus. Text is embedded synchronously;
              URLs are crawled by the ingestion worker every 5 minutes.
            </p>
          </div>
          <Link
            href="/admin/knowledge"
            className="text-sm text-white/60 hover:text-white/90 transition"
          >
            ← Back to chunks
          </Link>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-wider text-white/40">Title</span>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Mukteswar Temple history (ASI)"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-wider text-white/40">Source type</span>
              <select
                value={form.source_type}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#0d0d0d]">
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.source_type === "url" && (
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-wider text-white/40">Source URL</span>
              <input
                required
                type="url"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://en.wikipedia.org/wiki/Mukteshvara_Temple"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </label>
          )}

          {form.source_type === "text" && (
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-wider text-white/40">Raw content</span>
              <textarea
                required
                rows={8}
                value={form.raw_content}
                onChange={(e) => setForm({ ...form, raw_content: e.target.value })}
                placeholder="Paste verified text about the monument…"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30 font-mono"
              />
            </label>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-wider text-white/40">
                Place type (optional)
              </span>
              <input
                type="text"
                value={form.place_type}
                onChange={(e) => setForm({ ...form, place_type: e.target.value })}
                placeholder="temple"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs uppercase tracking-wider text-white/40">
                Monument tags (comma-separated)
              </span>
              <input
                type="text"
                value={form.monument_tags}
                onChange={(e) => setForm({ ...form, monument_tags: e.target.value })}
                placeholder="mukteswar, bhubaneswar"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-white/40">
              {form.source_type === "text"
                ? "Text is chunked and embedded immediately."
                : "URL crawl runs on the next ingestion tick (≤5 min)."}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-md border border-white/20 hover:bg-white/5 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>

          {error && <div className="text-sm text-rose-300">{error}</div>}
          {result && (
            <div className="text-sm text-emerald-300">
              Submitted — status: {result.status}
              {result.chunks !== undefined ? ` • ${result.chunks} chunks` : ""}
            </div>
          )}
        </form>

        <section className="rounded-xl border border-white/10 bg-[#0d0d0d]">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg">Recent submissions</h2>
            <button
              type="button"
              onClick={load}
              className="text-xs text-white/50 hover:text-white/80"
            >
              Refresh
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {loading && (
              <div className="px-6 py-8 text-sm text-white/40">Loading…</div>
            )}
            {!loading && submissions.length === 0 && (
              <div className="px-6 py-8 text-sm text-white/40">No submissions yet.</div>
            )}
            {submissions.map((s) => {
              const statusClass = STATUS_COLORS[s.status] || "text-white/50 border-white/20";
              return (
                <div key={s.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.title}</span>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusClass}`}
                      >
                        {s.status}
                      </span>
                      <span className="text-[10px] uppercase text-white/30">
                        {s.source_type}
                      </span>
                    </div>
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-white/40 hover:text-white/70 block truncate mt-1"
                      >
                        {s.source_url}
                      </a>
                    )}
                    <div className="text-xs text-white/40 mt-1 space-x-3">
                      <span>{s.chunk_count || 0} chunks</span>
                      <span>{s.created_at?.slice(0, 19).replace("T", " ")}</span>
                      {s.place_type && <span>type: {s.place_type}</span>}
                    </div>
                    {s.error_message && (
                      <div className="text-xs text-rose-300 mt-1">{s.error_message}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => onReprocess(s.id)}
                        className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/5"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(s.id)}
                      className="text-xs px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
