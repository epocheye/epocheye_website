"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { isCreatorAuthenticated } from "@/lib/creatorAuthService";
import DashboardSidebar from "@/components/creators/DashboardSidebar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isCreatorAuthenticated()) {
      router.replace("/creators/login");
      return;
    }
    startTransition(() => setReady(true));
  }, [router]);

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
