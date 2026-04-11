"use client";

import { useState } from "react";

const NOTIFICATION_TYPES = [
  { value: "system_alert", label: "System Alert" },
  { value: "achievement", label: "Achievement" },
  { value: "reminder", label: "Reminder" },
  { value: "badge_earned", label: "Badge Earned" },
  { value: "challenge_complete", label: "Challenge Complete" },
];

export default function AdminNotificationsPage() {
  const [type, setType] = useState("system_alert");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok: bool, text: string }

  async function handleBroadcast(e) {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, message }),
      });
      const json = await res.json();
      setResult({ ok: res.ok, text: json.message || json.error || "Unknown response" });
    } catch {
      setResult({ ok: false, text: "Network error — could not reach server" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-lg font-semibold text-white mb-1">Broadcast Notification</h1>
      <p className="text-xs text-white/35 mb-8">
        Sends a push + in-app notification to every registered user.
      </p>

      <form onSubmit={handleBroadcast} className="space-y-5">
        {/* Type */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 appearance-none">
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0d0d0d]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            Title
            <span className="ml-1 text-white/20">{title.length}/255</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            required
            placeholder="e.g. New feature available"
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">
            Message
            <span className="ml-1 text-white/20">{message.length}/1000</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            required
            rows={4}
            placeholder="Notification body text…"
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* Result */}
        {result && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              result.ok
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
            {result.text}
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
          {sending ? "Sending…" : "Broadcast to All Users"}
        </button>
      </form>
    </div>
  );
}
