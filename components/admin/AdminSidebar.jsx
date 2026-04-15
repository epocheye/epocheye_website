"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Wallet,
  FileText,
  Bell,
  BookOpen,
  Box,
  Activity,
  MessageSquare,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/creators", label: "Creators", icon: Users },
  { href: "/admin/users", label: "Users", icon: UserCircle },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/admin/ar", label: "AR", icon: Box },
  { href: "/admin/engagement", label: "Engagement", icon: Activity },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
  { href: "/admin/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <aside className="w-56 shrink-0 border-r border-white/5 bg-[#080808] min-h-screen flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/5">
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Admin</p>
        <p className="text-sm font-medium text-white mt-0.5">Epocheye</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                isActive
                  ? "bg-white/8 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/4"
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/4 transition-colors duration-150">
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
