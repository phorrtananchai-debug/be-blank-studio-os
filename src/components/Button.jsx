export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-studio-ink bg-studio-ink text-white shadow-premium hover:bg-studio-inkLight hover:shadow-deep focus-visible:ring-4 focus-visible:ring-studio-accent/10 active:scale-[0.98] active:shadow-studio',
    secondary: 'border-black/[0.03] bg-white/50 backdrop-blur text-studio-ink hover:bg-white hover:border-black/[0.1] hover:shadow-studio focus-visible:ring-4 focus-visible:ring-studio-accent/10 active:scale-[0.98]',
  };

  return (
    <button
      className={`type-control inline-flex h-11 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-full border px-7 outline-none transition-all duration-300 ease-studio-out ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
