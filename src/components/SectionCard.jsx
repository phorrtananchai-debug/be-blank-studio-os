export function SectionCard({ action, children, compact = false, eyebrow, title }) {
  return (
    <section
      className={`os-dashboard-enter rounded-[32px] border border-black/[0.02] bg-white/40 backdrop-blur-xl shadow-studioSoft transition-all duration-1000 ease-studio-out hover:bg-white/60 hover:shadow-premium hover:scale-[1.002] ${
        compact ? 'p-6' : 'p-8 sm:p-12 lg:p-22'
      }`}
    >
      {(title || eyebrow || action) && (
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-tight text-studio-accent/80">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-sans font-bold text-4xl sm:text-5xl font-light tracking-tight text-studio-ink leading-[0.9]">
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
