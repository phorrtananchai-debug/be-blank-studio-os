import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { initialPortfolioItems } from '../data/seed.js';
import { useStudioAuth } from '../hooks/useStudioAuth.js';
import {
  getNextInteractionLayout,
  getNormalizedPortfolioLayouts,
  getPortfolioLayout,
  hasExplicitPortfolioLayout,
  stringifyLayout,
} from '../utils/layout.js';
import { getCoverImage, getImageFocusStyle, resolvePortfolioImageUrl } from '../utils/portfolioImages.js';

const defaultEditorSettings = {
  titleOffsetY: 0,
  titleScale: 1,
  titleFontSize: 8,
  titleMaxWidth: 14,
  titleAlign: 'center',
  titleOpacity: 1,
  projectTitleSize: 0.8125,
  projectMaxWidth: 18,
  projectAlign: 'left',
  projectMetaOpacity: 0.86,
  mastheadFont: 'grotesk',
  projectTitleFont: 'grotesk',
};

const fontStacks = {
  grotesk: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  serif: "Baskerville, Georgia, 'Times New Roman', serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

const editorSettingsStorageKey = 'beBlankPublicEditorSettings';
const homepageTemplates = {
  LARGE_LEFT_HERO: 'large-left-hero',
  SPLIT_EDITORIAL: 'split-editorial',
  VERTICAL_CINEMATIC_STACK: 'vertical-cinematic-stack',
  OFFSET_ARCHIVE_GRID: 'offset-archive-grid',
  FEATURE_ARCHIVE_RHYTHM: 'feature-archive-rhythm',
};

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

function useEditorAvailability() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsAvailable(window.matchMedia('(min-width: 768px) and (pointer: fine)').matches);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return isAvailable;
}

function usePublicEditorSettings() {
  const [settings, setSettings] = useState(defaultEditorSettings);
  const [savedSettings, setSavedSettings] = useState(defaultEditorSettings);

  useEffect(() => {
    try {
      const storedSettings = window.localStorage.getItem(editorSettingsStorageKey);
      if (storedSettings) {
        const parsedSettings = { ...defaultEditorSettings, ...JSON.parse(storedSettings) };
        setSettings(parsedSettings);
        setSavedSettings(parsedSettings);
      }
    } catch {
      setSettings(defaultEditorSettings);
      setSavedSettings(defaultEditorSettings);
    }
  }, []);

  const updateSettings = (updates) => {
    setSettings((current) => ({ ...current, ...updates }));
  };

  const saveSettings = (nextSettings = settings) => {
    window.localStorage.setItem(editorSettingsStorageKey, JSON.stringify(nextSettings));
    setSavedSettings(nextSettings);
  };

  const resetSettings = () => {
    setSettings(savedSettings);
  };

  return { resetSettings, savedSettings, saveSettings, settings, updateSettings };
}

function getItems(portfolioItems) {
  return portfolioItems.length ? portfolioItems : initialPortfolioItems;
}

function getArchiveLayout(item, index) {
  return getPortfolioLayout(hasExplicitPortfolioLayout(item) ? item : {}, index);
}

function useViewportWidth() {
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth || 1440);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewportWidth;
}

function overlaps(layoutA, layoutB) {
  const ax2 = layoutA.x + layoutA.width;
  const ay2 = layoutA.y + layoutA.height;
  const bx2 = layoutB.x + layoutB.width;
  const by2 = layoutB.y + layoutB.height;
  return layoutA.x < bx2 && ax2 > layoutB.x && layoutA.y < by2 && ay2 > layoutB.y;
}

function buildComposedLayouts(items, draftLayouts = {}) {
  const composed = {};
  const placed = [];

  items.forEach((item, index) => {
    const source = draftLayouts[item.id] || getArchiveLayout(item, index);
    const layout = {
      ...source,
      width: Math.min(Math.max(source.width, 14), 46),
      height: Math.min(Math.max(source.height, 14), 56),
    };

    layout.x = Math.min(Math.max(layout.x, -6), 86);
    layout.y = Math.max(layout.y, index < 2 ? -10 : 10);

    let loopGuard = 0;
    while (loopGuard < 32) {
      const collisions = placed.filter((candidate) => overlaps(layout, candidate));
      if (collisions.length <= 1) break;
      layout.y += 16;
      loopGuard += 1;
    }

    composed[item.id] = layout;
    placed.push(layout);
  });

  return composed;
}

function getArchiveCanvasHeight(items, composedLayouts = {}) {
  const maxBottom = items.reduce((bottom, item, index) => {
    const layout = composedLayouts[item.id] || getArchiveLayout(item, index);
    return Math.max(bottom, layout.y + layout.height + 18);
  }, 120);

  return `max(122vh, ${Math.max(122, maxBottom)}vw)`;
}

function getArchiveImageHeight(layout) {
  return `clamp(130px, ${Math.max(10, layout.height) * 0.72}vw, ${Math.max(10, layout.height) * 16}px)`;
}

function formatArea(areaSqm) {
  return areaSqm ? `[${areaSqm}m\u00b2]` : '';
}

function getEditorialSummary(item) {
  return item.category || item.subtitle || item.location || 'Archive';
}

function PublicMasthead({ editorSettings, editMode, navigate, routePath, transition }) {
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
  const titleTop = initialTop + (finalTop - initialTop) * progress + (editMode ? editorSettings.titleOffsetY : 0);
  const titleScale = ((isMobile ? 0.84 : 0.93) - progress * (isMobile ? 0.24 : 0.38)) * (editMode ? editorSettings.titleScale : 1);
  const titleOpacity = (0.86 - progress * 0.22) * (editMode ? editorSettings.titleOpacity : 1);
  const navOpacity = 0.54 + progress * 0.46;
  const mastheadBackground = 0.08 + progress * 0.82;

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[120] px-5 py-4 backdrop-blur-md md:px-8"
      style={{ backgroundColor: `rgba(215,211,200,${mastheadBackground})` }}
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
        className="pointer-events-none fixed left-0 right-0 z-[105] flex justify-center px-5 transition-[top,transform,opacity] duration-700 ease-studio-out md:px-8"
        style={{
          opacity: titleOpacity,
          top: `${titleTop}px`,
          transform: `scale(${titleScale})`,
          transformOrigin: 'top center',
        }}
      >
        <button className="pointer-events-auto block" type="button" onClick={() => navigate('/')}>
          <h1
            className="public-masthead-type max-w-[12ch] text-[10.5vw] text-[#111111] md:max-w-[13ch] md:text-[6.8vw]"
            style={{
              fontFamily: fontStacks[editorSettings.mastheadFont],
              ...(editMode ? {
                fontSize: `clamp(2.9rem, ${editorSettings.titleFontSize}vw, 9.2rem)`,
              maxWidth: `${editorSettings.titleMaxWidth}ch`,
              textAlign: editorSettings.titleAlign,
              } : {}),
            }}
          >
            BE BLANK TO BEHIND STUDIO
          </h1>
        </button>
      </div>
    </header>
  );
}

function CuratedArchiveCard({ editorSettings, item, navigate, size = 'medium' }) {
  if (!item) return null;
  const cover = getCoverImage(item);
  const summary = getEditorialSummary(item);
  const area = item.areaSqm ? formatArea(item.areaSqm) : '';
  const imageUrl = resolvePortfolioImageUrl(cover, ['mediumUrl', 'url', 'imageUrl', 'thumbnailUrl', 'fullUrl']) || item.imageUrl;
  const sizeClass = size === 'large'
    ? 'aspect-[16/11] md:aspect-[16/10]'
    : size === 'compact'
      ? 'aspect-[4/5] md:aspect-[5/6]'
      : 'aspect-[4/5] md:aspect-[4/3]';

  return (
    <article
      className="min-w-0"
    >
      <button className="group block w-full text-left" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}>
        <span className="relative block overflow-hidden bg-[#f1f1ee]">
          <img
            alt={item.title}
            className={`${sizeClass} w-full object-cover transition duration-[1200ms] ease-studio-out group-hover:scale-[1.012] group-hover:opacity-95`}
            loading="lazy"
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 48vw, 36vw"
            src={imageUrl}
            style={{
              ...getImageFocusStyle(cover),
            }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </span>
        <span
          className="mt-2 grid gap-1 text-[#111111]"
          style={{
            maxWidth: `${editorSettings.projectMaxWidth}rem`,
            textAlign: editorSettings.projectAlign,
          }}
        >
          <span className="public-project-title" style={{ fontFamily: fontStacks[editorSettings.projectTitleFont] }}>{item.title || 'Untitled Project'}</span>
          <span
            className="public-project-meta text-[#777777]"
            style={{ opacity: editorSettings.projectMetaOpacity }}
          >
            {summary}
            {area && <span className="public-utility-meta ml-1 text-[#8a8a8a]">{area}</span>}
          </span>
        </span>
      </button>
    </article>
  );
}

function getCuratedArchiveSelection(items) {
  const withHints = items.map((item, index) => {
    const layout = getArchiveLayout(item, index);
    const cover = getCoverImage(item);
    const hasImage = Boolean(resolvePortfolioImageUrl(cover, ['mediumUrl', 'url', 'imageUrl', 'thumbnailUrl', 'fullUrl']) || item.imageUrl);
    const featuredHint = Boolean(item.isFeatured || item.featured || item.featuredPriority || item.isHero);
    const emphasis = (layout.width * layout.height) + (layout.zIndex * 16);
    return { item, index, layout, hasImage, featuredHint, emphasis };
  });

  const hasFeaturedHint = withHints.some((entry) => entry.featuredHint);
  const featuredEntry = withHints
    .slice()
    .sort((left, right) => {
      const rightFeatured = Number(Boolean(right.featuredHint));
      const leftFeatured = Number(Boolean(left.featuredHint));
      if (rightFeatured !== leftFeatured) return rightFeatured - leftFeatured;
      const rightImage = Number(Boolean(right.hasImage));
      const leftImage = Number(Boolean(left.hasImage));
      if (rightImage !== leftImage) return rightImage - leftImage;
      return right.emphasis - left.emphasis;
    })[0] || null;
  const remainder = withHints
    .filter((entry) => entry.item.id !== featuredEntry?.item?.id)
    .sort((left, right) => right.emphasis - left.emphasis);

  return {
    hasFeaturedHint,
    featured: featuredEntry?.item || null,
    secondary: remainder.slice(0, 4).map((entry) => entry.item),
    archive: remainder.slice(4).map((entry) => entry.item),
  };
}

function pickHomepageTemplate({ count, hasFeaturedHint, viewportWidth }) {
  if (count <= 1) return homepageTemplates.LARGE_LEFT_HERO;
  if (count <= 3) {
    if (viewportWidth >= 1680 && hasFeaturedHint) return homepageTemplates.SPLIT_EDITORIAL;
    return homepageTemplates.VERTICAL_CINEMATIC_STACK;
  }

  if (viewportWidth >= 1760) return homepageTemplates.OFFSET_ARCHIVE_GRID;
  if (hasFeaturedHint && viewportWidth >= 1320) return homepageTemplates.FEATURE_ARCHIVE_RHYTHM;
  if (viewportWidth < 1260) return homepageTemplates.VERTICAL_CINEMATIC_STACK;
  return homepageTemplates.SPLIT_EDITORIAL;
}

function CuratedArchiveComposition({ editorSettings, items, navigate, viewportWidth }) {
  const selection = useMemo(() => getCuratedArchiveSelection(items), [items]);
  const count = items.length;
  const featured = selection.featured;
  const secondary = selection.secondary;
  const archive = selection.archive;
  const template = pickHomepageTemplate({
    count,
    hasFeaturedHint: selection.hasFeaturedHint,
    viewportWidth,
  });

  if (!featured) return null;

  if (template === homepageTemplates.LARGE_LEFT_HERO) {
    return (
      <section className="grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-8">
          <CuratedArchiveCard editorSettings={editorSettings} item={featured} navigate={navigate} size="large" />
        </div>
        <div className="grid content-end gap-5 md:col-span-4">
          <p className="public-project-meta text-[#777777]">selected archive</p>
          <h2 className="public-project-title text-3xl leading-tight text-[#111111] md:text-5xl">{featured.title || 'Untitled Project'}</h2>
          <p className="public-project-meta text-[#777777]">
            {[featured.category, featured.location, featured.year].filter(Boolean).join(' / ') || 'archive composition'}
          </p>
        </div>
      </section>
    );
  }

  if (template === homepageTemplates.SPLIT_EDITORIAL) {
    return (
      <section className="grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <CuratedArchiveCard editorSettings={editorSettings} item={featured} navigate={navigate} size="large" />
        </div>
        <div className="grid content-start gap-8 md:col-span-5">
          <div className="grid gap-5 border-b border-black/[0.08] pb-7">
            <p className="public-project-meta text-[#777777]">selected archive</p>
            <h2 className="public-project-title text-3xl leading-tight text-[#111111] md:text-5xl">{featured.title || 'Untitled Project'}</h2>
            <p className="public-project-meta text-[#777777]">
              {[featured.category, featured.location, featured.year].filter(Boolean).join(' / ') || 'archive composition'}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {secondary.map((item) => (
              <CuratedArchiveCard key={item.id} editorSettings={editorSettings} item={item} navigate={navigate} size="compact" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (template === homepageTemplates.VERTICAL_CINEMATIC_STACK) {
    return (
      <section className="grid gap-12">
        <div className="grid gap-5 border-b border-black/[0.08] pb-8">
          <p className="public-project-meta text-[#777777]">selected archive</p>
          <h2 className="public-project-title text-3xl leading-tight text-[#111111] md:text-5xl">{featured.title || 'Untitled Project'}</h2>
          <p className="public-project-meta text-[#777777]">
            {[featured.category, featured.location, featured.year].filter(Boolean).join(' / ') || 'archive composition'}
          </p>
        </div>
        <CuratedArchiveCard editorSettings={editorSettings} item={featured} navigate={navigate} size="large" />
        <div className="grid gap-8 sm:grid-cols-2">
          {secondary.slice(0, 2).map((item) => (
            <CuratedArchiveCard key={item.id} editorSettings={editorSettings} item={item} navigate={navigate} size="medium" />
          ))}
        </div>
        {archive.length > 0 && (
          <div className="border-t border-black/[0.08] pt-8">
            <p className="public-project-meta mb-4 text-[#777777]">archive index</p>
            <div className="grid gap-4">
              {archive.map((item) => (
                <button
                  key={item.id}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-6 border-b border-black/[0.08] py-3 text-left transition hover:opacity-60"
                  type="button"
                  onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
                >
                  <span className="public-project-title text-[#111111]">{item.title || 'Untitled Project'}</span>
                  <span className="public-project-meta text-[#777777]">{[item.category, item.year].filter(Boolean).join(' / ') || 'archive'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  if (template === homepageTemplates.OFFSET_ARCHIVE_GRID) {
    return (
      <section className="grid gap-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-8">
            <CuratedArchiveCard editorSettings={editorSettings} item={featured} navigate={navigate} size="large" />
          </div>
          <div className="grid content-start gap-5 md:col-span-4 md:pt-6">
            <p className="public-project-meta text-[#777777]">selected archive</p>
            <h2 className="public-project-title text-3xl leading-tight text-[#111111] md:text-5xl">{featured.title || 'Untitled Project'}</h2>
            <p className="public-project-meta text-[#777777]">
              {[featured.category, featured.location, featured.year].filter(Boolean).join(' / ') || 'archive composition'}
            </p>
          </div>
        </div>
        <div className="grid gap-7 md:grid-cols-12">
          {secondary.map((item, index) => {
            const spanClass = index === 0 ? 'md:col-span-4 md:mt-8' : index === 1 ? 'md:col-span-5' : index === 2 ? 'md:col-span-3 md:mt-14' : 'md:col-span-6';
            return (
              <div key={item.id} className={spanClass}>
                <CuratedArchiveCard editorSettings={editorSettings} item={item} navigate={navigate} size={index === 2 ? 'compact' : 'medium'} />
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-12">
      <div className="grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <CuratedArchiveCard editorSettings={editorSettings} item={featured} navigate={navigate} size="large" />
        </div>
        <div className="grid content-start gap-5 md:col-span-5">
          <p className="public-project-meta text-[#777777]">selected archive</p>
          <h2 className="public-project-title text-3xl leading-tight text-[#111111] md:text-5xl">{featured.title || 'Untitled Project'}</h2>
          <p className="public-project-meta text-[#777777]">
            {[featured.category, featured.location, featured.year].filter(Boolean).join(' / ') || 'archive composition'}
          </p>
        </div>
      </div>

      <div className="grid gap-7 md:grid-cols-12">
        {secondary.map((item, index) => {
          const spanClass = index === 0 ? 'md:col-span-7' : index === 1 ? 'md:col-span-5 md:mt-10' : 'md:col-span-6';
          return (
            <div key={item.id} className={spanClass}>
              <CuratedArchiveCard editorSettings={editorSettings} item={item} navigate={navigate} size={index < 2 ? 'medium' : 'compact'} />
            </div>
          );
        })}
      </div>

      {archive.length > 0 && (
        <div className="border-t border-black/[0.08] pt-8">
          <p className="public-project-meta mb-4 text-[#777777]">archive index</p>
          <div className="grid gap-4 md:grid-cols-2">
            {archive.map((item) => (
              <button
                key={item.id}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-6 border-b border-black/[0.08] py-3 text-left transition hover:opacity-60"
                type="button"
                onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
              >
                <span className="public-project-title text-[#111111]">{item.title || 'Untitled Project'}</span>
                <span className="public-project-meta text-[#777777]">{[item.category, item.year].filter(Boolean).join(' / ') || 'archive'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function EditorialHeroLayer({ items, navigate }) {
  const leadItem = items.find((item) => getCoverImage(item)?.mediumUrl || item.imageUrl);
  if (!leadItem) return null;

  const cover = getCoverImage(leadItem);
  const imageUrl = cover?.fullUrl || cover?.mediumUrl || leadItem.imageUrl;

  return (
    <section className="mb-24 grid min-h-[46vh] items-end gap-8 border-b border-black/[0.08] pb-10 md:grid-cols-12">
      <button
        className="group block overflow-hidden bg-[#f1f1ee] text-left md:col-span-7"
        type="button"
        onClick={() => navigate(`/portfolio/${encodeURIComponent(leadItem.id)}`)}
      >
        <img
          alt={leadItem.title || 'Featured project'}
          className="aspect-[16/10] w-full object-cover transition duration-[1200ms] ease-studio-out group-hover:scale-[1.01] group-hover:opacity-95"
          src={imageUrl}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </button>
      <div className="md:col-span-4 md:col-start-9">
        <p className="public-project-meta text-[#777777]">selected archive</p>
        <button className="mt-5 block text-left transition hover:opacity-60" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent(leadItem.id)}`)}>
          <h2 className="public-project-title text-3xl leading-tight text-[#111111] md:text-5xl">{leadItem.title || 'Untitled Project'}</h2>
          <p className="public-project-meta mt-4 text-[#777777]">
            {[leadItem.category, leadItem.location, leadItem.year].filter(Boolean).join(' / ') || 'archive composition'}
          </p>
        </button>
      </div>
    </section>
  );
}

function EditableArchiveItem({ editorSettings, highlighted, index, item, layout, onLayer, onPointerStart }) {
  const cover = getCoverImage(item);
  const summary = item.category || item.subtitle || item.location || 'Archive';
  const area = item.areaSqm ? formatArea(item.areaSqm) : '';

  return (
    <article
      className={`public-edit-item group absolute ${highlighted ? 'is-highlighted' : ''}`}
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${layout.width}%`,
        zIndex: layout.zIndex,
      }}
    >
      <div
        className="public-edit-frame"
        role="button"
        tabIndex={0}
        onPointerDown={(event) => onPointerStart(event, item, index, 'move')}
      >
        <span className="block overflow-hidden bg-[#f1f1ee]">
          <img
            alt={item.title}
            className="w-full object-cover"
            loading="lazy"
            sizes="(max-width: 768px) 92vw, 34vw"
            src={resolvePortfolioImageUrl(cover, ['mediumUrl', 'url', 'imageUrl', 'thumbnailUrl', 'fullUrl']) || item.imageUrl}
            style={{
              height: getArchiveImageHeight(layout),
              ...getImageFocusStyle(cover),
            }}
            draggable={false}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <span
            className={`pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-studio-orange transition ${highlighted ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'}`}
            style={{
              left: `${cover?.focusX ?? 50}%`,
              top: `${cover?.focusY ?? 50}%`,
            }}
          />
        </span>
        <span
          className="mt-2 grid gap-1 text-[#111111]"
          style={{
            maxWidth: `${editorSettings.projectMaxWidth}rem`,
            textAlign: editorSettings.projectAlign,
          }}
        >
          <span className="public-project-title" style={{ fontFamily: fontStacks[editorSettings.projectTitleFont] }}>{item.title || 'Untitled Project'}</span>
          <span
            className="public-project-meta text-[#777777]"
            style={{ opacity: editorSettings.projectMetaOpacity }}
          >
            {summary}
            {area && <span className="public-utility-meta ml-1 text-[#8a8a8a]">{area}</span>}
          </span>
        </span>
      </div>

      <div className="public-edit-layer-tools">
        <button type="button" onClick={() => onLayer(item, layout.zIndex - 1)}>send back</button>
        <span>{layout.zIndex}</span>
        <button type="button" onClick={() => onLayer(item, layout.zIndex + 1)}>bring forward</button>
      </div>

      <button
        aria-label={`Resize ${item.title || 'project'}`}
        className="public-edit-resize"
        type="button"
        onPointerDown={(event) => onPointerStart(event, item, index, 'resize-se')}
      />
    </article>
  );
}

function EditableHomeArchive({ draftLayouts, editorSettings, highlightedItemId, items, onDraftLayout }) {
  const canvasRef = useRef(null);
  const activeInteraction = useRef(null);
  const composedLayouts = useMemo(() => buildComposedLayouts(items, draftLayouts), [items, draftLayouts]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const active = activeInteraction.current;
      const canvas = canvasRef.current;
      if (!active || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dxPercent = ((event.clientX - active.startX) / rect.width) * 100;
      const dyPercent = ((event.clientY - active.startY) / rect.height) * 100;
      const nextLayout = {
        ...active.initial,
        ...getNextInteractionLayout(active.mode, active.initial, dxPercent, dyPercent),
      };

      activeInteraction.current.latestLayout = nextLayout;
      onDraftLayout(active.id, nextLayout);
    };

    const handlePointerUp = () => {
      const active = activeInteraction.current;
      if (!active) return;
      activeInteraction.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onDraftLayout]);

  const handlePointerStart = (event, item, index, mode) => {
    event.preventDefault();
    event.stopPropagation();
    activeInteraction.current = {
      id: item.id,
      initial: composedLayouts[item.id] || draftLayouts[item.id] || getArchiveLayout(item, index),
      mode,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleLayer = (item, nextLayer) => {
    const index = items.findIndex((candidate) => candidate.id === item.id);
    const currentLayout = composedLayouts[item.id] || draftLayouts[item.id] || getArchiveLayout(item, index);
    const nextLayout = { ...currentLayout, zIndex: Math.min(Math.max(nextLayer, 1), 40) };
    onDraftLayout(item.id, nextLayout);
  };

  return (
    <section className="public-editor-canvas" ref={canvasRef} style={{ minHeight: getArchiveCanvasHeight(items, composedLayouts) }}>
      {items.map((item, index) => {
        const layout = composedLayouts[item.id] || draftLayouts[item.id] || getArchiveLayout(item, index);
        return (
          <EditableArchiveItem
            key={item.id}
            editorSettings={editorSettings}
            highlighted={highlightedItemId === item.id}
            index={index}
            item={item}
            layout={layout}
            onLayer={handleLayer}
            onPointerStart={handlePointerStart}
          />
        );
      })}
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
            <span className="public-utility-meta text-[#777777] md:col-span-2">{String(index + 1).padStart(2, '0')}</span>
            <span className="public-project-title text-[#111111] md:col-span-6">{entry.title}</span>
            <span className="public-project-meta text-[#777777] md:col-span-4 md:text-right">{entry.meta || 'archive note'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PublicEditorControls({ editorSettings, gridVisible, onExit, onReflow, onReset, onSave, onToggleGrid, onUpdateSettings }) {
  const alignments = ['left', 'center', 'right'];
  const fonts = [
    { label: 'grotesk', value: 'grotesk' },
    { label: 'serif', value: 'serif' },
    { label: 'mono', value: 'mono' },
  ];

  return (
    <aside className="public-editor-controls" aria-label="Public visual editor controls">
      <div className="public-editor-toolbar">
        <button type="button" onClick={onSave}>save</button>
        <button type="button" onClick={onReset}>reset</button>
        <button type="button" onClick={onReflow}>reflow layout</button>
        <button type="button" onClick={onExit}>exit</button>
        <button aria-pressed={gridVisible} type="button" onClick={onToggleGrid}>grid</button>
      </div>
      <div>
        <p>masthead</p>
        <label>
          font
          <select value={editorSettings.mastheadFont} onChange={(event) => onUpdateSettings({ mastheadFont: event.target.value })}>
            {fonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
        </label>
        <label>
          y
          <input min="-80" max="120" type="range" value={editorSettings.titleOffsetY} onChange={(event) => onUpdateSettings({ titleOffsetY: Number(event.target.value) })} />
        </label>
        <label>
          scale
          <input min="0.7" max="1.25" step="0.01" type="range" value={editorSettings.titleScale} onChange={(event) => onUpdateSettings({ titleScale: Number(event.target.value) })} />
        </label>
        <label>
          size
          <input min="5.5" max="11" step="0.1" type="range" value={editorSettings.titleFontSize} onChange={(event) => onUpdateSettings({ titleFontSize: Number(event.target.value) })} />
        </label>
        <label>
          width
          <input min="9" max="18" step="0.5" type="range" value={editorSettings.titleMaxWidth} onChange={(event) => onUpdateSettings({ titleMaxWidth: Number(event.target.value) })} />
        </label>
        <label>
          opacity
          <input min="0.35" max="1" step="0.01" type="range" value={editorSettings.titleOpacity} onChange={(event) => onUpdateSettings({ titleOpacity: Number(event.target.value) })} />
        </label>
        <div className="public-editor-align">
          {alignments.map((alignment) => (
            <button
              key={alignment}
              className={editorSettings.titleAlign === alignment ? 'is-active' : ''}
              type="button"
              onClick={() => onUpdateSettings({ titleAlign: alignment })}
            >
              {alignment}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p>project text</p>
        <label>
          title
          <select value={editorSettings.projectTitleFont} onChange={(event) => onUpdateSettings({ projectTitleFont: event.target.value })}>
            {fonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
        </label>
        <label>
          size
          <input min="0.68" max="1.05" step="0.01" type="range" value={editorSettings.projectTitleSize} onChange={(event) => onUpdateSettings({ projectTitleSize: Number(event.target.value) })} />
        </label>
        <label>
          width
          <input min="10" max="26" step="0.5" type="range" value={editorSettings.projectMaxWidth} onChange={(event) => onUpdateSettings({ projectMaxWidth: Number(event.target.value) })} />
        </label>
        <label>
          opacity
          <input min="0.45" max="1" step="0.01" type="range" value={editorSettings.projectMetaOpacity} onChange={(event) => onUpdateSettings({ projectMetaOpacity: Number(event.target.value) })} />
        </label>
        <div className="public-editor-align">
          {alignments.map((alignment) => (
            <button
              key={alignment}
              className={editorSettings.projectAlign === alignment ? 'is-active' : ''}
              type="button"
              onClick={() => onUpdateSettings({ projectAlign: alignment })}
            >
              {alignment}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function PublicUtilityDock({ editMode, isEditorAvailable, navigate, onLogin, onToggleEdit, user }) {
  return (
    <div className="public-utility-dock">
      {!user ? (
        <button type="button" onClick={onLogin}>login</button>
      ) : (
        <>
          <button type="button" onClick={() => navigate('/os')}>os</button>
          <button
            aria-pressed={editMode}
            disabled={!isEditorAvailable}
            title={isEditorAvailable ? 'Edit public archive layout' : 'Edit mode is desktop only'}
            type="button"
            onClick={onToggleEdit}
          >
            edit
          </button>
        </>
      )}
    </div>
  );
}

export function PublicHomepage({ portfolioItems, navigate, updatePortfolioItem }) {
  const location = useLocation();
  const mastheadTransition = useMastheadTransition();
  const { signIn, user } = useStudioAuth();
  const isEditorAvailable = useEditorAvailability();
  const viewportWidth = useViewportWidth();
  const {
    resetSettings,
    saveSettings,
    settings: editorSettings,
    updateSettings: updateEditorSettings,
  } = usePublicEditorSettings();
  const [editMode, setEditMode] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [draftLayouts, setDraftLayouts] = useState({});
  const archiveItems = useMemo(() => getItems(portfolioItems), [portfolioItems]);
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const highlightedItemId = query.get('highlight') || '';
  const draftArchiveItems = useMemo(
    () => archiveItems.map((item) => ({ ...item, ...(draftLayouts[item.id] ? stringifyLayout(draftLayouts[item.id]) : {}) })),
    [archiveItems, draftLayouts],
  );
  const routePath = location.pathname;
  const isArchiveRoute = routePath === '/' || routePath === '/work' || routePath === '/portfolio';

  useEffect(() => {
    if (!isEditorAvailable && editMode) {
      setEditMode(false);
    }
  }, [editMode, isEditorAvailable]);

  useEffect(() => {
    if (query.get('edit') === '1' && isArchiveRoute && isEditorAvailable && user) {
      setEditMode(true);
    }
  }, [isArchiveRoute, isEditorAvailable, query, user]);

  const updateDraftLayout = (id, layout) => {
    setDraftLayouts((layouts) => ({ ...layouts, [id]: layout }));
  };

  const saveEditorChanges = async () => {
    saveSettings(editorSettings);

    if (!updatePortfolioItem) {
      setDraftLayouts({});
      return;
    }

    const entries = Object.entries(draftLayouts);
    try {
      await Promise.all(entries.map(([id, layout]) => updatePortfolioItem(id, stringifyLayout(layout))));
      setDraftLayouts({});
    } catch {
      setDraftLayouts((layouts) => ({ ...layouts }));
    }
  };

  const resetEditorChanges = () => {
    setDraftLayouts({});
    resetSettings();
  };

  const reflowEditorLayout = () => {
    setDraftLayouts(getNormalizedPortfolioLayouts(archiveItems));
  };

  const toggleEditMode = () => {
    if (!user) {
      signIn();
      return;
    }

    if (!isArchiveRoute) {
      navigate('/');
      setEditMode(true);
      return;
    }

    setEditMode((value) => !value);
  };

  const handleLogin = async () => {
    try {
      await signIn();
    } catch {
      navigate('/os');
    }
  };

  return (
    <div
      className={`min-h-screen bg-studio-paper text-[#111111] selection:bg-black/10 ${editMode && gridVisible ? 'public-edit-mode' : ''}`}
      style={{ '--public-project-title-size': `${editorSettings.projectTitleSize}rem` }}
    >
      <PublicMasthead editorSettings={editorSettings} editMode={editMode} navigate={navigate} routePath={routePath} transition={mastheadTransition} />

      <main className="mx-auto max-w-screen-2xl px-5 pb-32 pt-[37vh] md:px-8 md:pt-[42vh]">
        {routePath === '/about' ? (
          <AboutArchive />
        ) : routePath === '/journal' ? (
          <JournalArchive items={archiveItems} navigate={navigate} />
        ) : editMode && isArchiveRoute ? (
          <EditableHomeArchive
            draftLayouts={draftLayouts}
            editorSettings={editorSettings}
            highlightedItemId={highlightedItemId}
            items={draftArchiveItems}
            onDraftLayout={updateDraftLayout}
          />
        ) : (
          <>
            <section className="pb-12 md:pb-16">
              <EditorialHeroLayer items={archiveItems} navigate={navigate} />
            </section>
            <section className="pt-8 md:pt-12">
              <CuratedArchiveComposition editorSettings={editorSettings} items={archiveItems} navigate={navigate} viewportWidth={viewportWidth} />
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-black/[0.08] px-5 py-10 md:px-8">
        <div className="public-editorial-nav flex flex-col gap-4 text-[#777777] md:flex-row md:items-center md:justify-between">
          <button className="text-left transition hover:text-[#111111]" type="button" onClick={() => navigate('/')}>be blank archive</button>
          <button className="text-left transition hover:text-[#111111]" type="button" onClick={() => navigate('/work')}>public index</button>
        </div>
      </footer>

      {editMode && isArchiveRoute && (
        <PublicEditorControls
          editorSettings={editorSettings}
          gridVisible={gridVisible}
          onExit={() => setEditMode(false)}
          onReflow={reflowEditorLayout}
          onReset={resetEditorChanges}
          onSave={saveEditorChanges}
          onToggleGrid={() => setGridVisible((value) => !value)}
          onUpdateSettings={updateEditorSettings}
        />
      )}
      <PublicUtilityDock
        editMode={editMode && isArchiveRoute}
        isEditorAvailable={isEditorAvailable}
        navigate={navigate}
        onLogin={handleLogin}
        onToggleEdit={toggleEditMode}
        user={user}
      />
    </div>
  );
}
