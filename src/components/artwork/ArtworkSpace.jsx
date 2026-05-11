import { useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useArtworkBoard } from '../../hooks/useArtworkBoard.js';
import { Canvas } from './Canvas.jsx';
import { NoteElement } from './NoteElement.jsx';
import { ImageElement } from './ImageElement.jsx';
import { AtmosphereCard } from './AtmosphereCard.jsx';
import { StickyNoteElement } from './StickyNoteElement.jsx';
import { ConnectorElement } from './ConnectorElement.jsx';
import {
  Loader2,
  Layers,
  Plus,
  Download,
  Minus,
  Type,
  StickyNote,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';

function ToolButton({ icon: Icon, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-full transition-all ${active ? 'bg-studio-ink text-white shadow-md' : 'text-studio-muted hover:bg-black/5 hover:text-studio-ink'}`}
    >
      <Icon size={14} strokeWidth={2.5} />
    </button>
  );
}

export function ArtworkSpace({ projectId, user, isPresentation = false }) {
  const {
    elements,
    loading,
    addElement,
    updateElement,
    deleteElement,
    uploadImage
  } = useArtworkBoard(projectId, user);

  const [, setDraggingElement] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const handleExport = useCallback(async () => {
    const surface = canvasRef.current?.getSurface();
    if (!surface) return;

    try {
      const dataUrl = await toPng(surface, {
        backgroundColor: '#f3f2ee',
        quality: 0.95,
        pixelRatio: 2
      });

      // PNG Export
      const link = document.createElement('a');
      link.download = `studio-space-${projectId}.png`;
      link.href = dataUrl;
      link.click();

      // PDF Export
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [surface.offsetWidth, surface.offsetHeight]
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, surface.offsetWidth, surface.offsetHeight);
      pdf.save(`studio-space-${projectId}.pdf`);

    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [projectId]);

  const handleDoubleClick = useCallback(async (x, y) => {
    await addElement({
      type: 'note',
      content: '',
      x,
      y
    });
  }, [addElement]);

  const handleDragStart = (e, element) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingElement(element);

    // Calculate offset between mouse and element top-left, adjusted for current pan/zoom
    // We get the coords relative to the canvas origin
    const rect = canvasRef.current?.getSurface().parentElement.getBoundingClientRect();
    const canvasPos = canvasRef.current?.getPosition();
    const scale = canvasRef.current?.getScale();

    const startX = (e.clientX - rect.left - canvasPos.x) / scale;
    const startY = (e.clientY - rect.top - canvasPos.y) / scale;

    dragOffset.current = {
      x: startX - element.x,
      y: startY - element.y
    };

    const handleMouseUp = async (upEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);

      const currentX = (upEvent.clientX - rect.left - canvasPos.x) / scale;
      const currentY = (upEvent.clientY - rect.top - canvasPos.y) / scale;

      const newX = currentX - dragOffset.current.x;
      const newY = currentY - dragOffset.current.y;

      await updateElement(element.id, { x: newX, y: newY });
      setDraggingElement(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
  };

  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          try {
            const url = await uploadImage(file);
            await addElement({
              type: 'image',
              url,
              x: 100,
              y: 100,
              width: 300
            });
          } catch (err) {
            console.error('Paste upload failed:', err);
          }
        }
      }
    }
  }, [uploadImage, addElement]);

  const handleDrop = useCallback(async (e, x, y) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const url = await uploadImage(file);
        const isImage = file.type.startsWith('image/');
        await addElement({
          type: isImage ? 'image' : 'note',
          url: isImage ? url : undefined,
          content: !isImage ? `File: ${file.name}\n${url}` : undefined,
          x,
          y,
          width: 300
        });
      } catch (err) {
        console.error('Drop upload failed:', err);
      }
    }
  }, [uploadImage, addElement]);

  const [filterQuery, setFilterQuery] = useState('');

  const filteredElements = elements.filter(el => {
    if (!filterQuery) return true;
    const searchBase = (el.content || el.title || el.url || '').toLowerCase();
    return searchBase.includes(filterQuery.toLowerCase());
  });

  const handleToolSelect = useCallback(async (type) => {
    if (type === 'connector') {
      await addElement({
        type,
        start: { x: 100, y: 100 },
        end: { x: 300, y: 300 }
      });
      return;
    }

    await addElement({
      type,
      x: 150,
      y: 150,
      content: type === 'note' || type === 'sticky' ? '' : undefined,
      title: type === 'atmosphere' ? 'New Atmosphere' : undefined,
      color: type === 'sticky' ? 'yellow' : undefined
    });
  }, [addElement]);

  if (loading && elements.length === 0) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-studio-muted/20" size={24} />
      </div>
    );
  }

  const isEmpty = elements.length === 0;

  return (
    <div className={`relative flex flex-col ${isPresentation ? 'h-full' : 'h-[80vh]'} w-full rounded-[40px] overflow-hidden border border-black/5 shadow-studio bg-studio-bone`} onPaste={handlePaste}>
      {/* Enhanced Board Header/Toolbar */}
      {!isPresentation && (
        <header className="absolute top-6 left-6 right-6 z-[100] flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-black/5 shadow-studio pointer-events-auto">
             <div className="flex items-center gap-3 px-4">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-studio-ink">Project Design Surface</span>
             </div>
             <div className="h-4 w-px bg-black/[0.08]" />
             <div className="flex items-center gap-1">
                <ToolButton icon={Type} onClick={() => handleToolSelect('note')} label="Text" />
                <ToolButton icon={StickyNote} onClick={() => handleToolSelect('sticky')} label="Sticky" />
                <ToolButton icon={ImageIcon} onClick={() => handleToolSelect('image')} label="Image" />
                <ToolButton icon={Share2} onClick={() => handleToolSelect('connector')} label="Connector" />
             </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
             <input
               type="text"
               value={filterQuery}
               onChange={(e) => setFilterQuery(e.target.value)}
               placeholder="Search board..."
               className="w-64 bg-white/90 backdrop-blur-md border border-black/5 rounded-full px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-studio-ink/5 shadow-studio transition-all"
             />
          </div>

          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-1.5 rounded-full border border-black/5 shadow-studio pointer-events-auto">
             <button
               onClick={handleExport}
               className="flex items-center gap-2 px-4 py-2 hover:bg-black/5 rounded-full transition-colors"
             >
                <Download size={14} className="text-studio-muted" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Export</span>
             </button>
             <div className="h-4 w-px bg-black/[0.08]" />
             <div className="flex items-center gap-1 px-2">
                <button onClick={() => canvasRef.current?.zoomTo(canvasRef.current?.getScale() * 0.9)} className="p-2 hover:bg-black/5 rounded-full"><Minus size={14} /></button>
                <span className="text-[9px] font-bold font-mono min-w-[32px] text-center">
                  {Math.round((canvasRef.current?.getScale() || 1) * 100)}%
                </span>
                <button onClick={() => canvasRef.current?.zoomTo(canvasRef.current?.getScale() * 1.1)} className="p-2 hover:bg-black/5 rounded-full"><Plus size={14} /></button>
             </div>
          </div>
        </header>
      )}

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-12 text-center">
          <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-1000">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white border border-black/5 shadow-studio text-studio-muted">
              <Layers size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-studio-ink">Start Your Composition</h3>
              <p className="text-sm font-medium leading-relaxed text-studio-muted">
                This is your infinite architectural desk. Double-click to start or drag files directly onto the surface.
              </p>
            </div>
          </div>
        </div>
      )}

      <Canvas
        ref={canvasRef}
        onDoubleClick={handleDoubleClick}
        onDrop={handleDrop}
        onExport={handleExport}
        onToolSelect={handleToolSelect}
        elements={filteredElements}
      >
        {filteredElements.map((el) => {
          if (el.type === 'note') {
            return (
              <NoteElement
                key={el.id}
                element={el}
                onUpdate={updateElement}
                onDelete={deleteElement}
                onDragStart={handleDragStart}
              />
            );
          }
          if (el.type === 'sticky') {
            return (
              <StickyNoteElement
                key={el.id}
                element={el}
                onUpdate={updateElement}
                onDelete={deleteElement}
                onDragStart={handleDragStart}
              />
            );
          }
          if (el.type === 'image') {
            return (
              <ImageElement
                key={el.id}
                element={el}
                onUpdate={updateElement}
                onDelete={deleteElement}
                onDragStart={handleDragStart}
              />
            );
          }
          if (el.type === 'atmosphere') {
            return (
              <AtmosphereCard
                key={el.id}
                element={el}
                onUpdate={updateElement}
                onDelete={deleteElement}
                onDragStart={handleDragStart}
              />
            );
          }
          if (el.type === 'connector') {
            return (
              <ConnectorElement
                key={el.id}
                start={el.start}
                end={el.end}
              />
            );
          }
          return null;
        })}
      </Canvas>
    </div>
  );
}
