import "server-only";

// Transactional email through Resend (https://resend.com). RESEND_API_KEY must
// be set; EMAIL_FROM must be an address on a domain verified in Resend.
const RESEND_URL = "https://api.resend.com/emails";

export const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "support@epocheye.app";

export const EMAIL_FROM = process.env.EMAIL_FROM || "Epocheye <noreply@epocheye.com>";

/**
 * Sends one email. Never throws; returns true when Resend accepted it.
 * @param {{ to: string|string[], subject: string, text: string, html?: string, replyTo?: string }} msg
 */
export async function sendEmail(msg) {
  return (await deliverEmail(msg)).ok;
}

/** Like sendEmail, but says why it failed: { ok, status, error }. */
export async function deliverEmail({ to, subject, text, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set; email not sent:", subject);
    return { ok: false, status: null, error: "RESEND_API_KEY is not set" };
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const error = await res.text().catch(() => "");
      console.error(`[email] Resend ${res.status}: ${error}`);
      return { ok: false, status: res.status, error };
    }
    return { ok: true, status: res.status, error: null };
  } catch (err) {
    console.error("[email] send failed:", err?.message ?? err);
    return { ok: false, status: null, error: String(err?.message ?? err) };
  }
}
