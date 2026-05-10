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
import { Loader2, Layers } from 'lucide-react';

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
    <div className={`relative ${isPresentation ? 'h-full' : 'h-[80vh]'} w-full rounded-[40px] overflow-hidden border border-black/5 shadow-studio`} onPaste={handlePaste}>
      {!isPresentation && (
        <>
          <div className="absolute top-8 right-32 z-[60] pointer-events-none">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-black/5 shadow-sm">
               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-studio-muted">Live Sync Active</span>
            </div>
          </div>

          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[60] w-64">
             <input
               type="text"
               value={filterQuery}
               onChange={(e) => setFilterQuery(e.target.value)}
               placeholder="Search board..."
               className="w-full bg-white/80 backdrop-blur-md border border-black/5 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-studio-ink/10"
             />
          </div>
        </>
      )}

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-12 text-center">
          <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-1000">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-studio-bone text-studio-muted">
              <Layers size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-studio-ink">Empty Design Surface</h3>
              <p className="text-sm font-medium leading-relaxed text-studio-muted">
                An infinite canvas for spatial thinking. Double-click to add notes, drag images here, or paste from your clipboard.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <div className="rounded-full bg-black/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-studio-muted">Double-click to start</div>
              <div className="rounded-full bg-black/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-studio-muted">Cmd+V to Paste</div>
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
