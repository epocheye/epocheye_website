"use client";

import { useCallback, useEffect, useState } from "react";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminChatPage() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50" });
    if (userFilter) params.set("user", userFilter);
    const res = await fetch(`/api/admin/chat/sessions?${params.toString()}`);
    const json = await res.json();
    if (json.success) setSessions(json.data?.sessions || []);
  }, [userFilter]);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/chat/stats?days=7");
    const json = await res.json();
    if (json.success) setStats(json.data);
  }, []);

  useEffect(() => {
    Promise.all([loadSessions(), loadStats()]).finally(() => setLoading(false));
  }, [loadSessions, loadStats]);

  async function openDetail(id) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/chat/sessions/${encodeURIComponent(id)}`);
      const json = await res.json();
      if (json.success) setDetail(json.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteSession(id) {
    if (!confirm("Delete this chat session and all its messages?")) return;
    const res = await fetch(`/api/admin/chat/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setDetail(null);
      await loadSessions();
      await loadStats();
    } else {
      alert(json.error || "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-12 max-w-6xl">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/3 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-12 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Chat Moderation</h1>
        <p className="text-white/35 text-sm mt-1">Plan-tab sessions and messages. Stats are last 7 days.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Sessions" value={stats?.sessions ?? "—"} />
        <StatCard label="Messages" value={stats?.messages ?? "—"} />
        <StatCard label="Active users" value={stats?.active_users ?? "—"} />
        <StatCard label="Msgs/session" value={stats?.avg_msgs_session != null ? Number(stats.avg_msgs_session).toFixed(1) : "—"} />
      </div>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl mb-5">
        <div className="p-5 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="User UUID filter"
            className="flex-1 min-w-[240px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={loadSessions}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Sessions</p>
          </div>
          <div className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="p-5 text-white/30 text-sm">No sessions.</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openDetail(s.id)}
                  className="w-full text-left px-5 py-3 hover:bg-white/3 transition-colors"
                >
                  <p className="text-sm text-white/90 truncate">{s.title || "(untitled)"}</p>
                  <p className="text-[10px] text-white/40 mt-1">
                    {formatDate(s.updated_at)} · {s.message_count} msgs · {s.user_uuid?.slice(0, 8)}…
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Messages</p>
            {detail && (
              <button
                type="button"
                onClick={() => deleteSession(detail.session.id)}
                className="text-[10px] text-red-400/70 hover:text-red-400 uppercase tracking-widest"
              >
                Delete session
              </button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-5 space-y-3">
            {detailLoading && <p className="text-white/40 text-sm">Loading\u2026</p>}
            {!detailLoading && !detail && <p className="text-white/30 text-sm">Select a session to view messages.</p>}
            {detail?.messages?.map((m) => (
              <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-white/5 text-white/90" : "bg-amber-500/5 border border-amber-500/10 text-white/70"}`}>
                <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mb-1">
                  {m.role} · {formatDate(m.created_at)}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl px-4 py-3">
      <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  );
}
