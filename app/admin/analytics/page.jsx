import Link from "next/link";
import {
  Users,
  Activity,
  ScanLine,
  Share2,
  Footprints,
  CalendarDays,
  Layers,
} from "lucide-react";

import {
  getAnalyticsOverview,
  getActiveUsersSeries,
  getEventSeries,
  getNewUsersSeries,
  getTopEvents,
  getScanOutcomes,
  getTopSites,
  getPlatformSplit,
} from "@/lib/server/analyticsRepository";
import AnalyticsCharts from "./AnalyticsCharts";

// Live, range-dependent data — never cache.
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

function StatCard({ label, value, sub, icon: Icon }) {
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

export default async function AnalyticsPage({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;

  const [
    overview,
    activeUsers,
    scans,
    signups,
    topEvents,
    scanOutcomes,
    topSites,
    platforms,
  ] = await Promise.all([
    getAnalyticsOverview(),
    getActiveUsersSeries(days),
    getEventSeries("scan_started", days),
    getNewUsersSeries(days),
    getTopEvents(days, 12),
    getScanOutcomes(days),
    getTopSites(days, 10),
    getPlatformSplit(days),
  ]);

  const n = (v) => Number(v ?? 0).toLocaleString();

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-white">Analytics</h1>
        <div className="flex items-center gap-1 bg-[#0d0d0d] border border-white/5 rounded-lg p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?days=${r}`}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                r === days
                  ? "bg-white/8 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}>
              {r}d
            </Link>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total users" value={n(overview.totalUsers)} icon={Users} sub={`+${n(overview.newUsersToday)} today`} />
        <StatCard label="Daily active" value={n(overview.dau)} icon={Activity} sub={`${n(overview.stickiness)}% DAU/MAU`} />
        <StatCard label="Weekly active" value={n(overview.wau)} icon={Activity} />
        <StatCard label="Monthly active" value={n(overview.mau)} icon={Activity} />
        <StatCard label="Scans" value={n(overview.scansTotal)} icon={ScanLine} sub={`${n(overview.scansToday)} today`} />
        <StatCard label="Site visits" value={n(overview.visitsTotal)} icon={Footprints} />
        <StatCard label="Shares" value={n(overview.sharesTotal)} icon={Share2} />
        <StatCard label="Sessions (30d)" value={n(overview.sessions30)} icon={CalendarDays} />
        <StatCard label="Total events" value={n(overview.totalEvents)} icon={Layers} sub={`${n(overview.eventsToday)} today`} />
      </div>

      <AnalyticsCharts
        activeUsers={activeUsers}
        scans={scans}
        signups={signups}
        topEvents={topEvents}
        topSites={topSites}
        platforms={platforms}
        scanOutcomes={scanOutcomes}
      />
    </div>
  );
}
