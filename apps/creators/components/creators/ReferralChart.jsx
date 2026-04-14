"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-xs shadow-xl">
      <p className="text-white/50 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ReferralChart({ data = [] }) {
  const formatted = data.map((d) => ({ ...d, date: fmtDate(d.date) }));

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
      <p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-6">
        30-Day Performance
      </p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-white/20 text-sm">
          No data yet. Share your code to start tracking.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(255,255,255,0.15)" stopOpacity={1} />
                <stop offset="95%" stopColor="rgba(255,255,255,0)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(255,255,255,0.4)" stopOpacity={1} />
                <stop offset="95%" stopColor="rgba(255,255,255,0)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="clicks"
              name="Clicks"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
              fill="url(#clickGrad)"
            />
            <Area
              type="monotone"
              dataKey="conversions"
              name="Conversions"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={2}
              fill="url(#convGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
