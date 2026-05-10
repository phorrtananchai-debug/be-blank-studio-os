import { useState } from 'react';
import { X, GripVertical } from 'lucide-react';

export function StickyNoteElement({ element, onUpdate, onDelete, onDragStart }) {
  const [text, setText] = useState(element.content || '');

  const colors = {
    yellow: 'bg-amber-100 border-amber-200',
    green: 'bg-emerald-100 border-emerald-200',
    blue: 'bg-sky-100 border-sky-200',
    rose: 'bg-rose-100 border-rose-200'
  };

  const colorClass = colors[element.color || 'yellow'];

  return (
    <div
      className={`absolute group p-4 min-w-[160px] shadow-sm border ${colorClass} rotate-[-1deg]`}
      style={{ left: element.x, top: element.y, zIndex: element.zIndex }}
    >
       <div
        className="absolute -top-2 -left-2 p-1 bg-white border border-black/5 rounded-md opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        onMouseDown={(e) => onDragStart(e, element)}
      >
        <GripVertical size={12} className="text-studio-muted" />
      </div>

      <button
        onClick={() => onDelete(element.id)}
        className="absolute -top-2 -right-2 p-1 bg-white border border-black/5 rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
      >
        <X size={10} />
      </button>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onUpdate(element.id, { content: text })}
        placeholder="Quick thought..."
        className="w-full bg-transparent border-none outline-none resize-none text-xs font-bold uppercase tracking-widest text-black/60 placeholder:text-black/20"
        rows={3}
      />
    </div>
  );
}
