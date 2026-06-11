import DashboardSidebar from "@/components/creators/DashboardSidebar";
import DashboardAuthGate from "@/components/creators/DashboardAuthGate";

export default function DashboardLayout({ children }) {
	// Auth is gated client-side (DashboardAuthGate) rather than via a server
	// auth()/redirect here: this app is a separate subdomain deployment whose
	// server can't reliably read the primary-domain Clerk session cookie, and a
	// server redirect created a /dashboard ↔ /login loop. See middleware.js.
	return (
		<div className="min-h-screen bg-[#080808] flex font-montserrat text-white">
			<DashboardSidebar />
			<main className="flex-1 min-w-0 md:overflow-y-auto md:h-screen pt-14 md:pt-0">
				<DashboardAuthGate>{children}</DashboardAuthGate>
			</main>
		</div>
	);
}
