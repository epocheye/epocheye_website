"use client";

import { useEffect, useState, startTransition } from "react";

// App-wide maintenance mode. Enabling this holds EVERY non-admin user of the
// mobile app on a blocking screen at launch; admin accounts still get in.
//
// Unlike the per-site toggle, this takes the whole product down at once, so
// enabling requires a confirmation step. Disabling is immediate — getting users
// back in should never be gated behind an extra click.
//
// Reach: installed Android apps pick this up at launch, when returning to the
// foreground, and on a 60s poll. Users already inside the app are held within
// about a minute.
export default function MaintenanceAdminPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Draft copy, edited locally and sent with the next save.
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [etaText, setEtaText] = useState("");

  function applyConfig(data) {
    startTransition(() => setConfig(data));
    setTitle(data?.title || "");
    setMessage(data?.message || "");
    setEtaText(data?.eta_text || "");
  }

  async function load() {
    startTransition(() => setLoading(true));
    setError(null);
    try {
      const res = await fetch("/api/admin/maintenance");
      const json = await res.json();
      if (json.success) {
        applyConfig(json.data);
      } else {
        setError(json.error || "Failed to load maintenance config");
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(nextEnabled) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
          title: title.trim(),
          message: message.trim(),
          eta_text: etaText.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        applyConfig(json.data);
        setNotice(
          nextEnabled
            ? "Maintenance mode is ON — non-admin users are now blocked."
            : "Maintenance mode is OFF — the app is open to everyone."
        );
      } else {
        setError(json.error || "Update failed");
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  function onToggle() {
    if (!config) return;
    if (config.enabled) {
      // Turning it OFF: no confirmation, restoring access is never risky.
      save(false);
    } else {
      setConfirming(true);
    }
  }

  const enabled = !!config?.enabled;
  const busy = saving || loading;

  return (
    <div className="min-h-screen bg-[#080808] text-white px-5 py-8 md:px-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-xl font-medium">Maintenance mode</h1>
          <p className="text-sm text-white/40 mt-1">
            Hold every non-admin user on a &ldquo;we&rsquo;ll be back shortly&rdquo;
            screen. Admin accounts keep full access. Nothing is deleted and no data
            changes — switching it back off restores the app instantly.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {/* The switch */}
        <div
          className={`rounded-xl border bg-[#0d0d0d] px-4 py-4 mb-5 transition-colors ${
            enabled ? "border-amber-500/40" : "border-white/5"
          }`}>
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {loading ? "Loading…" : enabled ? "App is DOWN for users" : "App is live"}
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                {enabled
                  ? "Non-admin users are being blocked at launch."
                  : "Everyone can use the app normally."}
              </p>
            </div>

            <span
              className={`text-xs shrink-0 ${
                enabled ? "text-amber-400/90" : "text-white/30"
              }`}>
              {enabled ? "ON" : "OFF"}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={
                enabled ? "Turn off maintenance mode" : "Turn on maintenance mode"
              }
              disabled={busy || !config}
              onClick={onToggle}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-150 disabled:opacity-40 ${
                enabled ? "bg-amber-500/80" : "bg-white/15"
              }`}>
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-150 ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {config?.updated_at && (
            <p className="text-xs text-white/25 mt-3 pt-3 border-t border-white/5">
              Last changed {new Date(config.updated_at).toLocaleString()}
              {config.updated_by_email ? ` by ${config.updated_by_email}` : ""}
            </p>
          )}
        </div>

        {/* Confirmation before taking the app down */}
        {confirming && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-4 mb-5">
            <p className="text-sm font-medium text-amber-200">
              Take the app down for all non-admin users?
            </p>
            <p className="text-xs text-white/50 mt-1">
              Everyone currently using the app will be blocked within about a minute.
              Admin accounts are unaffected.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => save(true)}
                className="px-4 py-2 rounded-lg text-sm bg-amber-500/90 text-black font-medium hover:bg-amber-400 disabled:opacity-40 transition-colors">
                {saving ? "Enabling…" : "Yes, enable maintenance"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-lg text-sm border border-white/15 text-white/70 hover:text-white hover:border-white/30 disabled:opacity-40 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Copy shown to blocked users */}
        <div className="rounded-xl border border-white/5 bg-[#0d0d0d] px-4 py-4">
          <p className="text-sm font-medium mb-1">Message shown to users</p>
          <p className="text-xs text-white/30 mb-4">
            Leave any field blank to use the app&rsquo;s built-in translated wording.
            Saved when you toggle maintenance, or with Save message below.
          </p>

          <label className="block text-xs text-white/40 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="We'll be back shortly"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-white/25 focus:outline-none focus:border-white/25 mb-3"
          />

          <label className="block text-xs text-white/40 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="EpochEye is down for scheduled maintenance…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-white/25 focus:outline-none focus:border-white/25 mb-3 resize-y"
          />

          <label className="block text-xs text-white/40 mb-1">
            Expected back (optional)
          </label>
          <input
            value={etaText}
            onChange={(e) => setEtaText(e.target.value)}
            placeholder="around 6:30 PM IST"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-white/25 focus:outline-none focus:border-white/25"
          />

          <button
            type="button"
            disabled={busy || !config}
            onClick={() => save(enabled)}
            className="mt-4 px-4 py-2 rounded-lg text-sm border border-white/15 text-white/70 hover:text-white hover:border-white/30 disabled:opacity-40 transition-colors">
            {saving ? "Saving…" : "Save message"}
          </button>
        </div>

        {/* What a blocked user sees */}
        <div className="mt-5">
          <p className="text-xs text-white/30 mb-2">Preview</p>
          <div className="rounded-xl border border-white/5 bg-black px-6 py-10 text-center">
            <p className="text-base text-white/90">
              {title.trim() || "We'll be back shortly"}
            </p>
            <p className="text-sm text-white/45 mt-2 max-w-sm mx-auto">
              {message.trim() ||
                "EpochEye is down for scheduled maintenance. Your journey is safe — please check back in a little while."}
            </p>
            {etaText.trim() && (
              <p className="text-xs text-white/30 mt-3">
                Expected back: {etaText.trim()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
