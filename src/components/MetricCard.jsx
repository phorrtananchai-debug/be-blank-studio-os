export function MetricCard({ label, value }) {
  return (
    <div className="flex min-h-28 flex-col justify-between rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-5 shadow-studioSoft">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-studio-muted">{label}</p>
      <p className="mt-4 text-2xl font-semibold leading-tight text-[#111111]">{value}</p>
    </div>
  );
}
