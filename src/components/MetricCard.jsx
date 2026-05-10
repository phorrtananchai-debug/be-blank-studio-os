export function MetricCard({ label, value }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-black/[0.08] bg-white p-4 shadow-studioSoft transition-all hover:border-black/20">
      <p className="text-[9px] font-bold uppercase tracking-widest text-studio-muted">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-studio-ink">{value}</p>
    </div>
  );
}
