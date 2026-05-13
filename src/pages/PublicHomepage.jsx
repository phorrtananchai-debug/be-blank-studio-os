import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { initialPortfolioItems } from '../data/seed.js';
import { getPortfolioImageObjectPosition, getPortfolioLayout } from '../utils/layout.js';

function useMastheadTransition() {
  const [transition, setTransition] = useState({ progress: 0, viewportHeight: 800 });

  useEffect(() => {
    const update = () => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const threshold = isMobile ? 120 : 240;
      const progress = Math.min(Math.max(window.scrollY / threshold, 0), 1);
      setTransition({ progress, viewportHeight: window.innerHeight || 800 });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return transition;
}

function getItems(portfolioItems) {
  return portfolioItems.length ? portfolioItems : initialPortfolioItems;
}

function hasLayoutFields(item) {
  return ['x', 'y', 'width', 'height'].some((key) => item[key] !== undefined && item[key] !== '');
}

function getHomeArchivePlacement(item, index) {
  const layout = hasLayoutFields(item)
    ? getPortfolioLayout(item, index)
    : {
        x: [6, 56, 20, 62][index % 4],
        y: [0, 9, 2, 14][index % 4],
        width: [28, 22, 18, 26][index % 4],
        height: [34, 28, 22, 36][index % 4],
        zIndex: 1,
      };
  const span = Math.min(7, Math.max(3, Math.round(layout.width / 6)));
  const columnStart = Math.min(13 - span, Math.max(1, Math.round(layout.x / 10) + 1));

  return {
    gridColumn: `${columnStart} / span ${span}`,
    imageHeight: `${Math.min(560, Math.max(250, layout.height * 10))}px`,
    marginTop: index === 0 ? '0px' : `${Math.min(80, Math.max(0, layout.y * 0.45))}px`,
    zIndex: layout.zIndex,
  };
}

function formatArea(areaSqm) {
  return areaSqm ? `[${areaSqm}sqm]` : '';
}

function PublicMasthead({ navigate, routePath, transition }) {
  const navItems = [
    { label: '[projects]', path: '/' },
    { label: 'work', path: '/work' },
    { label: 'journal', path: '/journal' },
    { label: 'about', path: '/about' },
  ];
  const { progress, viewportHeight } = transition;
  const isMobile = viewportHeight < 720;
  const initialTop = isMobile ? viewportHeight * 0.18 : viewportHeight * 0.24;
  const finalTop = isMobile ? 60 : 70;
  const titleTop = initialTop + (finalTop - initialTop) * progress;
  const titleScale = (isMobile ? 0.86 : 1) - progress * (isMobile ? 0.32 : 0.5);
  const titleOpacity = 1 - progress * 0.28;
  const navOpacity = 0.54 + progress * 0.46;
  const mastheadBackground = 0.08 + progress * 0.82;

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[120] px-5 py-4 backdrop-blur-md md:px-8"
      style={{ backgroundColor: `rgba(255,255,255,${mastheadBackground})` }}
    >
      <nav className="public-editorial-nav grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[#111111]" style={{ opacity: navOpacity }}>
        <a className="justify-self-start text-left transition hover:opacity-55" href="mailto:studio@beblanktobehindstudio.com">
          contact
        </a>
        <div className="flex justify-center gap-4 md:gap-7">
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`transition hover:opacity-55 ${
                routePath === item.path || ((routePath === '/' || routePath === '/portfolio') && item.path === '/')
                  ? 'text-[#111111]'
                  : 'text-[#777777]'
              }`}
              type="button"
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <a className="justify-self-end text-[#111111] transition hover:opacity-55" href="https://instagram.com" rel="noreferrer" target="_blank">
          instagram
        </a>
      </nav>
      <div
        className="pointer-events-none fixed left-0 right-0 z-[110] flex justify-center px-5 transition-[top,transform,opacity] duration-700 ease-studio-out md:px-8"
        style={{
          opacity: titleOpacity,
          top: `${titleTop}px`,
          transform: `scale(${titleScale})`,
          transformOrigin: 'top center',
        }}
      >
        <button className="pointer-events-auto block" type="button" onClick={() => navigate('/')}>
          <h1 className="max-w-[13ch] text-center text-[13vw] font-bold uppercase leading-[0.82] tracking-normal text-[#111111] md:max-w-[14ch] md:text-[8vw]">
            BE BLANK TO BEHIND STUDIO
          </h1>
        </button>
      </div>
    </header>
  );
}

function HomeArchiveItem({ index, item, navigate }) {
  const placement = getHomeArchivePlacement(item, index);
  const summary = item.category || item.subtitle || item.location || 'Archive';
  const metadata = [summary, item.areaSqm ? formatArea(item.areaSqm) : ''].filter(Boolean).join(' ');

  return (
    <article className="public-work-item" style={{ gridColumn: placement.gridColumn, marginTop: placement.marginTop, zIndex: placement.zIndex }}>
      <button className="group block w-full text-left" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}>
        <span className="block overflow-hidden bg-[#f1f1ee]">
          <img
            alt={item.title}
            className="w-full object-cover transition duration-[1200ms] ease-studio-out group-hover:scale-[1.012] group-hover:opacity-95"
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
        <span className="public-project-meta mt-2 grid gap-1 text-[#111111]">
          <span>{item.title || 'Untitled Project'}</span>
          {metadata && <span className="text-[#777777]">{metadata}</span>}
        </span>
      </button>
    </article>
  );
}

function HomeArchive({ items, navigate }) {
  return (
    <section className="public-work-grid">
      {items.map((item, index) => (
        <HomeArchiveItem key={item.id} index={index} item={item} navigate={navigate} />
      ))}
    </section>
  );
}

function AboutArchive() {
  return (
    <section className="mx-auto grid max-w-screen-xl gap-16 border-t border-black/[0.08] pt-8 md:grid-cols-12">
      <p className="public-project-meta text-[#777777] md:col-span-3">about</p>
      <div className="grid gap-8 md:col-span-6">
        <p className="text-xl font-semibold leading-8 text-[#111111] md:text-2xl">
          Be Blank is a Bangkok-based spatial studio working across interiors, hospitality, and quiet material systems.
        </p>
        <p className="max-w-xl text-sm font-medium leading-6 text-[#777777]">
          A restrained archive of built work, studies, and delivery notes.
        </p>
      </div>
      <div className="public-project-meta grid content-start gap-2 text-[#777777] md:col-span-3">
        <span>architecture</span>
        <span>interior</span>
        <span>objects</span>
        <span>bangkok / thailand</span>
      </div>
    </section>
  );
}

function JournalArchive({ items, navigate }) {
  const entries = items.map((item) => ({
    id: item.id,
    title: item.title,
    meta: [item.category, item.location, item.year].filter(Boolean).join(' / '),
  }));

  return (
    <section className="mx-auto max-w-screen-xl border-t border-black/[0.08] pt-8">
      <div className="mb-16 grid gap-8 md:grid-cols-12">
        <p className="public-project-meta text-[#777777] md:col-span-3">journal</p>
      </div>
      <div className="divide-y divide-black/[0.08]">
        {entries.map((entry, index) => (
          <button
            key={entry.id}
            className="grid w-full gap-4 py-6 text-left transition hover:opacity-60 md:grid-cols-12"
            type="button"
            onClick={() => navigate(`/portfolio/${encodeURIComponent(entry.id)}`)}
          >
            <span className="public-project-meta text-[#777777] md:col-span-2">{String(index + 1).padStart(2, '0')}</span>
            <span className="type-card-title text-[#111111] md:col-span-6">{entry.title}</span>
            <span className="public-project-meta text-[#777777] md:col-span-4 md:text-right">{entry.meta || 'archive note'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PublicHomepage({ portfolioItems, navigate }) {
  const location = useLocation();
  const mastheadTransition = useMastheadTransition();
  const archiveItems = useMemo(() => getItems(portfolioItems), [portfolioItems]);
  const routePath = location.pathname;

  return (
    <div className="min-h-screen bg-white text-[#111111] selection:bg-black/10">
      <PublicMasthead navigate={navigate} routePath={routePath} transition={mastheadTransition} />

      <main className="mx-auto max-w-screen-2xl px-5 pb-32 pt-[42vh] md:px-8 md:pt-[48vh]">
        {routePath === '/about' ? (
          <AboutArchive />
        ) : routePath === '/journal' ? (
          <JournalArchive items={archiveItems} navigate={navigate} />
        ) : (
          <HomeArchive items={archiveItems} navigate={navigate} />
        )}
      </main>

      <footer className="border-t border-black/[0.08] px-5 py-10 md:px-8">
        <div className="public-editorial-nav flex flex-col gap-4 text-[#777777] md:flex-row md:items-center md:justify-between">
          <span>be blank archive</span>
          <button className="text-left transition hover:text-[#111111]" type="button" onClick={() => navigate('/os')}>
            edit
          </button>
        </div>
      </footer>
    </div>
  );
}
