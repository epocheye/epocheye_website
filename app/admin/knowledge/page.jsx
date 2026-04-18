"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import Link from "next/link";

const EMPTY_EMBED = {
  text: "",
  source_name: "",
  source_url: "",
  document_title: "",
  monument_tags: "",
  auto_verify: false,
};

export default function AdminKnowledgePage() {
  const [chunks, setChunks] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Seed form state
  const [seedOpen, setSeedOpen] = useState(false);
  const [embedForm, setEmbedForm] = useState(EMPTY_EMBED);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);
  const [embedError, setEmbedError] = useState(null);

  // Filters
  const [verified, setVerified] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [monumentTag, setMonumentTag] = useState("");
  const [search, setSearch] = useState("");
  const [autoIngested, setAutoIngested] = useState("");
  const [disablingId, setDisablingId] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const res = await fetch("/api/admin/knowledge/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.success) startTransition(() => setStats(json.data));
      }
    }
    loadStats();
  }, []);

  useEffect(() => {
    async function loadChunks() {
      startTransition(() => setLoading(true));
      const params = new URLSearchParams({ page: String(page) });
      if (verified) params.set("verified", verified);
      if (sourceName) params.set("source_name", sourceName);
      if (monumentTag) params.set("monument_tag", monumentTag);
      if (search) params.set("search", search);
      if (autoIngested) params.set("auto_ingested", autoIngested);

      const res = await fetch(`/api/admin/knowledge?${params}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          startTransition(() => {
            setChunks(json.data);
            setTotal(json.total);
          });
        }
      }
      startTransition(() => setLoading(false));
    }
    loadChunks();
  }, [page, verified, sourceName, monumentTag, search, autoIngested]);

  async function handleDisableSource(sourceId) {
    if (!sourceId) return;
    if (!window.confirm("Disable this auto-ingested source? Chunks will be excluded from RAG queries until re-enabled.")) {
      return;
    }
    setDisablingId(sourceId);
    const res = await fetch(`/api/admin/knowledge/sources/${sourceId}/disable`, {
      method: "POST",
    });
    setDisablingId(null);
    if (res.ok) {
      startTransition(() => setPage((p) => p));
      // Force reload by toggling auto filter state
      setAutoIngested((v) => v);
    } else {
      const json = await res.json().catch(() => ({}));
      window.alert(`Disable failed: ${json.error || res.statusText}`);
    }
  }

  async function handleEmbed(e) {
    e.preventDefault();
    setEmbedLoading(true);
    setEmbedResult(null);
    setEmbedError(null);

    const tags = embedForm.monument_tags
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean);

    const res = await fetch("/api/admin/knowledge/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: embedForm.text,
        source_name: embedForm.source_name,
        source_url: embedForm.source_url,
        document_title: embedForm.document_title,
        monument_tags: tags,
        auto_verify: embedForm.auto_verify,
      }),
    });

    const json = await res.json();
    if (json.success) {
      setEmbedResult(json.data);
      setEmbedForm(EMPTY_EMBED);
      // Reload stats + chunks
      startTransition(() => setPage(1));
    } else {
      setEmbedError(json.error || "Unknown error");
    }
    setEmbedLoading(false);
  }

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-white">Heritage Knowledge</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-white/30">{total} chunks</p>
          <button
            onClick={() => { setSeedOpen((v) => !v); setEmbedResult(null); setEmbedError(null); }}
            className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-md transition-colors">
            {seedOpen ? "Close" : "+ Seed Document"}
          </button>
        </div>
      </div>

      {/* Seed document form */}
      {seedOpen && (
        <div className="bg-[#0d0d0d] border border-white/10 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-white/70 mb-4">Seed New Heritage Document</h2>
          <form onSubmit={handleEmbed} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/30 block mb-1.5">Source Name *</label>
                <input
                  value={embedForm.source_name}
                  onChange={(e) => setEmbedForm((f) => ({ ...f, source_name: e.target.value }))}
                  placeholder="e.g. ASI Konark Guide"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/30 block mb-1.5">Source URL * (unique ID)</label>
                <input
                  value={embedForm.source_url}
                  onChange={(e) => setEmbedForm((f) => ({ ...f, source_url: e.target.value }))}
                  placeholder="https://asi.nic.in/konark-sun-temple"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/30 block mb-1.5">Document Title</label>
                <input
                  value={embedForm.document_title}
                  onChange={(e) => setEmbedForm((f) => ({ ...f, document_title: e.target.value }))}
                  placeholder="Konark Sun Temple — Official Guide"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/30 block mb-1.5">Monument Tags (comma-separated)</label>
                <input
                  value={embedForm.monument_tags}
                  onChange={(e) => setEmbedForm((f) => ({ ...f, monument_tags: e.target.value }))}
                  placeholder="konark, sun_temple, odisha"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/30 block mb-1.5">Document Text *</label>
              <textarea
                value={embedForm.text}
                onChange={(e) => setEmbedForm((f) => ({ ...f, text: e.target.value }))}
                rows={8}
                required
                placeholder="Paste the full heritage document text here. It will be automatically split into ~200-word chunks and embedded via Gemini text-embedding-004."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={embedForm.auto_verify}
                  onChange={(e) => setEmbedForm((f) => ({ ...f, auto_verify: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border border-white/20 bg-white/5 accent-emerald-500"
                />
                <span className="text-xs text-white/50">Auto-verify all chunks (trusted source)</span>
              </label>

              <button
                type="submit"
                disabled={embedLoading}
                className="text-xs bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
                {embedLoading ? "Embedding…" : "Embed Document"}
              </button>
            </div>

            {embedResult && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 text-xs text-emerald-400">
                ✓ Embedded {embedResult.chunks_embedded} of {embedResult.chunks_created} chunks
                {embedResult.auto_verified && " (auto-verified)"}
                . Source ID: <span className="font-mono">{embedResult.source_id}</span>
              </div>
            )}
            {embedError && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3 text-xs text-red-400">
                Error: {embedError}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Chunks" value={stats.total_chunks} />
          <StatCard label="Verified" value={stats.verified_count} color="text-emerald-400" />
          <StatCard label="Unverified" value={stats.unverified_count} color="text-amber-400" />
          <StatCard label="Sources" value={stats.sources_count} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={verified}
          onChange={(e) => { setVerified(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-white/20">
          <option value="">All status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>

        <select
          value={autoIngested}
          onChange={(e) => { setAutoIngested(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-white/20">
          <option value="">All ingestions</option>
          <option value="true">Auto-ingested</option>
          <option value="false">Manual only</option>
        </select>

        {stats && (
          <select
            value={sourceName}
            onChange={(e) => { setSourceName(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-white/20">
            <option value="">All sources</option>
            {stats.by_source.map((s) => (
              <option key={s.source_name} value={s.source_name}>
                {s.source_name} ({s.chunk_count})
              </option>
            ))}
          </select>
        )}

        {stats && (
          <select
            value={monumentTag}
            onChange={(e) => { setMonumentTag(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-white/20 max-w-xs">
            <option value="">All monuments</option>
            {stats.all_tags.map((tag) => (
              <option key={tag} value={tag}>{tag.replaceAll("_", " ")}</option>
            ))}
          </select>
        )}

        <input
          type="text"
          placeholder="Search chunk text..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20 w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-sm text-white/30 text-center">Loading...</p>
        ) : chunks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/30 text-center">No chunks found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Source</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Monument</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Chunk Preview</th>
                  <th className="px-5 py-3 text-center text-xs text-white/35 font-medium">Status</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Origin</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Verified By</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {chunks.map((c) => (
                  <tr key={c.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-white/50 text-xs">{c.source_name}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.monument_tags || []).slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-white/5 text-white/50 px-2 py-0.5 rounded-full">
                            {tag.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/60 text-xs max-w-md truncate">
                      {c.chunk_text?.slice(0, 120)}...
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c.verified ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">Verified</span>
                      ) : (
                        <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">Pending</span>
                      )}
                      {c.is_active === false && (
                        <span className="ml-1 text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Disabled</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {c.auto_ingested ? (
                        <span className="text-xs bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full">
                          Auto ({c.ingest_method || "gemini"})
                        </span>
                      ) : (
                        <span className="text-xs text-white/40">Manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-white/30 text-xs">{c.verified_by || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.auto_ingested && c.is_active !== false && (
                          <button
                            onClick={() => handleDisableSource(c.source_id)}
                            disabled={disablingId === c.source_id}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-2.5 py-1 rounded-md transition-colors disabled:opacity-40">
                            {disablingId === c.source_id ? "Disabling…" : "Disable"}
                          </button>
                        )}
                        <Link
                          href={`/admin/knowledge/${c.id}`}
                          className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-md transition-colors">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Previous
          </button>
          <span className="text-xs text-white/30">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl px-5 py-4">
      <p className="text-xs text-white/30 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
