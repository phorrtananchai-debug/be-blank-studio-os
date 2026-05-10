import { X, GripVertical, Maximize2 } from 'lucide-react';

export function ImageElement({
  element,
  onUpdate,
  onDelete,
  onDragStart
}) {
  const handleResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = element.width || 300;

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      onUpdate(element.id, { width: Math.max(100, startWidth + delta) });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleRotate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startRotation = element.rotation || 0;
    const startX = e.clientX;

    const onMouseMove = (moveEvent) => {
      const delta = (moveEvent.clientX - startX) / 2;
      onUpdate(element.id, { rotation: startRotation + delta });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className="absolute group border border-black/5 shadow-studioSoft rounded-sm overflow-hidden bg-studio-stone/20"
      style={{
        left: element.x,
        top: element.y,
        width: element.width || 300,
        zIndex: element.zIndex,
        transform: `rotate(${element.rotation || 0}deg)`
      }}
    >
      <div
        className="absolute top-2 left-2 p-1.5 bg-white/90 border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10 touch-none"
        onPointerDown={(e) => onDragStart(e, element)}
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

      <div
        onPointerDown={handleResize}
        className="absolute bottom-2 right-2 p-1.5 bg-white/90 border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-nwse-resize transition-opacity z-10 touch-none"
      >
        <Maximize2 size={12} className="text-studio-muted" />
      </div>

      <div
        onPointerDown={handleRotate}
        className="absolute top-2 left-1/2 -translate-x-1/2 p-1.5 bg-white/90 border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-alias transition-opacity z-10 touch-none"
        title="Rotate"
      >
        <div className="size-3 border-2 border-studio-muted rounded-full border-t-transparent animate-spin-slow" />
      </div>
    </div>
  );
}
