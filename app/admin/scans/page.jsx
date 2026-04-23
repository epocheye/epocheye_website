"use client";

import { useEffect, useState, startTransition } from "react";

export default function ScanReportsAdminPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    startTransition(() => setLoading(true));
    setError(null);
    try {
      const url =
        filter === "all"
          ? "/api/admin/scan-reports"
          : `/api/admin/scan-reports?status=${filter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        startTransition(() => setReports(json.data?.reports || []));
      } else {
        setError(json.error || "Load failed");
      }
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function approve(id) {
    if (!confirm("Approve this report and refund one scan?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/scan-reports/${id}/approve`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Approve failed");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deny(id) {
    if (!confirm("Deny this report? No refund will be issued.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/scan-reports/${id}/deny`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Deny failed");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-medium">Scan issue reports</h1>
          <p className="text-white/50 text-sm mt-1">
            User-flagged failed scans. Approving issues an automatic quota refund.
          </p>
        </div>

        <div className="flex items-center gap-2 border-b border-white/10">
          {[
            { id: "pending", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "denied", label: "Denied" },
            { id: "all", label: "All" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
                filter === t.id
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto text-xs text-white/50 hover:text-white/80 mb-2"
          >
            Refresh
          </button>
        </div>

        {error && <div className="text-sm text-rose-300">{error}</div>}

        <section className="rounded-xl border border-white/10 bg-[#0d0d0d] divide-y divide-white/5">
          {loading && <div className="px-6 py-8 text-sm text-white/40">Loading…</div>}
          {!loading && reports.length === 0 && (
            <div className="px-6 py-8 text-sm text-white/40">No reports here.</div>
          )}
          {reports.map((r) => (
            <div key={r.id} className="px-6 py-5 flex items-start gap-5">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt="Scan capture"
                  className="w-24 h-24 rounded-md object-cover bg-white/5 shrink-0"
                />
              ) : (
                <div className="w-24 h-24 rounded-md bg-white/5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/40 font-mono truncate">
                  {r.user_uuid}
                </div>
                <div className="font-medium mt-0.5">{r.reason}</div>
                {r.notes && (
                  <div className="text-sm text-white/60 mt-1 italic">&ldquo;{r.notes}&rdquo;</div>
                )}
                <div className="text-xs text-white/40 mt-2 space-x-3">
                  <StatusPill status={r.status} />
                  {r.refund_granted && <span className="text-emerald-300">Refunded</span>}
                  <span>{formatDate(r.created_at)}</span>
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => approve(r.id)}
                    className="text-xs px-3 py-1.5 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    Refund
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => deny(r.id)}
                    className="text-xs px-3 py-1.5 rounded border border-white/15 hover:bg-white/5 disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const color =
    status === "approved"
      ? "text-emerald-300 border-emerald-500/30"
      : status === "denied"
      ? "text-rose-300 border-rose-500/30"
      : "text-amber-300 border-amber-500/30";
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${color}`}>
      {status}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
