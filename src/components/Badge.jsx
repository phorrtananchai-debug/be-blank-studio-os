const badgeStyles = {
  concept: 'border-sky-700/20 bg-sky-100/50 text-sky-800',
  design: 'border-violet-700/20 bg-violet-100/45 text-violet-800',
  construction: 'border-studio-accent/45 bg-studio-accent/10 text-studio-accent shadow-[0_0_16px_rgba(33,37,41,0.08)]',
  handover: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  open: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  idea: 'border-black/[0.08] bg-[#efeee9] text-studio-muted',
  draft: 'border-sky-700/20 bg-sky-100/50 text-sky-800',
  approved: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  posted: 'border-studio-accent/45 bg-studio-accent/10 text-studio-accent',
  low: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  medium: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  high: 'border-red-700/20 bg-red-100/50 text-red-800',
  safe: 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
  tight: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  critical: 'border-red-700/20 bg-red-100/50 text-red-800',
  review: 'border-amber-700/20 bg-amber-100/50 text-amber-800',
  issued: 'border-sky-700/20 bg-sky-100/50 text-sky-800',
  default: 'border-studio-accent/35 bg-studio-accent/10 text-studio-accent',
};

export function Badge({ children, tone }) {
  const key = tone || String(children).toLowerCase();
  const style = badgeStyles[key] || badgeStyles.default;

  return (
    <span className={`type-control inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 leading-none ${style}`}>
      {children}
    </span>
  );
}
