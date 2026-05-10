const badgeStyles = {
  concept: 'border-sky-700/20 bg-sky-100/50 text-sky-800',
  design: 'border-violet-700/20 bg-violet-100/45 text-violet-800',
  construction: 'border-studio-orange/45 bg-studio-orange/10 text-studio-orange shadow-[0_0_16px_rgba(255,136,0,0.08)]',
  handover: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  open: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  idea: 'border-black/[0.08] bg-[#efeee9] text-studio-muted',
  draft: 'border-sky-700/20 bg-sky-100/50 text-sky-800',
  approved: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  posted: 'border-studio-orange/45 bg-studio-orange/10 text-studio-orange',
  low: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  medium: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  high: 'border-red-700/20 bg-red-100/50 text-red-800',
  safe: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  tight: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  critical: 'border-red-700/20 bg-red-100/50 text-red-800',
  review: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  issued: 'border-sky-700/20 bg-sky-100/50 text-sky-800',
  default: 'border-studio-orange/35 bg-studio-orange/10 text-studio-orange',
};

export function Badge({ children, tone }) {
  const key = tone || String(children).toLowerCase();
  const style = badgeStyles[key] || badgeStyles.default;

  return (
    <span className={`inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[11px] font-semibold uppercase leading-none tracking-tight ${style}`}>
      {children}
    </span>
  );
}
