export function ConnectorElement({ start, end }) {
  if (!start || !end) return null;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      className="absolute pointer-events-none origin-left"
      style={{
        left: start.x,
        top: start.y,
        width: length,
        height: '2px',
        transform: `rotate(${angle}deg)`,
      }}
    >
      <div className="w-full h-full bg-studio-ink/10 relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-r-2 border-t-2 border-studio-ink/10 rotate-45" />
      </div>
    </div>
  );
}
