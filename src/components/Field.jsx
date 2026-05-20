export function Field({
  label,
  inputClassName = '',
  multiline = false,
  onChange,
  type = 'text',
  value,
  wrapperClassName = '',
  ...props
}) {
  const className =
    'type-field min-h-11 w-full rounded-md border border-black/[0.07] bg-studio-bone/55 px-4 py-3 text-[#111111] outline-none transition-all duration-700 ease-studio-out placeholder:text-[#777777]/35 focus:border-studio-accent/30 focus:bg-studio-bone';
  const Input = multiline ? 'textarea' : 'input';

  return (
    <label className={`block ${wrapperClassName}`}>
      <span className="type-control mb-2 block text-studio-muted/60">{label}</span>
      <Input
        className={`${className} ${multiline ? 'min-h-28 resize-y leading-relaxed' : ''} ${inputClassName}`}
        type={multiline ? undefined : type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}
