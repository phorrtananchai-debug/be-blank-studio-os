import { useState, useRef, useEffect } from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';

const COLORS = {
  yellow: 'bg-[#fef3c7] border-[#f59e0b]/10 text-[#92400e]',
  blue: 'bg-[#dbeafe] border-[#3b82f6]/10 text-[#1e40af]',
  green: 'bg-[#dcfce7] border-[#22c55e]/10 text-[#166534]',
  pink: 'bg-[#fce7f3] border-[#ec4899]/10 text-[#9d174d]'
};

export function StickyNoteElement({ element, onUpdate, onDelete, onDragStart }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(element.content || '');
  const textareaRef = useRef(null);
  const colorClass = COLORS[element.color || 'yellow'];

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

  const handleColorChange = (color) => {
    onUpdate(element.id, { color });
  };

  return (
    <div
      className={`absolute group transition-transform ${isEditing ? 'z-50 scale-105' : 'hover:scale-[1.02]'}`}
      style={{
        left: element.x,
        top: element.y,
        width: '200px',
        height: '200px'
      }}
    >
      <div
        className={`relative w-full h-full p-6 shadow-studio transition-all duration-300 border ${colorClass} ${
          isEditing ? 'shadow-premium' : ''
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
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent border-none outline-none resize-none font-sans text-sm font-bold leading-relaxed p-0 overflow-hidden"
            placeholder="Quick note..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleBlur();
              }
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full h-full font-sans text-sm font-bold leading-relaxed whitespace-pre-wrap overflow-hidden"
          >
            {content}
          </div>
        )}

        {/* Floating Toolbar */}
        <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-black/5 shadow-studio flex gap-1">
             {Object.keys(COLORS).map((c) => (
               <button
                 key={c}
                 onClick={() => handleColorChange(c)}
                 className={`size-4 rounded-full border border-black/5 transition-transform hover:scale-125 ${COLORS[c].split(' ')[0]}`}
               />
             ))}
             <div className="mx-1 w-px h-3 bg-black/10" />
             <button
               onClick={() => onDelete(element.id)}
               className="text-studio-muted hover:text-red-500 transition-colors px-1"
             >
               <Trash2 size={12} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
