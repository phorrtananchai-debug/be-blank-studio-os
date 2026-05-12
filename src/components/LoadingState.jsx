export function LoadingState({
  backgroundClass = 'bg-studio-canvas',
  eyebrow = 'Studio OS',
  messageClass = 'text-xs',
  message = 'Loading workspace',
  textClass = 'text-studio-ink',
}) {
  return (
    <main className={`grid min-h-screen place-items-center px-5 ${backgroundClass} ${textClass}`}>
      <div className="text-center">
        <p className="whitespace-nowrap text-sm font-medium tracking-tight">{eyebrow}</p>
        <div className="mx-auto my-4 h-px w-10 bg-black/[0.18]" />
        <p className={`${messageClass} tracking-tight text-studio-muted`}>{message}</p>
      </div>
    </main>
  );
}
