export function MetricCard({ label, value }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-black/[0.08] bg-white rhythm-card-compact shadow-studioSoft transition-all hover:border-black/20">
      <p className="type-label">{label}</p>
      <p className="type-section-title mt-2">{value}</p>
    </div>
  );
}
