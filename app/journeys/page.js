import JourneysPage from "@/components/journeys/JourneysPage";
import { CHECKOUT_ENABLED, variantFrom } from "@/lib/journeys/config";

// Audience switch: /journeys?for=family | ?for=history | (none). Read on the server so the
// first paint already carries the right copy and order.
export default async function Page({ searchParams }) {
	const params = await searchParams;
	const variant = variantFrom(params?.for);
	return <JourneysPage variant={variant} checkoutEnabled={CHECKOUT_ENABLED} />;
}
