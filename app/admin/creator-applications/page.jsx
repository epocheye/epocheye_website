"use client";

import { useEffect, useState } from "react";

const LINK_KEYS = ["instagram_url", "youtube_url", "tiktok_url", "twitter_url"];

export default function CreatorApplicationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/creator-applications");
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id, action) {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/creator-applications/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: "error", text: json.error || "Action failed" });
      } else {
        setMessage({
          type: "success",
          text: action === "approve" ? "Approved. The creator was emailed." : "Rejected. The creator was emailed.",
        });
        await load();
      }
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setBusy(null);
    }
  }

  const applications = data?.applications ?? [];
  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter((a) => a.status === "rejected");
  const full = data && data.approved >= data.max_creators;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-lg font-semibold text-white">Creator applications</h1>
        {data && (
          <p className={`text-sm ${full ? "text-amber-400" : "text-white/40"}`}>
            {data.approved} / {data.max_creators} creators approved
          </p>
        )}
      </div>

      {message && (
        <p
          className={`mb-4 text-sm px-4 py-2.5 rounded-lg border ${
            message.type === "success"
              ? "text-green-400 bg-green-400/10 border-green-400/20"
              : "text-red-400 bg-red-400/10 border-red-400/20"
          }`}>
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
      ) : pending.length === 0 ? (
        <p className="bg-[#0d0d0d] border border-white/5 rounded-xl px-5 py-8 text-sm text-white/30 text-center">
          No applications waiting.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <ApplicationCard
              key={a.id}
              a={a}
              busy={busy === a.id}
              approveDisabled={full}
              onApprove={() => review(a.id, "approve")}
              onReject={() => review(a.id, "reject")}
            />
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-xs uppercase tracking-widest text-white/35">
            Rejected ({rejected.length})
          </summary>
          <div className="mt-3 space-y-3">
            {rejected.map((a) => (
              <ApplicationCard
                key={a.id}
                a={a}
                busy={busy === a.id}
                approveDisabled={full}
                onApprove={() => review(a.id, "approve")}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ApplicationCard({ a, busy, approveDisabled, onApprove, onReject }) {
  const app = a.application || {};
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-white font-medium">{app.name || a.name}</p>
          <p className="text-xs text-white/40">
            {a.email}
            {app.phone ? (
              <>
                {" · "}
                <a href={`tel:${app.phone}`} className="hover:text-white/70">
                  {app.phone}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <p className="text-xs text-white/30">
          {a.applied_at ? `Applied ${new Date(a.applied_at).toLocaleDateString()}` : "Signed up, no profile yet"}
        </p>
      </div>

      {a.application && (
        <div className="mt-4 space-y-2 text-sm text-white/65">
          <div className="flex flex-wrap gap-2">
            {LINK_KEYS.filter((k) => app[k]).map((k) => (
              <a
                key={k}
                href={app[k]}
                target="_blank"
                rel="noreferrer"
                className="text-xs border border-white/10 rounded-md px-2 py-1 text-white/60 hover:text-white hover:border-white/30">
                {k.replace("_url", "")}
              </a>
            ))}
          </div>
          <p className="text-xs text-white/40">
            {[app.audience_size && `Audience: ${app.audience_size}`, app.city, app.niche]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="whitespace-pre-line">{app.pitch}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy || approveDisabled || !a.application}
          className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-white/90 disabled:opacity-40">
          Approve
        </button>
        {onReject && (
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="px-4 py-2 text-xs text-white/60 border border-white/10 rounded-lg hover:text-red-400 hover:border-red-400/30 disabled:opacity-40">
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
