// Shared by the API (which sets the price) and the page (which shows it).
// Amounts are in the currency's minor unit, as Razorpay expects: 499 = $4.99.

/** What a pre-order costs, and what the page shows everywhere. In India it is charged in rupees at today's rate. */
export const PREORDER_PRICE = { amount: 499, currency: "USD" };

/** "$5", "$4.99", "₹499": no decimals when the amount is whole. */
export function formatPrice(price) {
	if (!price) return "";
	const { amount, currency } = price;
	return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
		style: "currency",
		currency,
		minimumFractionDigits: amount % 100 ? 2 : 0,
		maximumFractionDigits: 2,
	}).format(amount / 100);
}
