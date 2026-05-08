export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'border-[#111111] bg-[#111111] text-[#f3f2ee] shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:bg-[#2a2a28] hover:-translate-y-0.5',
    secondary: 'border-black/[0.05] bg-white text-[#111111] hover:border-black/10 hover:bg-[#f9f9f7] hover:-translate-y-0.5',
  };

  return (
    <button
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 text-[13px] font-semibold tracking-wide transition-all duration-200 ${variants[variant]}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
