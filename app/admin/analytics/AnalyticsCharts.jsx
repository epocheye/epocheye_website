"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const AXIS = "rgba(255,255,255,0.30)";
const GRID = "rgba(255,255,255,0.06)";
const GOLD = "#B8923F";
const PIE_COLORS = [
  "#B8923F",
  "#6FA8DC",
  "#84C19B",
  "#C98A8A",
  "#9B8AC9",
  "#C9B98A",
  "#8AC9C2",
];

const tooltipStyle = {
  background: "#0d0d0d",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
};

function Panel({ title, children, className = "" }) {
  return (
    <div className={`bg-[#0d0d0d] border border-white/5 rounded-xl p-5 ${className}`}>
      <h2 className="text-sm font-medium text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-white/25">
      No data in this range yet
    </div>
  );
}

function TimeSeries({ data, color = GOLD }) {
  if (!data || data.length === 0) return <EmptyHint />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" stroke={AXIS} tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis stroke={AXIS} tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Bars({ data, color = GOLD }) {
  if (!data || data.length === 0) return <EmptyHint />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" stroke={AXIS} tick={{ fontSize: 10 }} tickLine={false} />
        <YAxis stroke={AXIS} tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ data }) {
  if (!data || data.length === 0) return <EmptyHint />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={entry.label ?? i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RankedList({ data }) {
  if (!data || data.length === 0) return <EmptyHint />;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="w-40 truncate text-xs text-white/60" title={d.label}>
            {d.label}
          </div>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((Number(d.value) / max) * 100, 2)}%`,
                background: GOLD,
              }}
            />
          </div>
          <div className="w-12 text-right text-xs text-white/50">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsCharts({
  activeUsers,
  scans,
  signups,
  topEvents,
  topSites,
  platforms,
  scanOutcomes,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Panel title="Active users / day" className="lg:col-span-2">
        <TimeSeries data={activeUsers} />
      </Panel>
      <Panel title="Scans / day">
        <Bars data={scans} color="#6FA8DC" />
      </Panel>
      <Panel title="New signups / day">
        <Bars data={signups} color="#84C19B" />
      </Panel>
      <Panel title="Scan outcomes">
        <Donut data={scanOutcomes} />
      </Panel>
      <Panel title="Platform split (active users)">
        <Donut data={platforms} />
      </Panel>
      <Panel title="Top events">
        <RankedList data={topEvents} />
      </Panel>
      <Panel title="Most-viewed sites">
        <RankedList data={topSites} />
      </Panel>
    </div>
  );
}
