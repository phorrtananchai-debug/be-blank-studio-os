export function SectionCard({ action, children, compact = false, eyebrow, title }) {
  return (
    <section
      className={`os-dashboard-enter rounded-lg border border-black/[0.06] bg-studio-bone/42 backdrop-blur-sm transition-colors duration-700 ease-studio-out hover:bg-studio-bone/58 ${
        compact ? 'rhythm-card' : 'p-8 sm:p-12 lg:p-22'
      }`}
    >
      {(title || eyebrow || action) && (
        <div className="mb-12 flex flex-col rhythm-stack sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            {eyebrow && (
              <p className="type-label text-studio-accent/80">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="type-display font-light">
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
