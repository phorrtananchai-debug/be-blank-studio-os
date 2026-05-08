export function SectionCard({ action, children, compact = false, eyebrow, title }) {
  return (
    <section
      className={`rounded-xl border border-black/[0.05] bg-white shadow-studioSoft transition-all hover:shadow-glow ${
        compact ? 'p-5' : 'p-6 sm:p-8 lg:p-10'
      }`}
    >
      {(title || eyebrow || action) && (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && (
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-studio-orange">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-serif text-3xl font-medium tracking-tight text-[#111111] sm:text-4xl">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
