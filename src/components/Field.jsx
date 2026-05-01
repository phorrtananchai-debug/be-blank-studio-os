export function Field({
  label,
  multiline = false,
  onChange,
  type = 'text',
  value,
  wrapperClassName = '',
  ...props
}) {
  const className =
    'min-h-11 w-full rounded-lg border border-black/[0.08] bg-[#f3f2ee] px-3.5 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-[#777777]/60 focus:border-black/25 focus:bg-[#f7f6f2] focus:ring-2 focus:ring-black/[0.04]';
  const Input = multiline ? 'textarea' : 'input';

  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-studio-muted">{label}</span>
      <Input
        className={`${className} ${multiline ? 'min-h-28 resize-y leading-6' : ''}`}
        type={multiline ? undefined : type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}
