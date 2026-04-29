const badgeStyles = {
  concept: 'border-sky-300/35 bg-sky-400/10 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.06)]',
  design: 'border-violet-300/35 bg-violet-400/10 text-violet-100 shadow-[0_0_16px_rgba(167,139,250,0.06)]',
  construction: 'border-studio-orange/45 bg-studio-orange/10 text-studio-orange shadow-[0_0_16px_rgba(255,136,0,0.08)]',
  handover: 'border-amber-200/35 bg-amber-300/10 text-amber-100 shadow-[0_0_16px_rgba(252,211,77,0.06)]',
  open: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.06)]',
  idea: 'border-slate-300/25 bg-white/5 text-studio-muted',
  draft: 'border-sky-300/30 bg-sky-400/10 text-sky-100',
  approved: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  posted: 'border-studio-orange/45 bg-studio-orange/10 text-studio-orange',
  low: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  medium: 'border-amber-200/35 bg-amber-300/10 text-amber-100',
  high: 'border-red-300/40 bg-red-400/10 text-red-100',
  safe: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  tight: 'border-amber-200/35 bg-amber-300/10 text-amber-100',
  critical: 'border-red-300/40 bg-red-400/10 text-red-100',
  review: 'border-amber-200/35 bg-amber-300/10 text-amber-100',
  issued: 'border-sky-300/35 bg-sky-400/10 text-sky-100',
  default: 'border-studio-orange/35 bg-studio-orange/10 text-studio-orange',
};

export function Badge({ children, tone }) {
  const key = tone || String(children).toLowerCase();
  const style = badgeStyles[key] || badgeStyles.default;

  return (
    <span className={`inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[11px] font-bold uppercase leading-none tracking-[0.16em] ${style}`}>
      {children}
    </span>
  );
}
