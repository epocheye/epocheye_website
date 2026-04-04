"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import DashboardSidebar from "@/components/creators/DashboardSidebar";
import { CREATOR_ROUTES } from "@/lib/creatorRoutes";

export default function DashboardLayout({ children }) {
	const router = useRouter();
	const { isLoaded, userId } = useAuth();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!isLoaded) return;

		if (!userId) {
			router.replace(CREATOR_ROUTES.login);
			return;
		}

		startTransition(() => setReady(true));
	}, [isLoaded, router, userId]);

	if (!ready) {
		return (
			<div className="min-h-screen bg-[#080808] flex items-center justify-center">
				<div className="w-1 h-1 rounded-full bg-white/30 animate-ping" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#080808] flex font-montserrat text-white">
			<DashboardSidebar />
			<main className="flex-1 min-w-0 md:overflow-y-auto md:h-screen pt-14 md:pt-0">
				{children}
			</main>
		</div>
	);
}
