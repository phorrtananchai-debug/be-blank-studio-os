import { X, GripVertical, Maximize2 } from 'lucide-react';

export function ImageElement({
  element,
  onDelete,
  onDragStart
}) {
  return (
    <div
      className="absolute group border border-black/5 shadow-studioSoft rounded-sm overflow-hidden bg-studio-stone/20"
      style={{
        left: element.x,
        top: element.y,
        width: element.width || 300,
        zIndex: element.zIndex
      }}
    >
      <div
        className="absolute top-2 left-2 p-1.5 bg-white/90 border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10"
        onMouseDown={(e) => onDragStart(e, element)}
      >
        <GripVertical size={14} className="text-studio-muted" />
      </div>

      <button
        onClick={() => onDelete(element.id)}
        className="absolute top-2 right-2 p-1.5 bg-white/90 border border-black/5 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity z-10"
      >
        <X size={12} />
      </button>

      <img
        src={element.url}
        alt="Canvas element"
        className="w-full h-auto block select-none pointer-events-none"
      />

      <div className="absolute bottom-2 right-2 p-1.5 bg-white/90 border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-nwse-resize transition-opacity z-10">
        <Maximize2 size={12} className="text-studio-muted" />
      </div>
    </div>
  );
}
