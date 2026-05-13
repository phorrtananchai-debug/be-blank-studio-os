import { useEffect, useMemo, useState } from 'react';
import { initialPortfolioItems } from '../data/seed.js';
import { getPortfolioImageObjectPosition, getPortfolioLayout } from '../utils/layout.js';

function useTitleTransition() {
  const [transition, setTransition] = useState({ progress: 0, viewportHeight: 800 });

  useEffect(() => {
    const updateScrolledState = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const threshold = isMobile ? 120 : 240;
      const progress = Math.min(Math.max(window.scrollY / threshold, 0), 1);
      setTransition({ progress, viewportHeight: window.innerHeight || 800 });
    };

    updateScrolledState();
    window.addEventListener('scroll', updateScrolledState, { passive: true });
    window.addEventListener('resize', updateScrolledState);
    return () => {
      window.removeEventListener('scroll', updateScrolledState);
      window.removeEventListener('resize', updateScrolledState);
    };
  }, []);

  return transition;
}

function hasLayoutFields(item) {
  return ['x', 'y', 'width', 'height'].some((key) => item[key] !== undefined && item[key] !== '');
}

function getArchivePlacement(item, index) {
  const layout = hasLayoutFields(item)
    ? getPortfolioLayout(item, index)
    : {
        x: [0, 7, 2, 9][index % 4],
        y: 0,
        width: [5, 4, 3, 5][index % 4] * 8,
        height: [34, 42, 28, 38][index % 4],
        zIndex: 1,
      };
  const span = Math.min(7, Math.max(3, Math.round(layout.width / 6)));
  const offsetColumns = Math.min(8, Math.max(0, Math.round(layout.x / 10)));
  const columnStart = Math.min(13 - span, offsetColumns + 1);
  const marginTop = index === 0 ? 0 : Math.min(96, Math.max(0, layout.y * 0.55));

  return {
    gridColumn: `${columnStart} / span ${span}`,
    marginTop: `${marginTop}px`,
    zIndex: layout.zIndex,
    imageHeight: `${Math.min(620, Math.max(280, layout.height * 11))}px`,
  };
}

function formatArea(areaSqm) {
  if (!areaSqm) {
    return '';
  }

  return `[${areaSqm}m²]`;
}

function ArchiveItem({ index, item, navigate }) {
  const placement = getArchivePlacement(item, index);
  const summary = item.category || item.description || item.subtitle || 'Archive';

  return (
    <article className="public-work-item" style={{ gridColumn: placement.gridColumn, marginTop: placement.marginTop, zIndex: placement.zIndex }}>
      <button
        className="group block w-full text-left"
        type="button"
        onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
      >
        <span className="block overflow-hidden bg-[#f1f1ee]">
          <img
            alt={item.title}
            className="w-full object-cover transition duration-[1200ms] ease-studio-out group-hover:scale-[1.015] group-hover:opacity-95"
            src={item.imageUrl}
            style={{
              height: placement.imageHeight,
              objectPosition: getPortfolioImageObjectPosition(index),
            }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </span>
        <span className="mt-4 grid gap-1">
          <span className="flex items-baseline justify-between gap-4">
            <span className="type-card-title text-[#111111]">{item.title || 'Untitled Project'}</span>
            {item.areaSqm && <span className="type-control shrink-0 text-[#777777]">{formatArea(item.areaSqm)}</span>}
          </span>
          <span className="type-caption line-clamp-2 text-[#777777]">{summary}</span>
        </span>
      </button>
    </article>
  );
}

export function PortfolioPage({ portfolioItems, navigate }) {
  const titleTransition = useTitleTransition();
  const archiveItems = useMemo(() => (portfolioItems.length ? portfolioItems : initialPortfolioItems), [portfolioItems]);
  const { progress, viewportHeight } = titleTransition;
  const isMobile = viewportHeight < 720;
  const initialTop = isMobile ? viewportHeight * 0.2 : viewportHeight * 0.28;
  const finalTop = isMobile ? 68 : 76;
  const titleTop = initialTop + (finalTop - initialTop) * progress;
  const titleScale = (isMobile ? 0.94 : 1) - progress * (isMobile ? 0.42 : 0.58);
  const titleOpacity = 1 - progress * 0.34;
  const navOpacity = 0.42 + progress * 0.58;
  const mastheadBackground = 0.18 + progress * 0.72;

  return (
    <div className="min-h-screen bg-white text-[#111111] selection:bg-black/10">
      <header
        className="fixed left-0 right-0 top-0 z-[100] px-5 py-5 backdrop-blur-md md:px-8"
        style={{ backgroundColor: `rgba(255,255,255,${mastheadBackground})` }}
      >
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 type-control text-[#111111]" style={{ opacity: navOpacity }}>
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-2">
            <button className="text-[#111111]" type="button" onClick={() => navigate('/work')}>WORK</button>
            <button className="text-[#777777] transition hover:text-[#111111]" type="button" onClick={() => navigate('/')}>ABOUT</button>
            <button className="text-[#777777] transition hover:text-[#111111]" type="button" onClick={() => navigate('/journal')}>JOURNAL</button>
          </div>
          <button className="justify-self-end text-[#777777] transition hover:text-[#111111]" type="button" onClick={() => navigate('/os')}>
            OS
          </button>
        </nav>
      </header>

      <div
        className="pointer-events-none fixed left-0 right-0 z-[90] flex justify-center px-5 transition-[top,transform,opacity] duration-700 ease-studio-out md:px-8"
        style={{
          opacity: titleOpacity,
          top: `${titleTop}px`,
          transform: `scale(${titleScale})`,
          transformOrigin: 'top center',
        }}
      >
        <p className="max-w-[10ch] text-center text-[18vw] font-bold uppercase leading-[0.78] tracking-normal text-[#111111] md:text-[13vw]">
          Be Blank Studio
        </p>
      </div>

      <main className="mx-auto max-w-screen-2xl px-5 pb-32 pt-[72vh] md:px-8 md:pt-[76vh]">
        <section className="mb-24 grid gap-8 border-t border-black/[0.08] pt-8 md:grid-cols-12 md:items-start">
          <div className="md:col-span-3">
            <p className="type-label text-[#777777]">Portfolio</p>
            <h1 className="type-section-title mt-2 text-[#111111]">Project Archive</h1>
          </div>
          <p className="max-w-xl text-sm font-medium leading-6 text-[#777777] md:col-span-5">
            Selected architectural interiors, spatial identities, and material studies arranged as a quiet studio record.
          </p>
          <p className="type-label text-[#777777] md:col-span-4 md:text-right">
            {archiveItems.length} Projects
          </p>
        </section>

        <section className="public-work-grid">
          {archiveItems.map((item, index) => (
            <ArchiveItem key={item.id} index={index} item={item} navigate={navigate} />
          ))}
        </section>
      </main>

      <footer className="border-t border-black/[0.08] px-5 py-10 md:px-8">
        <div className="flex flex-col gap-4 type-control text-[#777777] md:flex-row md:items-center md:justify-between">
          <span>Be Blank Studio Archive</span>
          <span>Bangkok / Spatial work</span>
        </div>
      </footer>
    </div>
  );
}
