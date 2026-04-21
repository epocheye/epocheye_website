import {
  Users,
  DollarSign,
  Clock,
  FileCheck,
} from "lucide-react";

import {
  getAdminOverviewStats,
  listRecentConversions,
} from "@/lib/server/creatorRepository";

export const revalidate = 60;

function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-white/35 uppercase tracking-widest">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-white/20" />}
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const [stats, conversions] = await Promise.all([
    getAdminOverviewStats(),
    listRecentConversions(10),
  ]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-lg font-semibold text-white mb-6">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active creators"
          value={stats.active_creators}
          icon={Users}
          sub={`${stats.total_creators} total`}
        />
        <StatCard
          label="Lifetime commissions"
          value={`₹${Number(stats.lifetime_earnings).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          label="Pending payouts"
          value={stats.pending_payouts}
          icon={Clock}
        />
        <StatCard
          label="Pending content"
          value={stats.pending_content}
          icon={FileCheck}
        />
      </div>

      {/* Recent conversions */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-medium text-white">Recent conversions</h2>
        </div>

        {conversions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/30 text-center">No conversions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Creator</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Code</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Amount</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Commission</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((c) => (
                  <tr key={c.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-white/70">{c.creator_name ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-white/50 text-xs">{c.code}</td>
                    <td className="px-5 py-3 text-right text-white/70">
                      {c.currency === "INR" ? "₹" : "$"}{Number(c.plan_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-green-400">
                      {c.currency === "INR" ? "₹" : "$"}{Number(c.commission_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-white/30 text-xs">
                      {new Date(c.converted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
