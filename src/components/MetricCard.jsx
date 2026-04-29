export function MetricCard({ label, value }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.018] p-5 shadow-studioSoft">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">{label}</p>
      <p className="mt-4 text-2xl font-extrabold leading-tight text-white">{value}</p>
    </div>
  );
}
