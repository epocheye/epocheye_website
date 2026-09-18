import "server-only";

// Transactional email through Resend (https://resend.com). RESEND_API_KEY must
// be set; EMAIL_FROM must be an address on a domain verified in Resend.
const RESEND_URL = "https://api.resend.com/emails";

export const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "support@epocheye.app";

/**
 * Sends one email. Never throws; returns true when Resend accepted it.
 * @param {{ to: string|string[], subject: string, text: string, html?: string, replyTo?: string }} msg
 */
export async function sendEmail({ to, subject, text, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set; email not sent:", subject);
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Epocheye <noreply@epocheye.com>",
        to,
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err?.message ?? err);
    return false;
  }
}
