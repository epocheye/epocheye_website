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

export default function AdminEngagementPage() {
  const [form, setForm] = useState({
    enabled: true,
    interval_hours: 6,
    inactivity_threshold_hours: 48,
    per_user_cooldown_hours: 72,
    weekly_cap: 2,
    max_notified_per_tick: 500,
  });
  const [templatesText, setTemplatesText] = useState("[]");
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState(null);

  const loadAll = useCallback(async () => {
    const [cfgJson, logJson] = await Promise.all([
      fetch("/api/admin/engagement/config").then((r) => r.json()),
      fetch("/api/admin/engagement/log").then((r) => r.json()),
    ]);
    if (cfgJson.success && cfgJson.data) {
      const d = cfgJson.data;
      setForm({
        enabled: !!d.enabled,
        interval_hours: Number(d.interval_hours ?? 6),
        inactivity_threshold_hours: Number(d.inactivity_threshold_hours ?? 48),
        per_user_cooldown_hours: Number(d.per_user_cooldown_hours ?? 72),
        weekly_cap: Number(d.weekly_cap ?? 2),
        max_notified_per_tick: Number(d.max_notified_per_tick ?? 500),
      });
      setTemplatesText(JSON.stringify(d.templates ?? [], null, 2));
    }
    if (logJson.success) setLog(logJson.data?.entries ?? []);
  }, []);

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    let templates;
    try {
      templates = JSON.parse(templatesText);
      if (!Array.isArray(templates)) throw new Error("templates must be an array");
    } catch (err) {
      setMessage({ type: "error", text: `Templates JSON invalid: ${err.message}` });
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/engagement/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, templates }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: "error", text: json.error || "Save failed" });
      } else {
        setMessage({ type: "success", text: "Engagement config saved." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleForceTick() {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/engagement/trigger", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: "error", text: json.error || "Trigger failed" });
      } else {
        setMessage({ type: "success", text: "Tick completed. Reloading log\u2026" });
        await loadAll();
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setTriggering(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-12 max-w-4xl">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white/3 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-12 max-w-4xl">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-white">Engagement Cron</h1>
          <p className="text-white/35 text-sm mt-1">Reminder cadence and templates. Cron reads this every tick.</p>
        </div>
        <button
          type="button"
          onClick={handleForceTick}
          disabled={triggering}
          className="px-4 py-2 bg-white/5 border border-white/10 text-sm text-white/70 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors"
        >
          {triggering ? "Running\u2026" : "Force tick"}
        </button>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Runtime</p>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Cron enabled</p>
              <p className="text-xs text-white/25 mt-0.5">When off, the tick runs but skips all sends.</p>
            </div>
            <Toggle checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumberField label="Interval (hours)" value={form.interval_hours} onChange={(v) => setForm((f) => ({ ...f, interval_hours: v }))} />
            <NumberField label="Inactivity threshold (hours)" value={form.inactivity_threshold_hours} onChange={(v) => setForm((f) => ({ ...f, inactivity_threshold_hours: v }))} />
            <NumberField label="Per-user cooldown (hours)" value={form.per_user_cooldown_hours} onChange={(v) => setForm((f) => ({ ...f, per_user_cooldown_hours: v }))} />
            <NumberField label="Weekly cap (per user)" value={form.weekly_cap} onChange={(v) => setForm((f) => ({ ...f, weekly_cap: v }))} />
            <NumberField label="Max notified per tick" value={form.max_notified_per_tick} onChange={(v) => setForm((f) => ({ ...f, max_notified_per_tick: v }))} />
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl mt-5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Templates (JSON)</p>
            <p className="text-xs text-white/25 mt-1">
              Array of <code>{`{ "title": "...", "body": "..." }`}</code>. The title may contain one <code>%s</code> replaced with the user&apos;s first name.
            </p>
          </div>
          <div className="p-5">
            <textarea
              value={templatesText}
              onChange={(e) => setTemplatesText(e.target.value)}
              rows={10}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        {message && (
          <p
            className={`mt-4 text-sm px-4 py-2.5 rounded-lg border ${
              message.type === "success"
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {saving ? "Saving\u2026" : "Save engagement config"}
        </button>
      </form>

      <div className="mt-10 bg-[#0d0d0d] border border-white/5 rounded-xl">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Recent engagement sends</p>
          <p className="text-xs text-white/25 mt-1">Notifications with source=engagement_cron.</p>
        </div>
        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-medium">Sent</th>
                <th className="text-left px-3 py-3 font-medium">User</th>
                <th className="text-left px-3 py-3 font-medium">Title</th>
                <th className="text-left px-5 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {log.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-white/30">No engagement sends yet.</td>
                </tr>
              ) : (
                log.map((row) => (
                  <tr key={row.id} className="text-white/70 hover:bg-white/3">
                    <td className="px-5 py-3">{formatDate(row.created_at)}</td>
                    <td className="px-3 py-3 font-mono text-[10px] text-white/50">{row.user_uuid.slice(0, 8)}…</td>
                    <td className="px-3 py-3">{row.title}</td>
                    <td className="px-5 py-3 text-white/50">{row.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        checked ? "bg-white" : "bg-white/15"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${
          checked ? "bg-black translate-x-5" : "bg-white/50 translate-x-0"
        }`}
      />
    </button>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
      />
    </div>
  );
}
