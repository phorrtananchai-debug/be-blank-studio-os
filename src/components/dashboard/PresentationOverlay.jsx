import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export function PresentationOverlay({ title, subtitle, eyebrow = 'Presentation Mode', footerLabel = 'PROJECT WORKSPACE', onExit, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-[500] bg-studio-bone animate-in fade-in duration-700 ease-out">
      {/* Presentation Header */}
      <header className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between pointer-events-none animate-in fade-in duration-700">
        <div className="space-y-1 pointer-events-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">{eyebrow}</p>
          <h2 className="text-2xl font-bold tracking-tight text-studio-ink">{title}</h2>
          {subtitle && <p className="text-sm font-medium text-studio-muted">{subtitle}</p>}
        </div>
        <button
          onClick={onExit}
          className="p-3 rounded-full bg-white/80 border border-black/5 shadow-studio backdrop-blur-md text-studio-ink hover:bg-white transition-colors duration-300 pointer-events-auto"
        >
          <X size={20} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="h-full w-full overflow-hidden">
        {children}
      </main>

      {/* Presentation Controls */}
      <footer className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 rounded-full bg-white/80 border border-black/5 shadow-studio backdrop-blur-md animate-in fade-in duration-700">
        <button className="p-2 text-studio-muted hover:text-studio-ink transition-colors duration-300">
          <ChevronLeft size={20} />
        </button>
        <div className="h-4 w-px bg-black/10" />
        <span className="text-[10px] font-bold font-mono px-2">{footerLabel}</span>
        <div className="h-4 w-px bg-black/10" />
        <button className="p-2 text-studio-muted hover:text-studio-ink transition-colors duration-300">
          <ChevronRight size={20} />
        </button>
      </footer>
    </div>
  );
}
