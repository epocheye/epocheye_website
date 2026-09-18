"use client";

import { useEffect, useState } from "react";

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
}

export default function CreatorSitesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState({ assignment_days: "", assignment_sales_target: "", max_creators: "" });

  async function load() {
    try {
      const res = await fetch("/api/admin/creator-sites");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setSettings({
          assignment_days: String(json.data.settings.assignment_days),
          assignment_sales_target: String(json.data.settings.assignment_sales_target),
          max_creators: String(json.data.settings.max_creators),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(payload, successText) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/creator-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: "error", text: json.error || "Action failed" });
      } else {
        const log = json.data?.log;
        setMessage({
          type: "success",
          text: log
            ? log.length
              ? log.map((l) => `${l.site}: ${l.action}${l.creator ? ` (${l.creator})` : ""}`).join(" · ")
              : "Nothing to change."
            : successText,
        });
        await load();
      }
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_days: Number(settings.assignment_days),
          assignment_sales_target: Number(settings.assignment_sales_target),
          max_creators: Number(settings.max_creators),
        }),
      });
      const json = await res.json();
      setMessage(
        json.success
          ? { type: "success", text: "Saved. New windows use these values." }
          : { type: "error", text: json.error || "Failed to save" }
      );
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setBusy(false);
    }
  }

  const inputCx =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30";

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-lg font-semibold text-white">Creator sites</h1>
        <button
          type="button"
          onClick={() => act({ action: "rotate" })}
          disabled={busy}
          className="px-4 py-2 text-xs text-white/70 border border-white/15 rounded-lg hover:text-white hover:border-white/40 disabled:opacity-40">
          Run rotation now
        </button>
      </div>
      <p className="text-xs text-white/35 mb-6">
        One creator per monument. At the end of a window, a creator who met the sales target keeps the
        site for another window; otherwise it goes to the next creator in line. Rotation also runs
        daily. Monuments come from Settings → Creator Page.
      </p>

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
      ) : (
        <>
          <div className="space-y-3">
            {(data?.sites ?? []).map((site) => {
              const a = site.assignment;
              return (
                <div key={site.slug || site.name} className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">{site.name}</p>
                      <p className="text-xs text-white/35">
                        {site.place} · {site.slug || "no slug set"}
                      </p>
                    </div>
                    {a ? (
                      <button
                        type="button"
                        onClick={() => act({ action: "end", assignment_id: a.id }, "Window ended. Code switched off.")}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-lg hover:text-red-400 hover:border-red-400/30 disabled:opacity-40">
                        End now
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => act({ action: "assign_next", site_slug: site.slug }, "Assigned to the next creator.")}
                        disabled={busy || !site.slug}
                        className="px-3 py-1.5 text-xs text-white/70 border border-white/15 rounded-lg hover:text-white hover:border-white/40 disabled:opacity-40">
                        Assign next in line
                      </button>
                    )}
                  </div>
                  {a ? (
                    <p className="mt-3 text-sm text-white/65">
                      <span className="text-white">{a.creator_name}</span> · {fmtDate(a.starts_at)} – {fmtDate(a.ends_at)} ·{" "}
                      {a.sales_so_far} / {a.sales_target} sales{a.status === "renewed" ? " · renewed" : ""}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-white/35">No creator on this site.</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-3">
              Waiting line ({data?.waiting?.length ?? 0})
            </p>
            {data?.waiting?.length ? (
              <ol className="space-y-1.5 text-sm text-white/65 list-decimal pl-5">
                {data.waiting.map((c) => (
                  <li key={c.id}>
                    {c.name} <span className="text-white/35">· {c.email}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-white/30">
                No approved creator is waiting. Creators join the line after approval and accepting the terms.
              </p>
            )}
          </div>

          <form onSubmit={saveSettings} className="mt-8 bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-4">Rules</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="space-y-1.5">
                <span className="block text-xs text-white/40">Window length (days)</span>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={settings.assignment_days}
                  onChange={(e) => setSettings((s) => ({ ...s, assignment_days: e.target.value }))}
                  className={inputCx}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs text-white/40">Sales target to renew</span>
                <input
                  type="number"
                  min="0"
                  value={settings.assignment_sales_target}
                  onChange={(e) => setSettings((s) => ({ ...s, assignment_sales_target: e.target.value }))}
                  className={inputCx}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs text-white/40">Max approved creators</span>
                <input
                  type="number"
                  min="1"
                  value={settings.max_creators}
                  onChange={(e) => setSettings((s) => ({ ...s, max_creators: e.target.value }))}
                  className={inputCx}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-5 px-5 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50">
              Save rules
            </button>
          </form>
        </>
      )}
    </div>
  );
}
