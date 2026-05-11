import { useState, useRef } from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';

export function ImageElement({ element, onUpdate, onDelete, onDragStart }) {
  const [isResizing, setIsResizing] = useState(false);
  const startSize = useRef({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startSize.current = {
      width: element.width || 300,
      height: element.height || 200
    };
    startPos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startPos.current.x;
      // Note: We should probably account for canvas scale here,
      // but simpler for now is just direct mouse delta
      const newWidth = Math.max(startSize.current.width + dx, 100);
      onUpdate(element.id, { width: newWidth });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`absolute group transition-shadow ${isResizing ? 'z-50' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width || 300
      }}
    >
      <div className="relative rounded-sm overflow-visible bg-white p-2 shadow-studio transition-all group-hover:shadow-premium">
        {/* Drag Handle */}
        <div
          onPointerDown={(e) => onDragStart(e, element)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1.5 bg-white rounded-full border border-black/5 shadow-studio transition-all hover:scale-110 z-10"
        >
          <GripHorizontal size={12} className="text-studio-muted" />
        </div>

        <img
          src={element.url}
          alt=""
          className="w-full h-auto rounded-[1px] pointer-events-none select-none"
        />

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute -bottom-2 -right-2 p-2 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-all z-20"
        >
          <div className="size-4 bg-white border-2 border-studio-ink rounded-full shadow-studio" />
        </div>

        {/* Delete Action */}
        <div className="absolute -right-12 top-0 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => onDelete(element.id)}
            className="p-2.5 bg-white border border-black/5 rounded-full shadow-studio hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
