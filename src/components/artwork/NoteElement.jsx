import { useState, useEffect, useRef } from 'react';
import { X, GripVertical } from 'lucide-react';

export function NoteElement({
  element,
  onUpdate,
  onDelete,
  onDragStart
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.content || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== element.content) {
      onUpdate(element.id, { content: text });
    }
  };

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
      className="absolute group bg-white border border-black/5 shadow-studioSoft rounded-lg p-4 min-w-[100px] cursor-default"
      style={{
        left: element.x,
        top: element.y,
        width: element.width || 300,
        zIndex: element.zIndex,
        transform: `rotate(${element.rotation || 0}deg)`
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <div
        className="absolute -top-2 -left-2 p-1 bg-white border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity touch-none"
        onPointerDown={(e) => onDragStart(e, element)}
      >
        <GripVertical size={12} className="text-studio-muted" />
      </div>

      <button
        onClick={() => onDelete(element.id)}
        className="absolute -top-2 -right-2 p-1 bg-white border border-black/5 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
      >
        <X size={10} />
      </button>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-studio-ink font-medium"
          rows={3}
        />
      ) : (
        <p className="text-sm font-medium leading-relaxed text-studio-ink whitespace-pre-wrap">
          {text || 'Double-click to edit note...'}
        </p>
      )}

      {element.updatedAt && (
        <div className="mt-2 text-[8px] font-bold uppercase tracking-widest text-studio-muted/40">
          Last updated {new Date(element.updatedAt?.seconds * 1000).toLocaleTimeString()}
        </div>
      )}

      <div
        onPointerDown={handleResize}
        className="absolute bottom-2 right-2 p-1 bg-white border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-nwse-resize transition-opacity touch-none"
      >
        <div className="size-2 border-r-2 border-b-2 border-studio-muted" />
      </div>

      <div
        onPointerDown={handleRotate}
        className="absolute top-2 left-1/2 -translate-x-1/2 p-1 bg-white border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-alias transition-opacity touch-none"
      >
        <div className="size-2 border-2 border-studio-muted rounded-full border-t-transparent" />
      </div>
    </div>
  );
}
