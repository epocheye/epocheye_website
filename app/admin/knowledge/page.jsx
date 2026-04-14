"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import Link from "next/link";

export default function AdminKnowledgePage() {
  const [chunks, setChunks] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [verified, setVerified] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [monumentTag, setMonumentTag] = useState("");
  const [search, setSearch] = useState("");

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
  }, [page, verified, sourceName, monumentTag, search]);

  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-white">Heritage Knowledge</h1>
        <p className="text-sm text-white/30">{total} chunks</p>
      </div>

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
                    </td>
                    <td className="px-5 py-3 text-white/30 text-xs">{c.verified_by || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/knowledge/${c.id}`}
                        className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-md transition-colors">
                        View
                      </Link>
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
