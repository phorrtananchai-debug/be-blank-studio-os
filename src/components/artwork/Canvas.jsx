import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Plus,
  Minus,
  Maximize,
  MousePointer2,
  Hand,
  Type,
  Image as ImageIcon,
  Wind,
  Download
} from 'lucide-react';

export const Canvas = forwardRef(({
  children,
  onDoubleClick,
  onDrop,
  onExport,
  onToolSelect
}, ref) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [tool, setTool] = useState('select'); // 'select' or 'pan'

  const containerRef = useRef(null);
  const surfaceRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    getSurface: () => surfaceRef.current,
    getPosition: () => position,
    getScale: () => scale
  }));

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(s * delta, 0.1), 5));
    } else {
      setPosition(p => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY
      }));
    }
  };

  const handleMouseDown = (e) => {
    if (tool === 'pan' || e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (isPanning && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastMousePos.current.x;
      const dy = e.touches[0].clientY - lastMousePos.current.y;
      setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getTransformedCoords = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - position.x) / scale,
      y: (clientY - rect.top - position.y) / scale
    };
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getTransformedCoords(e.clientX, e.clientY);
    onDrop?.(e, coords.x, coords.y);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') setIsSpacePressed(true);
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-studio-bone touch-none ${isPanning ? 'cursor-grabbing' : tool === 'pan' || isSpacePressed ? 'cursor-grab' : 'cursor-auto'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDoubleClick={(e) => {
        if (e.target === containerRef.current) {
          const coords = getTransformedCoords(e.clientX, e.clientY);
          onDoubleClick?.(coords.x, coords.y);
        }
      }}
    >
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${position.x}px ${position.y}px`
        }}
      />

      {/* Infinite Surface */}
      <div
        ref={surfaceRef}
        className="absolute transition-transform duration-75 ease-out bg-studio-bone"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          minWidth: '2000px',
          minHeight: '2000px'
        }}
      >
        {children}
      </div>

      {/* Minimal Chrome - Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-black/5 bg-white/80 p-1.5 shadow-studio backdrop-blur-md">
        <ToolButton
          active={tool === 'select'}
          icon={MousePointer2}
          onClick={() => setTool('select')}
          label="Select"
        />
        <ToolButton
          active={tool === 'pan'}
          icon={Hand}
          onClick={() => setTool('pan')}
          label="Pan"
        />
        <div className="mx-2 h-4 w-px bg-black/10" />
        <ToolButton icon={Type} onClick={() => onToolSelect?.('note')} label="Text" />
        <ToolButton icon={ImageIcon} onClick={() => onToolSelect?.('image')} label="Image" />
        <ToolButton icon={Wind} onClick={() => onToolSelect?.('atmosphere')} label="Atmosphere" />
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2">
        <div className="flex items-center gap-1 rounded-full border border-black/5 bg-white/80 p-1 shadow-studio backdrop-blur-md">
          <button
            onClick={() => setScale(s => Math.max(s - 0.1, 0.1))}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[40px] text-center text-[10px] font-bold font-mono">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(s + 0.1, 5))}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={handleReset}
          className="p-3 bg-white/80 border border-black/5 rounded-full shadow-studio backdrop-blur-md hover:bg-white transition-colors self-end"
        >
          <Maximize size={14} />
        </button>
      </div>

      {/* Export Action */}
      <div className="absolute top-8 right-8">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-studio-ink text-white rounded-full shadow-studio hover:bg-black transition-all text-xs font-bold uppercase tracking-wider"
        >
          <Download size={14} />
          Export Space
        </button>
      </div>
    </div>
  );
});

Canvas.displayName = 'Canvas';

function ToolButton({ icon: Icon, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2.5 rounded-full transition-all ${active ? 'bg-studio-ink text-white shadow-md' : 'text-studio-muted hover:bg-black/5 hover:text-studio-ink'}`}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}
