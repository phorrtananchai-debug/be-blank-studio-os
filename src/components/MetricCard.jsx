export function MetricCard({ label, value }) {
  return (
    <div className="flex min-h-[140px] flex-col justify-between rounded-xl border border-black/[0.03] bg-white/50 backdrop-blur-md p-6 transition-all duration-500 hover:bg-white hover:shadow-premium hover:-translate-y-1">
      <p className="text-[9px] font-bold uppercase tracking-tight text-studio-muted/60">{label}</p>
      <p className="font-sans font-bold text-4xl font-light leading-none text-studio-ink">{value}</p>
    </div>
  );
}
