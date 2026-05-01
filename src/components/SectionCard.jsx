export function SectionCard({ action, children, compact = false, eyebrow, title }) {
  if (compact) {
    return (
      <section className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-5 shadow-studioSoft">
        {children}
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-black/[0.08] bg-[#efeee9] p-5 shadow-studio sm:p-6">
      {(title || eyebrow || action) && (
        <div className="mb-6 flex flex-col gap-4 border-b border-black/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-studio-orange">{eyebrow}</p>}
            {title && <h2 className="mt-2 text-2xl font-semibold text-[#111111]">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
