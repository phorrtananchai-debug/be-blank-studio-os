export function MetricCard({ label, value }) {
  return (
    <div className="flex min-h-24 flex-col justify-between border-l border-black/[0.12] bg-transparent py-2 pl-4 transition-colors hover:border-black/25">
      <p className="type-label">{label}</p>
      <p className="type-section-title mt-2">{value}</p>
    </div>
  );
}
