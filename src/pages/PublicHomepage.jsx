import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { initialPortfolioItems } from '../data/seed.js';
import { useStudioAuth } from '../hooks/useStudioAuth.js';
import {
  getNextInteractionLayout,
  getNormalizedPortfolioLayouts,
  getPortfolioImageObjectPosition,
  getPortfolioLayout,
  hasExplicitPortfolioLayout,
  stringifyLayout,
} from '../utils/layout.js';
import { getCoverImage } from '../utils/portfolioImages.js';

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
  metadataFont: 'serif',
};

const fontStacks = {
  grotesk: "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  serif: "Baskerville, Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Courier, monospace",
};

const editorSettingsStorageKey = 'beBlankPublicEditorSettings';

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

function getArchiveCanvasHeight(items, draftLayouts = {}) {
  const maxBottom = items.reduce((bottom, item, index) => {
    const layout = draftLayouts[item.id] || getArchiveLayout(item, index);
    return Math.max(bottom, layout.y + layout.height + 18);
  }, 120);

  return `${Math.max(118, maxBottom)}vw`;
}

function formatArea(areaSqm) {
  return areaSqm ? `[${areaSqm}m\u00b2]` : '';
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
  const titleScale = ((isMobile ? 0.86 : 1) - progress * (isMobile ? 0.32 : 0.5)) * (editMode ? editorSettings.titleScale : 1);
  const titleOpacity = (1 - progress * 0.28) * (editMode ? editorSettings.titleOpacity : 1);
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
        className="pointer-events-none fixed left-0 right-0 z-[110] flex justify-center px-5 transition-[top,transform,opacity] duration-700 ease-studio-out md:px-8"
        style={{
          opacity: titleOpacity,
          top: `${titleTop}px`,
          transform: `scale(${titleScale})`,
          transformOrigin: 'top center',
        }}
      >
        <button className="pointer-events-auto block" type="button" onClick={() => navigate('/')}>
          <h1
            className="public-masthead-type max-w-[13ch] text-[13vw] text-[#111111] md:max-w-[14ch] md:text-[8vw]"
            style={{
              fontFamily: fontStacks[editorSettings.mastheadFont],
              ...(editMode ? {
                fontSize: `clamp(3.25rem, ${editorSettings.titleFontSize}vw, 11rem)`,
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

function HomeArchiveItem({ editorSettings, index, item, navigate }) {
  const layout = getArchiveLayout(item, index);
  const cover = getCoverImage(item);
  const summary = item.category || item.subtitle || item.location || 'Archive';
  const area = item.areaSqm ? formatArea(item.areaSqm) : '';

  return (
    <article
      className="public-work-item"
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${layout.width}%`,
        zIndex: layout.zIndex,
      }}
    >
      <button className="group block w-full text-left" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}>
        <span className="block overflow-hidden bg-[#f1f1ee]">
          <img
            alt={item.title}
            className="w-full object-cover transition duration-[1200ms] ease-studio-out group-hover:scale-[1.012] group-hover:opacity-95"
            loading="lazy"
            sizes="(max-width: 768px) 92vw, 34vw"
            src={cover?.mediumUrl || item.imageUrl}
            style={{
              height: `${layout.height * 10}px`,
              objectPosition: getPortfolioImageObjectPosition(index),
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
            style={{ fontFamily: fontStacks[editorSettings.metadataFont], opacity: editorSettings.projectMetaOpacity }}
          >
            {summary}
            {area && <span className="public-utility-meta ml-1 text-[#8a8a8a]">{area}</span>}
          </span>
        </span>
      </button>
    </article>
  );
}

function HomeArchive({ editorSettings, items, navigate }) {
  return (
    <section className="public-archive-canvas" style={{ minHeight: getArchiveCanvasHeight(items) }}>
      {items.map((item, index) => (
        <HomeArchiveItem key={item.id} editorSettings={editorSettings} index={index} item={item} navigate={navigate} />
      ))}
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
            src={cover?.mediumUrl || item.imageUrl}
            style={{
              height: `${layout.height * 10}px`,
              objectPosition: getPortfolioImageObjectPosition(index),
            }}
            draggable={false}
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
            style={{ fontFamily: fontStacks[editorSettings.metadataFont], opacity: editorSettings.projectMetaOpacity }}
          >
            {summary}
            {area && <span className="public-utility-meta ml-1 text-[#8a8a8a]">{area}</span>}
          </span>
        </span>
      </div>

      <div className="public-edit-layer-tools">
        <button type="button" onClick={() => onLayer(item, layout.zIndex - 1)}>back</button>
        <span>{layout.zIndex}</span>
        <button type="button" onClick={() => onLayer(item, layout.zIndex + 1)}>front</button>
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
      initial: draftLayouts[item.id] || getArchiveLayout(item, index),
      mode,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleLayer = (item, nextLayer) => {
    const index = items.findIndex((candidate) => candidate.id === item.id);
    const currentLayout = draftLayouts[item.id] || getArchiveLayout(item, index);
    const nextLayout = { ...currentLayout, zIndex: Math.min(Math.max(nextLayer, 1), 20) };
    onDraftLayout(item.id, nextLayout);
  };

  return (
    <section className="public-editor-canvas" ref={canvasRef} style={{ minHeight: getArchiveCanvasHeight(items, draftLayouts) }}>
      {items.map((item, index) => {
        const layout = draftLayouts[item.id] || getArchiveLayout(item, index);
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
          meta
          <select value={editorSettings.metadataFont} onChange={(event) => onUpdateSettings({ metadataFont: event.target.value })}>
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

      <main className="mx-auto max-w-screen-2xl px-5 pb-32 pt-[42vh] md:px-8 md:pt-[48vh]">
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
            <EditorialHeroLayer items={archiveItems} navigate={navigate} />
            <HomeArchive editorSettings={editorSettings} items={archiveItems} navigate={navigate} />
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
