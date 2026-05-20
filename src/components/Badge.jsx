const badgeStyles = {
  concept: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  design: 'border-l-studio-orange border-y-black/[0.09] border-r-black/[0.09] bg-studio-bone/28 text-studio-ink',
  construction: 'border-l-studio-ochre border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-ink',
  handover: 'border-l-studio-orange border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-ink',
  open: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  idea: 'border-black/[0.08] bg-[#efeee9] text-studio-muted',
  draft: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  approved: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  posted: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  low: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  medium: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  high: 'border-l-studio-orange border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-rust',
  safe: 'border-l-studio-olive border-y-black/[0.09] border-r-black/[0.09] bg-studio-bone/28 text-studio-olive',
  tight: 'border-l-studio-ochre border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-ochre',
  critical: 'border-l-studio-orange border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-rust',
  risk: 'border-l-studio-orange border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-rust',
  watch: 'border-l-studio-ochre border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-ochre',
  waiting: 'border-l-studio-ochre border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-ochre',
  blocked: 'border-l-studio-orange border-y-black/[0.12] border-r-black/[0.12] bg-studio-bone/36 text-studio-rust',
  done: 'border-l-studio-olive border-y-black/[0.09] border-r-black/[0.09] bg-studio-bone/28 text-studio-olive',
  review: 'border-black/[0.12] bg-studio-bone/36 text-studio-ink',
  issued: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
  default: 'border-black/[0.09] bg-studio-bone/28 text-studio-muted',
};

export function Badge({ children, tone }) {
  const key = tone || String(children).toLowerCase();
  const style = badgeStyles[key] || badgeStyles.default;

  return (
    <span className={`type-control inline-flex min-h-7 shrink-0 items-center whitespace-nowrap rounded-sm border border-l-2 px-2.5 leading-none ${style}`}>
      {children}
    </span>
  );
}
