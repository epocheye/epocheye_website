"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";

const PLATFORMS = ["all", "instagram", "youtube", "tiktok", "twitter", "blog", "other"];

export default function AdminContentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [actionId, setActionId] = useState(null);
  const [noteId, setNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");

  const fetchContent = useCallback(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  async function updateContent(id, status, notes) {
    setActionId(id);
    await fetch(`/api/admin/content/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: notes }),
    });
    setNoteId(null);
    setNoteText("");
    fetchContent();
    setActionId(null);
  }

  const filtered = items.filter((item) => {
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    const matchPlatform = platformFilter === "all" || item.platform === platformFilter;
    return matchStatus && matchPlatform;
  });

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-lg font-semibold text-white">Content submissions</h1>

        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <div className="flex gap-1">
            {["pending", "approved", "rejected", "all"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f
                    ? "bg-white/10 text-white"
                    : "text-white/35 hover:text-white/60"
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 focus:outline-none">
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-pulse h-4 w-32 bg-white/10 rounded" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/30 text-center">No content submissions found</p>
        ) : (
          <div className="divide-y divide-white/3">
            {filtered.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white/80 truncate">
                        {item.title || "Untitled"}
                      </p>
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-white/25 bg-white/5 px-2 py-0.5 rounded-full">
                        {item.platform}
                      </span>
                    </div>
                    <p className="text-xs text-white/35 mb-1">
                      By {item.creator_name ?? "—"} · {new Date(item.submitted_at).toLocaleDateString()}
                    </p>
                    <a
                      href={item.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-white/35 hover:text-white/60 transition-colors font-mono truncate max-w-xs">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {item.content_url}
                    </a>
                    {item.admin_notes && (
                      <p className="text-xs text-white/30 mt-1 italic">Note: {item.admin_notes}</p>
                    )}
                  </div>

                  {item.status === "pending" && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {noteId === item.id ? (
                        <div className="flex flex-col gap-1.5">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Admin notes (optional)"
                            rows={2}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-white/25 w-48"
                          />
                          <div className="flex gap-1.5">
                            <button
                              disabled={actionId === item.id}
                              onClick={() => updateContent(item.id, "approved", noteText)}
                              className="flex-1 px-2 py-1 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-md hover:bg-green-500/20 transition-colors disabled:opacity-40">
                              Approve
                            </button>
                            <button
                              disabled={actionId === item.id}
                              onClick={() => updateContent(item.id, "rejected", noteText)}
                              className="flex-1 px-2 py-1 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-40">
                              Reject
                            </button>
                          </div>
                          <button
                            onClick={() => { setNoteId(null); setNoteText(""); }}
                            className="text-xs text-white/25 hover:text-white/50 transition-colors text-center">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNoteId(item.id)}
                          className="px-3 py-1.5 text-xs border border-white/10 text-white/40 rounded-md hover:border-white/25 hover:text-white/60 transition-colors">
                          Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
