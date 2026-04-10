export default function StatusBadge({ status }) {
  const map = {
    active:     "bg-green-500/10 text-green-400 border-green-500/20",
    suspended:  "bg-red-500/10 text-red-400 border-red-500/20",
    pending:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed:  "bg-green-500/10 text-green-400 border-green-500/20",
    failed:     "bg-red-500/10 text-red-400 border-red-500/20",
    approved:   "bg-green-500/10 text-green-400 border-green-500/20",
    rejected:   "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const cls = map[status] ?? "bg-white/5 text-white/40 border-white/10";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}
