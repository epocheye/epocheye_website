import "server-only";

import { formatPrice } from "@/lib/preorder/price";
import { SITE_BY_SLUG } from "@/lib/preorder/sites";
import { ADMIN_NOTIFY_EMAIL, sendEmail } from "@/lib/server/email";

/** Receipt to the visitor and a heads-up to us, once a pre-order is paid. */
export function sendPreorderPaidEmails(preorder) {
	const { reference, name, email, monument_slug: slug, suggestion, marketing_ok: marketingOk } = preorder;
	const site = SITE_BY_SLUG.get(slug);
	const siteName = site ? site.name : suggestion;
	const siteLabel = site ? `${site.name}, ${site.place}` : suggestion;
	const paid = formatPrice({ amount: preorder.amount_minor, currency: preorder.currency });

	return Promise.all([
		sendEmail({
			to: email,
			subject: `Your Epocheye pre-order: ${siteName}`,
			text: [
				`Hi ${name},`,
				"",
				`Your pre-order for ${siteLabel} is confirmed. You paid ${paid}. Your reference is ${reference}.`,
				"",
				"The sites with the most pre-orders are built first. When yours is ready we will",
				"email you so you can see it first. If we don't build it, you get a full refund.",
				"",
				"Epocheye",
				"support@epocheye.app",
			].join("\n"),
			replyTo: ADMIN_NOTIFY_EMAIL,
		}),
		sendEmail({
			to: ADMIN_NOTIFY_EMAIL,
			subject: `Paid pre-order ${reference}: ${site ? site.name : `Suggestion: ${suggestion}`} (${paid})`,
			text: [
				`Reference: ${reference}`,
				`Name: ${name}`,
				`Email: ${email}`,
				`Site: ${siteLabel}${site ? "" : " (suggested)"}`,
				`Paid: ${paid}`,
				`Marketing email OK: ${marketingOk ? "yes" : "no"}`,
			].join("\n"),
		}),
	]);
}
