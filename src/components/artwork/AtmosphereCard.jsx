import { X, GripVertical, Wind } from 'lucide-react';

export function AtmosphereCard({
  element,
  onDelete,
  onDragStart
}) {
  return (
    <div
      className="absolute group min-w-[240px] cursor-default overflow-hidden rounded-md border border-black/[0.07] bg-studio-bone/55 p-6 backdrop-blur-sm"
      style={{
        left: element.x,
        top: element.y,
        zIndex: element.zIndex
      }}
    >
      <div
        className="absolute left-3 top-3 cursor-grab rounded-sm border border-black/[0.06] bg-studio-bone/70 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        onMouseDown={(e) => onDragStart(e, element)}
      >
        <GripVertical size={12} className="text-studio-muted" />
      </div>

      <button
        onClick={() => onDelete(element.id)}
        className="absolute right-3 top-3 rounded-sm border border-black/[0.06] bg-studio-bone/70 p-1.5 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
      >
        <X size={12} />
      </button>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-studio-muted">
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

        <div className="flex flex-wrap gap-1.5 border-t border-black/[0.06] pt-3">
          {(element.tags || ['natural-light', 'raw-texture', 'calm']).map(tag => (
            <span key={tag} className="border-l border-black/[0.08] pl-2 text-[9px] font-bold uppercase tracking-wider text-studio-muted/70">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
