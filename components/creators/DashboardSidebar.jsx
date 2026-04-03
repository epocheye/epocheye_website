"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser, UserButton } from "@clerk/nextjs";
import { LayoutDashboard, FileText, Wallet, Settings, LogOut, Menu, X } from "lucide-react";
import CreatorBrandLink from "@/components/creators/CreatorBrandLink";

const NAV = [
	{ href: "/creators/dashboard", label: "Overview", icon: LayoutDashboard },
	{ href: "/creators/dashboard/content", label: "My Content", icon: FileText },
	{ href: "/creators/dashboard/payouts", label: "Payouts", icon: Wallet },
	{ href: "/creators/dashboard/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ pathname, onNavClick, creator, onLogout }) {
	return (
		<div className="flex flex-col h-full">
			{/* Logo */}
			<div className="px-6 py-6 border-b border-white/5">
				<CreatorBrandLink href="/creators" size="sm" showBadge />
			</div>

			{/* Nav */}
			<nav className="flex-1 px-3 py-5 space-y-0.5">
				{NAV.map(({ href, label, icon: Icon }) => {
					const isActive = pathname === href;
					return (
						<Link
							key={href}
							href={href}
							onClick={onNavClick}
							className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
								isActive
									? "bg-white/8 text-white"
									: "text-white/40 hover:text-white/70 hover:bg-white/4"
							}`}>
							<Icon
								className={`w-4 h-4 ${isActive ? "text-white" : "text-white/30"}`}
							/>
							{label}
						</Link>
					);
				})}
			</nav>

			{/* Creator profile + logout */}
			<div className="px-3 pb-5 border-t border-white/5 pt-4 space-y-1">
				<div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
					<div className="shrink-0">
						<UserButton afterSignOutUrl="/creators/login" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium text-white truncate">
							{creator?.name ?? "Creator"}
						</p>
						<p className="text-xs text-white/30 truncate">
							{creator?.email ?? ""}
						</p>
					</div>
				</div>
				<button
					onClick={onLogout}
					className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/4 transition-all duration-200 w-full text-left">
					<LogOut className="w-4 h-4 text-white/30" />
					Sign out
				</button>
			</div>
		</div>
	);
}

export default function DashboardSidebar() {
	const pathname = usePathname();
	const { signOut } = useClerk();
	const { user } = useUser();
	const creator = {
		name: user?.fullName || user?.firstName || "Creator",
		email: user?.primaryEmailAddress?.emailAddress || "",
	};
	const [mobileOpen, setMobileOpen] = useState(false);

	const handleLogout = async () => {
		await signOut({ redirectUrl: "/creators/login" });
	};

	const sharedProps = {
		pathname,
		onNavClick: () => setMobileOpen(false),
		creator,
		onLogout: handleLogout,
	};

	return (
		<>
			{/* Desktop sidebar */}
			<aside className="hidden md:flex w-56 shrink-0 border-r border-white/5 bg-[#080808] flex-col">
				<SidebarContent {...sharedProps} />
			</aside>

			{/* Mobile top bar */}
			<div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#080808]/95 backdrop-blur-md">
				<CreatorBrandLink href="/creators" size="sm" showBadge />
				<button
					onClick={() => setMobileOpen(!mobileOpen)}
					className="p-2 text-white/50 hover:text-white transition-colors"
					aria-label="Toggle menu">
					{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<div className="md:hidden fixed inset-0 z-40 flex">
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						onClick={() => setMobileOpen(false)}
					/>
					<aside className="relative w-64 bg-[#080808] border-r border-white/5 flex flex-col pt-16">
						<SidebarContent {...sharedProps} />
					</aside>
				</div>
			)}
		</>
	);
}
