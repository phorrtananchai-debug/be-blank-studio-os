import { X, GripVertical, Wind } from 'lucide-react';

export function AtmosphereCard({
  element,
  onDelete,
  onDragStart
}) {
  return (
    <div
      className="absolute group bg-white/40 backdrop-blur-xl border border-white/50 shadow-studio rounded-2xl p-6 min-w-[240px] cursor-default overflow-hidden"
      style={{
        left: element.x,
        top: element.y,
        zIndex: element.zIndex
      }}
    >
      {/* Visual background glow */}
      <div className="absolute -right-8 -top-8 size-24 bg-studio-orange/10 blur-3xl rounded-full" />

      <div
        className="absolute top-3 left-3 p-1.5 bg-white/50 rounded-md opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        onMouseDown={(e) => onDragStart(e, element)}
      >
        <GripVertical size={12} className="text-studio-muted" />
      </div>

      <button
        onClick={() => onDelete(element.id)}
        className="absolute top-3 right-3 p-1.5 bg-white/50 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
      >
        <X size={12} />
      </button>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-studio-orange">
          <Wind size={12} strokeWidth={2.5} />
          Atmospheric Context
        </div>

        <div className="space-y-1">
          <p className="text-xl font-bold tracking-tight text-studio-ink">
            {element.title || 'Studio Ambience'}
          </p>
          <p className="text-xs font-medium text-studio-muted leading-relaxed">
            {element.description || 'Light, texture, and temporal qualities for this spatial cluster.'}
          </p>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(element.tags || ['natural-light', 'raw-texture', 'calm']).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-black/[0.03] rounded-full text-[9px] font-bold uppercase tracking-wider text-studio-muted/70">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
