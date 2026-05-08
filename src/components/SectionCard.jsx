export function SectionCard({ action, children, compact = false, eyebrow, title }) {
  return (
    <section
      className={`rounded-[32px] border border-black/[0.02] bg-white/40 backdrop-blur-xl shadow-studioSoft transition-all duration-700 ease-out hover:bg-white/60 hover:shadow-premium ${
        compact ? 'p-6' : 'p-8 sm:p-12 lg:p-22'
      }`}
    >
      {(title || eyebrow || action) && (
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-orange/80">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tightest text-studio-ink leading-[0.9]">
                {title}
              </h2>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center">{action}</div>}
        </div>
      )}
      <div className="relative">
        {children}
      </div>
    </section>
  );
}
