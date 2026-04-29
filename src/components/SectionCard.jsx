export function SectionCard({ action, children, compact = false, eyebrow, title }) {
  if (compact) {
    return (
      <section className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-studioSoft">
        {children}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/[0.09] bg-gradient-to-br from-[#171717] via-[#121212] to-[#0f0f0f] p-5 shadow-studio sm:p-6">
      {(title || eyebrow || action) && (
        <div className="mb-6 flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-studio-orange">{eyebrow}</p>}
            {title && <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
