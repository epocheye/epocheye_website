"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminUserDetailPage({ params }) {
  const { uuid } = use(params);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(uuid)}`);
      const json = await res.json();
      if (json.success) setUser(json.data);
      else setMessage({ type: "error", text: json.error || "Load failed" });
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  async function resetQuota() {
    if (!confirm("Reset this user's AR quota for today?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(uuid)}/reset-ar-quota`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "AR quota reset." });
        await load();
      } else {
        setMessage({ type: "error", text: json.error || "Reset failed" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleOptOut() {
    const next = !user?.engagement?.opted_out;
    if (!confirm(next ? "Opt this user out of engagement pushes?" : "Re-enable engagement pushes?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(uuid)}/opt-out-engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opted_out: next }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: next ? "Opted out." : "Re-enabled." });
        await load();
      } else {
        setMessage({ type: "error", text: json.error || "Update failed" });
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 md:p-12 max-w-5xl">
        <div className="h-8 w-60 bg-white/5 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/3 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 md:p-12 max-w-5xl">
        <Link href="/admin/users" className="text-xs text-white/40 hover:text-white/70">← Back to users</Link>
        <p className="mt-6 text-white/50">User not found.</p>
      </div>
    );
  }

  const engagement = user.engagement || {};

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <Link href="/admin/users" className="text-xs text-white/40 hover:text-white/70">← Back to users</Link>

      <div className="mt-4 mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">{user.name || user.email}</h1>
          <p className="text-white/40 text-sm mt-1">{user.email}</p>
          <p className="text-white/25 text-[11px] mt-1 font-mono">{user.uuid}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.has_premium ? (
            <span className="px-3 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/20 rounded text-xs">
              Premium {user.premium_expires_at ? `until ${formatDate(user.premium_expires_at)}` : ""}
            </span>
          ) : (
            <span className="px-3 py-1 bg-white/5 text-white/50 border border-white/10 rounded text-xs">Free</span>
          )}
        </div>
      </div>

      {message && (
        <p
          className={`mb-5 text-sm px-4 py-2.5 rounded-lg border ${
            message.type === "success"
              ? "text-green-400 bg-green-400/10 border-green-400/20"
              : "text-red-400 bg-red-400/10 border-red-400/20"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Saved places" value={user.saved_places_count} />
        <StatCard label="Visits" value={user.visit_history_count} />
        <StatCard label="Usage events" value={user.usage_events_count} />
        <StatCard label="Chat sessions" value={user.chat_sessions_count} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">AR quota today</p>
            <button
              type="button"
              onClick={resetQuota}
              disabled={busy}
              className="px-3 py-1 bg-white/5 border border-white/10 text-xs text-white/70 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
            >
              Reset
            </button>
          </div>
          <p className="text-2xl font-semibold text-white">{user.ar_quota_today}</p>
          <p className="text-xs text-white/30 mt-1">Reconstructions consumed today (cache hits excluded).</p>
        </div>

        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Engagement</p>
            <button
              type="button"
              onClick={toggleOptOut}
              disabled={busy}
              className="px-3 py-1 bg-white/5 border border-white/10 text-xs text-white/70 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
            >
              {engagement.opted_out ? "Re-enable" : "Opt out"}
            </button>
          </div>
          <dl className="space-y-1.5 text-xs">
            <Row label="Last notified" value={formatDate(engagement.last_notified_at)} />
            <Row label="Sent (7d)" value={engagement.notification_count_7d ?? 0} />
            <Row label="Opted out" value={engagement.opted_out ? "yes" : "no"} />
          </dl>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl mb-8">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Recent usage events</p>
          <p className="text-xs text-white/25 mt-1">Last 20 events, newest first.</p>
        </div>
        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-medium">When</th>
                <th className="text-left px-3 py-3 font-medium">Event</th>
                <th className="text-left px-5 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(!user.recent_usage_events || user.recent_usage_events.length === 0) ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-white/30">No events.</td>
                </tr>
              ) : (
                user.recent_usage_events.map((e, i) => (
                  <tr key={i} className="text-white/70">
                    <td className="px-5 py-3 text-white/50">{formatDate(e.created_at)}</td>
                    <td className="px-3 py-3">{e.event_type}</td>
                    <td className="px-5 py-3 font-mono text-[10px] text-white/40">
                      {e.metadata ? JSON.stringify(e.metadata) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
        <p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-3">Preferences</p>
        <pre className="text-[11px] text-white/60 font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(user.preferences || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-4">
      <p className="text-[10px] font-medium text-white/35 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">{value ?? 0}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/35">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
