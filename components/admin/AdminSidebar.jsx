"use client";

import { startTransition, useState, useEffect } from "react";
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
  BookMarked,
  Box,
  Activity,
  MessageSquare,
  Sparkles,
  Crown,
  Settings,
  Compass,
  AlertTriangle,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/creators", label: "Creators", icon: Users },
  { href: "/admin/users", label: "Users", icon: UserCircle },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/admin/blogs", label: "Blogs", icon: BookMarked },
  { href: "/admin/ar", label: "AR", icon: Box },
  { href: "/admin/scans", label: "Scan reports", icon: AlertTriangle },
  { href: "/admin/explorer-pass", label: "Explorer Pass", icon: Compass },
  { href: "/admin/premium", label: "Premium", icon: Crown },
  { href: "/admin/engagement", label: "Engagement", icon: Activity },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
  { href: "/admin/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const navList = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
  );

  const brand = (
    <div className="px-5 py-5 border-b border-white/5">
      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Admin</p>
      <p className="text-sm font-medium text-white mt-0.5">Epocheye</p>
    </div>
  );

  const logout = (
    <div className="px-3 pb-5">
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/4 transition-colors duration-150">
        <LogOut className="w-4 h-4 shrink-0" />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#080808] border-b border-white/5">
        <div>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Admin</p>
          <p className="text-sm font-medium text-white">Epocheye</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-white/5 bg-[#080808] min-h-screen flex-col">
        {brand}
        {navList}
        {logout}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 h-full bg-[#080808] border-r border-white/5 flex flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
              <div>
                <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Admin</p>
                <p className="text-sm font-medium text-white mt-0.5">Epocheye</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {navList}
            {logout}
          </aside>
        </div>
      )}
    </>
  );
}
