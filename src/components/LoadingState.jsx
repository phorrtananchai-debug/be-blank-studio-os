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
        <p className="type-card-title whitespace-nowrap">{eyebrow}</p>
        <div className="mx-auto my-4 h-px w-10 bg-black/[0.18]" />
        <p className={`${messageClass} type-caption text-studio-muted`}>{message}</p>
      </div>
    </main>
  );
}
