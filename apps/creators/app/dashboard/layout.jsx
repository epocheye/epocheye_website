import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/creators/DashboardSidebar";
import { CREATOR_ROUTES } from "@/lib/creatorRoutes";

export default async function DashboardLayout({ children }) {
	const { userId } = await auth();

	if (!userId) {
		redirect(CREATOR_ROUTES.login);
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
