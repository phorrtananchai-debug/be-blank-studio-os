export function MetricCard({ label, value }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-lg border border-black/[0.05] bg-white p-5 shadow-studioSoft transition-all hover:shadow-glow">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">{label}</p>
      <p className="font-serif mt-4 text-3xl font-medium leading-tight text-[#111111]">{value}</p>
    </div>
  );
}
