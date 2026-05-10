import { useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useArtworkBoard } from '../../hooks/useArtworkBoard.js';
import { Canvas } from './Canvas.jsx';
import { NoteElement } from './NoteElement.jsx';
import { ImageElement } from './ImageElement.jsx';
import { AtmosphereCard } from './AtmosphereCard.jsx';
import { Loader2 } from 'lucide-react';

export function ArtworkSpace({ projectId, user }) {
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
      if (file.type.startsWith('image/')) {
        try {
          const url = await uploadImage(file);
          await addElement({
            type: 'image',
            url,
            x,
            y,
            width: 300
          });
        } catch (err) {
          console.error('Drop upload failed:', err);
        }
      }
    }
  }, [uploadImage, addElement]);

  const handleToolSelect = useCallback(async (type) => {
    await addElement({
      type,
      x: 150,
      y: 150,
      content: type === 'note' ? '' : undefined,
      title: type === 'atmosphere' ? 'New Atmosphere' : undefined
    });
  }, [addElement]);

  if (loading && elements.length === 0) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-studio-orange" size={24} />
      </div>
    );
  }

  return (
    <div className="h-[80vh] w-full rounded-[40px] overflow-hidden border border-black/5 shadow-studio" onPaste={handlePaste}>
      <Canvas
        ref={canvasRef}
        onDoubleClick={handleDoubleClick}
        onDrop={handleDrop}
        onExport={handleExport}
        onToolSelect={handleToolSelect}
      >
        {elements.map((el) => {
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
          return null;
        })}
      </Canvas>
    </div>
  );
}
