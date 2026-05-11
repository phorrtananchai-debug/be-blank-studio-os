import { useState, useRef, useEffect } from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';

export function NoteElement({ element, onUpdate, onDelete, onDragStart }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(element.content || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (content !== element.content) {
      onUpdate(element.id, { content });
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
  };

  return (
    <div
      className={`absolute group cursor-default select-none transition-shadow ${isEditing ? 'z-50' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        minWidth: '200px',
        maxWidth: '400px'
      }}
    >
      <div
        className={`relative p-6 rounded-sm transition-all duration-300 ${
          isEditing
            ? 'bg-white shadow-premium ring-1 ring-black/5'
            : 'hover:bg-black/[0.02] hover:shadow-studioSoft'
        }`}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={(e) => onDragStart(e, element)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1.5 bg-white rounded-full border border-black/5 shadow-studio transition-all hover:scale-110 z-10"
        >
          <GripHorizontal size={12} className="text-studio-muted" />
        </div>

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onBlur={handleBlur}
            className="w-full bg-transparent border-none outline-none resize-none font-sans text-sm font-medium leading-relaxed text-studio-ink placeholder:text-studio-muted/30 p-0 overflow-hidden"
            placeholder="Write a thought..."
            rows={Math.max(content.split('\n').length, 1)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleBlur();
              }
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="font-sans text-sm font-medium leading-relaxed text-studio-ink whitespace-pre-wrap min-h-[1.5em] empty:after:content-['Type_something...'] empty:after:text-studio-muted/20"
          >
            {content}
          </div>
        )}

        {/* Actions */}
        <div className="absolute -right-12 top-0 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
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
