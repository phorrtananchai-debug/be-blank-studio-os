import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  Plus,
  Minus,
  Maximize,
  MousePointer2,
  Hand,
  Type,
  Image as ImageIcon,
  Wind,
  Download,
  StickyNote,
  Share2
} from 'lucide-react';

export const Canvas = forwardRef(({
  children,
  onDoubleClick,
  onDrop,
  onExport,
  onToolSelect,
  elements = []
}, ref) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [tool, setTool] = useState('select'); // 'select' or 'pan'

  const containerRef = useRef(null);
  const surfaceRef = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef(null);

  useImperativeHandle(ref, () => ({
    getSurface: () => surfaceRef.current,
    getPosition: () => position,
    getScale: () => scale,
    zoomTo: (newScale, center) => {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = center ? center.x : rect.width / 2;
      const centerY = center ? center.y : rect.height / 2;

      const mouseX = (centerX - position.x) / scale;
      const mouseY = (centerY - position.y) / scale;

      const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

      setPosition({
        x: centerX - mouseX * clampedScale,
        y: centerY - mouseY * clampedScale
      });
      setScale(clampedScale);
    },
    panTo: (newPos) => setPosition(newPos)
  }));

  const handleWheel = (e) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom logic
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - position.x) / scale;
      const mouseY = (e.clientY - rect.top - position.y) / scale;

      const zoomFactor = Math.pow(1.0015, -e.deltaY);
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5);

      setPosition({
        x: e.clientX - rect.left - mouseX * newScale,
        y: e.clientY - rect.top - mouseY * newScale
      });
      setScale(newScale);
    } else {
      // Pan logic - support both mouse wheel and touchpad
      setPosition(p => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY
      }));
    }
  };

  const handleMouseDown = (e) => {
    // Middle mouse button or Space+LeftClick or Pan tool
    if (tool === 'pan' || e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      containerRef.current.style.cursor = 'grabbing';
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
    if (containerRef.current) {
      containerRef.current.style.cursor = '';
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDist.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (isPanning && e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastMousePos.current.x;
      const dy = e.touches[0].clientY - lastMousePos.current.y;
      setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastTouchDist.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / lastTouchDist.current;

      const rect = containerRef.current.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      const mouseX = (midX - position.x) / scale;
      const mouseY = (midY - position.y) / scale;

      const newScale = Math.min(Math.max(scale * delta, 0.1), 5);

      setPosition({
        x: midX - mouseX * newScale,
        y: midY - mouseY * newScale
      });
      setScale(newScale);
      lastTouchDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    lastTouchDist.current = null;
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
          backgroundPosition: `${position.x % (24 * scale)}px ${position.y % (24 * scale)}px`
        }}
      />

      {/* Infinite Surface */}
      <div
        ref={surfaceRef}
        className="absolute transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: '0',
          height: '0'
        }}
      >
        {children}
      </div>

      {/* Minimal Chrome - Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-black/5 bg-white/90 p-1.5 shadow-premium backdrop-blur-xl">
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
        <div className="mx-2 h-4 w-px bg-black/[0.08]" />
        <ToolButton icon={Type} onClick={() => onToolSelect?.('note')} label="Text" />
        <ToolButton icon={StickyNote} onClick={() => onToolSelect?.('sticky')} label="Sticky" />
        <ToolButton icon={ImageIcon} onClick={() => onToolSelect?.('image')} label="Image" />
        <ToolButton icon={Share2} onClick={() => onToolSelect?.('connector')} label="Connector" />
        <ToolButton icon={Wind} onClick={() => onToolSelect?.('atmosphere')} label="Atmosphere" />
      </div>

      {/* Minimap - High Precision */}
      <div className="absolute top-8 left-8 p-4 rounded-3xl border border-black/5 bg-white/90 shadow-premium backdrop-blur-xl pointer-events-auto hidden md:block">
        <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-studio-muted mb-3 opacity-60">Navigator</div>
        <div
          className="relative w-40 h-24 bg-studio-stone/10 rounded-xl overflow-hidden border border-black/[0.02] cursor-crosshair"
          onClick={(e) => {
             const rect = e.currentTarget.getBoundingClientRect();
             const px = (e.clientX - rect.left) / rect.width;
             const py = (e.clientY - rect.top) / rect.height;

             const targetX = px * 10000 - 5000;
             const targetY = py * 10000 - 5000;

             const containerRect = containerRef.current.getBoundingClientRect();
             setPosition({
               x: containerRect.width / 2 - targetX * scale,
               y: containerRect.height / 2 - targetY * scale
             });
          }}
        >
          {elements.map(el => (
            <div
              key={el.id}
              className="absolute bg-studio-ink/10 rounded-[1px]"
              style={{
                left: `${((el.x + 5000) / 10000) * 100}%`,
                top: `${((el.y + 5000) / 10000) * 100}%`,
                width: '3px',
                height: '3px'
              }}
            />
          ))}
          {/* Viewport Indicator */}
          <div
            className="absolute border-2 border-studio-ink/40 bg-studio-ink/5 rounded-sm pointer-events-none"
            style={{
              left: `${((-position.x / scale + 5000) / 10000) * 100}%`,
              top: `${((-position.y / scale + 5000) / 10000) * 100}%`,
              width: `${(containerRef.current?.offsetWidth / scale / 10000) * 100}%`,
              height: `${(containerRef.current?.offsetHeight / scale / 10000) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3">
        <div className="flex items-center gap-1 rounded-full border border-black/5 bg-white/90 p-1.5 shadow-premium backdrop-blur-xl">
          <button
            onClick={() => {
              const rect = containerRef.current.getBoundingClientRect();
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const mouseX = (centerX - position.x) / scale;
              const mouseY = (centerY - position.y) / scale;
              const newScale = Math.max(scale / 1.25, 0.1);
              setPosition({ x: centerX - mouseX * newScale, y: centerY - mouseY * newScale });
              setScale(newScale);
            }}
            className="p-2.5 hover:bg-black/5 rounded-full transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[44px] text-center text-[9px] font-bold font-mono tracking-tighter">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => {
              const rect = containerRef.current.getBoundingClientRect();
              const centerX = rect.width / 2;
              const centerY = rect.height / 2;
              const mouseX = (centerX - position.x) / scale;
              const mouseY = (centerY - position.y) / scale;
              const newScale = Math.min(scale * 1.25, 5);
              setPosition({ x: centerX - mouseX * newScale, y: centerY - mouseY * newScale });
              setScale(newScale);
            }}
            className="p-2.5 hover:bg-black/5 rounded-full transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={handleReset}
          className="p-3.5 bg-white/90 border border-black/5 rounded-full shadow-premium backdrop-blur-xl hover:bg-white transition-colors self-end"
        >
          <Maximize size={14} />
        </button>
      </div>

      {/* Export Action */}
      <div className="absolute top-8 right-8">
        <button
          onClick={onExport}
          className="flex items-center gap-2.5 px-6 py-3 bg-studio-ink text-white rounded-full shadow-premium hover:bg-black transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
        >
          <Download size={14} />
          Export
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
      className={`p-3 rounded-full transition-all ${active ? 'bg-studio-ink text-white shadow-md' : 'text-studio-muted hover:bg-black/5 hover:text-studio-ink'}`}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}
