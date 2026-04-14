export default function StatsCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6 flex flex-col gap-3 hover:border-white/10 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/35 uppercase tracking-widest">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-white/15" />}
      </div>
      <p className="text-2xl font-semibold text-white">{value ?? "—"}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}
