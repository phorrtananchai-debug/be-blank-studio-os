export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-studio-ink bg-studio-ink text-white hover:bg-studio-inkLight focus-visible:ring-2 focus-visible:ring-studio-accent/10 active:scale-[0.99]',
    secondary: 'border-black/[0.07] bg-studio-bone/45 text-studio-ink hover:border-black/[0.14] hover:bg-studio-bone/70 focus-visible:ring-2 focus-visible:ring-studio-accent/10 active:scale-[0.99]',
  };

  return (
    <button
      className={`type-control inline-flex h-10 shrink-0 items-center justify-center rhythm-control-gap whitespace-nowrap rounded-md border px-5 outline-none transition-all duration-300 ease-studio-out ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
