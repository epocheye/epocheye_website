import { redirect } from "next/navigation";

import { verifyAdminJWT } from "@/lib/server/adminAuth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin — Epocheye" };

export default async function AdminLayout({ children }) {
  const auth = await verifyAdminJWT();
  if (!auth.ok) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#080808] flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
