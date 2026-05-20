const badgeStyles = {
  concept: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  design: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  construction: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  handover: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  open: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  idea: 'border-black/[0.08] bg-[#efeee9] text-studio-muted',
  draft: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  approved: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  posted: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  low: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  medium: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  high: 'border-red-700/20 bg-red-100/50 text-red-800',
  safe: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  tight: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  critical: 'border-red-700/20 bg-red-100/50 text-red-800',
  review: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  issued: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  default: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
};

export function Badge({ children, tone }) {
  const key = tone || String(children).toLowerCase();
  const style = badgeStyles[key] || badgeStyles.default;

  return (
    <span className={`type-control inline-flex min-h-7 shrink-0 items-center whitespace-nowrap rounded-sm border px-2.5 leading-none ${style}`}>
      {children}
    </span>
  );
}
