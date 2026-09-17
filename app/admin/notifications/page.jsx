"use client";

import { useRef, useState } from "react";

const NOTIFICATION_TYPES = [
  { value: "announcement", label: "Announcement" },
  { value: "system_alert", label: "System Alert" },
  { value: "achievement", label: "Achievement" },
  { value: "reminder", label: "Reminder" },
  { value: "badge_earned", label: "Badge Earned" },
  { value: "challenge_complete", label: "Challenge Complete" },
];

// Where a tap on the notification opens in the app (src/services/notificationLinks.ts).
const DESTINATIONS = [
  { value: "", label: "Just open the app" },
  { value: "daily", label: "Daily tab" },
  { value: "passport", label: "Passport" },
  { value: "site", label: "A site…" },
  { value: "magicwindow", label: "A reconstruction…" },
];

const TEST_USER_KEY = "epocheye_admin_test_user_id";
const POLL_MS = 2000;
const POLL_LIMIT = 90; // ~3 minutes, then report the last known state

function buildLink(destination, slug) {
  if (!destination) return "";
  if (destination === "daily" || destination === "passport") {
    return `epocheye://${destination}`;
  }
  const s = slug.trim().toLowerCase();
  return s ? `epocheye://${destination}/${encodeURIComponent(s)}` : "";
}

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readTestUser() {
  try {
    return window.localStorage.getItem(TEST_USER_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function AdminNotificationsPage() {
  const [type, setType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [testUserId, setTestUserId] = useState(() =>
    typeof window === "undefined" ? "" : readTestUser()
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { ok: bool, text: string }
  // One key per composed message: a retried click (or a double click) reuses
  // it, so the backend answers with the existing job instead of sending twice.
  const idempotencyKey = useRef(null);
  const pollToken = useRef(0);

  const needsSlug = destination === "site" || destination === "magicwindow";
  const link = buildLink(destination, slug);
  const linkInvalid = needsSlug && !link;

  function resetKey() {
    idempotencyKey.current = null;
  }

  async function pollJob(jobId, token, attempt = 0) {
    if (token !== pollToken.current) return;
    try {
      const res = await fetch(`/api/admin/notifications/broadcast/${jobId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (token !== pollToken.current) return;
      if (!res.ok) {
        setResult({ ok: false, text: json.error || "Could not read the job status" });
        setSending(false);
        return;
      }
      const counts = `${json.recipients ?? 0} users · ${json.sent ?? 0} pushes delivered · ${json.failed ?? 0} failed`;
      if (json.status === "done") {
        setResult({ ok: true, text: `Sent. ${counts}.` });
        setSending(false);
        resetKey();
        return;
      }
      if (json.status === "failed") {
        setResult({
          ok: false,
          text: `Failed${json.error ? `: ${json.error}` : ""}. ${counts}. Sending again resumes where it stopped.`,
        });
        setSending(false);
        return;
      }
      if (attempt >= POLL_LIMIT) {
        setResult({
          ok: true,
          text: `Still ${json.status}. ${counts} so far. It keeps running in the background.`,
        });
        setSending(false);
        return;
      }
      setResult({ ok: true, text: `${json.status === "running" ? "Sending" : "Queued"}… ${counts}` });
      setTimeout(() => pollJob(jobId, token, attempt + 1), POLL_MS);
    } catch {
      if (token !== pollToken.current) return;
      setResult({ ok: false, text: "Lost contact while checking the job. It may still be sending." });
      setSending(false);
    }
  }

  async function send({ test }) {
    if (test) {
      try {
        window.localStorage.setItem(TEST_USER_KEY, testUserId.trim());
      } catch {
        // storage unavailable: the field still works for this send
      }
    }
    if (!test && !idempotencyKey.current) idempotencyKey.current = newKey();

    setSending(true);
    setResult(null);
    const token = ++pollToken.current;

    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          message,
          ...(link ? { link } : {}),
          ...(test
            ? { test_to_self: true, test_user_id: testUserId.trim() }
            : { idempotency_key: idempotencyKey.current }),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult({ ok: false, text: json.error || "The broadcast was refused" });
        setSending(false);
        return;
      }
      if (test) {
        setResult({
          ok: (json.sent ?? 0) > 0,
          text:
            (json.sent ?? 0) > 0
              ? `Test sent to ${json.tokens ?? 0} device(s).`
              : `No push delivered (${json.tokens ?? 0} device(s) on file${
                  json.fcm_enabled === false ? ", push is switched off on the server" : ""
                }). The in-app notification was still created.`,
        });
        setSending(false);
        return;
      }
      if (json.fcm_enabled === false) {
        setResult({
          ok: false,
          text: "Queued, but push is switched off on the server: users will only see it in the app.",
        });
      }
      if (json.job_id) {
        pollJob(json.job_id, token);
      } else {
        setResult({ ok: true, text: json.status || "Queued." });
        setSending(false);
      }
    } catch {
      setResult({ ok: false, text: "Network error — could not reach server" });
      setSending(false);
    }
  }

  const canSend = !sending && title.trim() && message.trim() && !linkInvalid;

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <h1 className="text-lg font-semibold text-white mb-1">Broadcast Notification</h1>
      <p className="text-xs text-white/35 mb-8">
        Sends a push + in-app notification to every registered user. Send a test to yourself first.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send({ test: false });
        }}
        className="space-y-5">
        {/* Type */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              resetKey();
            }}
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
            onChange={(e) => {
              setTitle(e.target.value);
              resetKey();
            }}
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
            onChange={(e) => {
              setMessage(e.target.value);
              resetKey();
            }}
            maxLength={1000}
            required
            rows={4}
            placeholder="Notification body text…"
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs text-white/40 mb-1.5">When tapped, open</label>
          <div className="flex gap-2">
            <select
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                resetKey();
              }}
              className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 appearance-none">
              {DESTINATIONS.map((d) => (
                <option key={d.value} value={d.value} className="bg-[#0d0d0d]">
                  {d.label}
                </option>
              ))}
            </select>
            {needsSlug && (
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  resetKey();
                }}
                placeholder="site slug, e.g. konark-sun-temple"
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            )}
          </div>
          {link && <p className="mt-1.5 text-[11px] text-white/30 font-mono">{link}</p>}
        </div>

        {/* Test send */}
        <div className="rounded-lg border border-white/8 p-3 space-y-2">
          <label className="block text-xs text-white/40">
            Test user ID <span className="text-white/20">(your app account&apos;s UUID)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20"
            />
            <button
              type="button"
              disabled={!canSend || !testUserId.trim()}
              onClick={() => send({ test: true })}
              className="px-3 rounded-lg text-xs font-medium border border-white/20 text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed">
              Send test
            </button>
          </div>
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
          disabled={!canSend}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
          {sending ? "Sending…" : "Broadcast to All Users"}
        </button>
      </form>
    </div>
  );
}
