import { useEffect, useRef, useState } from 'react';
import {
  addCollectionItem,
  deleteCollectionItem,
  isAllowedUser,
  isFirebaseConfigured,
  onStudioAuthChange,
  signInToStudio,
  signOutOfStudio,
} from '../services/firebase.js';
import { initialPortfolioItems } from '../data/seed.js';
import { createPortfolioItem } from '../utils/dashboard.js';
import {
  clampNumber,
  getPortfolioLayout,
  getNextInteractionLayout,
  getPortfolioImageObjectPosition,
  stringifyLayout,
  getMaxLayer
} from '../utils/layout.js';

const HOMEPAGE_LAYOUT_STORAGE_KEY = 'beBlank.homepageLayout.v1';
const HOMEPAGE_BACKGROUND_STORAGE_KEY = 'beBlank.homepageBackground.v1';
const DEFAULT_HOMEPAGE_BACKGROUND = '#e9e8e4';

function getHomepageLayoutStore() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(HOMEPAGE_LAYOUT_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveHomepageLayout(layoutById) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOMEPAGE_LAYOUT_STORAGE_KEY, JSON.stringify(layoutById));
}

function saveHomepageBackground(backgroundColor) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HOMEPAGE_BACKGROUND_STORAGE_KEY, backgroundColor);
}

function mergeHomepageLayout(items) {
  const savedLayout = getHomepageLayoutStore();
  const savedItems = Object.entries(savedLayout)
    .filter(([itemId]) => !items.some((item) => item.id === itemId))
    .map(([itemId, layout]) => ({
      ...createPortfolioItem(),
      id: itemId,
      title: 'Untitled Work',
      ...layout,
    }));

  return [...items.map((item) => ({ ...item, ...(savedLayout[item.id] || {}) })), ...savedItems];
}

export function PublicHomepage({ portfolioItems, navigate }) {
  const featuredItems = portfolioItems.length ? portfolioItems : initialPortfolioItems;
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('WORK');
  const [layoutItems, setLayoutItems] = useState(() => mergeHomepageLayout(featuredItems));
  const [publicUser, setPublicUser] = useState(null);
  const [publicAuthMessage, setPublicAuthMessage] = useState('');
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [layoutInteraction, setLayoutInteraction] = useState(null);
  const [deletedLayoutItemIds, setDeletedLayoutItemIds] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const backgroundColor = DEFAULT_HOMEPAGE_BACKGROUND;
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isEditingLayout) {
      setLayoutItems(mergeHomepageLayout(featuredItems));
      setDeletedLayoutItemIds([]);
    }
  }, [featuredItems, isEditingLayout]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;

    return onStudioAuthChange((user) => {
      if (user && isAllowedUser(user)) {
        setPublicUser(user);
        setPublicAuthMessage('');
        return;
      }

      setPublicUser(null);
      setIsEditingLayout(false);
      if (user && !isAllowedUser(user)) {
        setPublicAuthMessage('This Google account is not allowed.');
        signOutOfStudio();
      }
    });
  }, []);

  useEffect(() => {
    const updateScrollProgress = () => {
      setScrollProgress(clampNumber(window.scrollY / 760, 0, 1));
    };

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = DEFAULT_HOMEPAGE_BACKGROUND;
    document.body.style.backgroundColor = DEFAULT_HOMEPAGE_BACKGROUND;
    saveHomepageBackground(DEFAULT_HOMEPAGE_BACKGROUND);
  }, []);

  useEffect(() => {
    if (!layoutInteraction) return undefined;

    const handlePointerMove = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dx = event.clientX - layoutInteraction.startX;
      const dy = event.clientY - layoutInteraction.startY;
      const canvasWidth = canvas.getBoundingClientRect().width || 1;
      const dxPercent = (dx / canvasWidth) * 100;
      const canvasHeight = canvas.getBoundingClientRect().height || 1;
      const dyPercent = (dy / canvasHeight) * 100;

      setLayoutItems((items) =>
        items.map((item, index) => {
          if (item.id !== layoutInteraction.itemId) return item;

          const initial = layoutInteraction.initialLayout;
          const nextLayout = getNextInteractionLayout(layoutInteraction.mode, initial, dxPercent, dyPercent);

          return {
            ...item,
            ...stringifyLayout({
              ...getPortfolioLayout(item, index),
              ...nextLayout,
            }),
          };
        }),
      );
    };

    const stopInteraction = () => setLayoutInteraction(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopInteraction);
    window.addEventListener('pointercancel', stopInteraction);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopInteraction);
      window.removeEventListener('pointercancel', stopInteraction);
    };
  }, [layoutInteraction]);

  const titleStyle = {
    top: '120px',
    transform: 'translateX(-50%)',
    opacity: clampNumber(1 - scrollProgress * 2, 0, 1),
  };
  const canSaveToFirebase = Boolean(publicUser && isFirebaseConfigured());
  const heroItems = layoutItems.slice(0, 4);
  const selectedItem = layoutItems.find((item) => item.id === selectedItemId);

  const handlePublicSignIn = async () => {
    try {
      setPublicAuthMessage('');
      await signInToStudio();
    } catch (error) {
      setPublicAuthMessage(error.message);
    }
  };

  const beginLayoutInteraction = (event, item, index, mode) => {
    if (!isEditingLayout) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedItemId(item.id);
    setLayoutInteraction({
      itemId: item.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialLayout: getPortfolioLayout(item, index),
    });
  };

  const saveLayout = async () => {
    const layoutById = Object.fromEntries(
      layoutItems.map((item, index) => [item.id, stringifyLayout(getPortfolioLayout(item, index))]),
    );

    saveHomepageLayout(layoutById);

    if (canSaveToFirebase) {
      await Promise.all(
        layoutItems.map((item, index) =>
          addCollectionItem('portfolioItems', {
            ...item,
            ...stringifyLayout(getPortfolioLayout(item, index)),
          }),
        ),
      );
      await Promise.all(deletedLayoutItemIds.map((itemId) => deleteCollectionItem('portfolioItems', itemId)));
      await addCollectionItem('homepageSettings', {
        id: 'homepage',
        backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND,
      });
      setDeletedLayoutItemIds([]);
    }

    setSaveMessage(canSaveToFirebase ? 'Layout saved to Firebase' : 'Layout saved locally');
    window.setTimeout(() => setSaveMessage(''), 1600);
  };

  const addHomepageWork = () => {
    const item = {
      ...createPortfolioItem(),
      ...stringifyLayout({
        x: 58,
        y: 55,
        width: 24,
        height: 28,
        zIndex: getMaxLayer(layoutItems) + 1,
      }),
    };

    setLayoutItems((items) => [item, ...items]);
    setSelectedItemId(item.id);
  };

  const removeHomepageWork = (itemId) => {
    setLayoutItems((items) => items.filter((item) => item.id !== itemId));
    setDeletedLayoutItemIds((itemIds) => [...new Set([...itemIds, itemId])]);
    setSelectedItemId((selectedId) => (selectedId === itemId ? '' : selectedId));
  };

  const updateItemLayer = (itemId, action) => {
    setLayoutItems((items) => {
      const layers = items.map((item, index) => getPortfolioLayout(item, index).zIndex);
      const minLayer = Math.min(...layers, 1);
      const maxLayer = Math.max(...layers, 1);

      return items.map((item, index) => {
        if (item.id !== itemId) return item;

        const layout = getPortfolioLayout(item, index);
        const nextLayer = {
          forward: layout.zIndex + 1,
          backward: layout.zIndex - 1,
          front: Math.max(maxLayer + 1, 9),
          back: minLayer - 1,
        }[action];

        return {
          ...item,
          ...stringifyLayout({
            ...layout,
            zIndex: clampNumber(action === 'front' ? 20 : nextLayer, 1, 20),
          }),
        };
      });
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#e9e8e4] text-[#111111]" style={{ backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND }}>
      <header
        className="fixed left-0 right-0 top-0 z-[100] border-b border-black/[0.05] bg-white/80 px-5 py-4 backdrop-blur-md md:px-8"
      >
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-[#111111]">
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-2">
            {['WORK', 'ABOUT', 'JOURNAL'].map(item => (
              <a
                key={item}
                className={`transition-all duration-500 hover:text-[#777777] ${activeTab === item ? 'opacity-100' : 'opacity-40'}`}
                href={`#${item.toLowerCase()}`}
                onClick={() => setActiveTab(item)}
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-3 text-[10px] tracking-tight">
            {!publicUser ? (
              <button className="transition hover:text-[#777777]" type="button" onClick={handlePublicSignIn}>
                SIGN IN
              </button>
            ) : (
              <>
                <button className="transition hover:text-[#777777]" type="button" onClick={() => navigate('/os')}>
                  OS
                </button>
                <button className="transition hover:text-[#777777]" type="button" onClick={() => setIsEditingLayout((value) => !value)}>
                  {isEditingLayout ? 'EXIT EDIT' : 'EDIT'}
                </button>
              </>
            )}
          </div>
        </nav>
      </header>
      <div
        className="pointer-events-none fixed left-1/2 z-[80] w-[96vw] text-center"
        style={titleStyle}
      >
        <h1
          className="mx-auto max-w-[96vw] whitespace-nowrap text-center text-[clamp(14px,3vw,32px)] font-bold uppercase tracking-tight text-[#111111]"
        >
          BE BLANK TO BEHIND STUDIO
        </h1>
      </div>

      <main className="bg-[#f8f9fa]">
        <section className="relative min-h-[100vh] bg-[#f8f9fa] px-5 pb-16 pt-32 md:px-8">
          <div
            ref={canvasRef}
            className={`absolute left-5 right-5 top-24 mx-auto h-[calc(100vh-6rem)] min-h-[600px] max-w-[1500px] overflow-visible md:left-8 md:right-8 ${
              isEditingLayout ? 'cursor-crosshair' : ''
            }`}
          >
            {heroItems.map((item, index) => (
              <PortfolioCanvasCard
                key={item.id}
                index={index}
                isEditing={isEditingLayout}
                item={item}
                navigate={navigate}
                onLayerChange={updateItemLayer}
                onPointerDown={beginLayoutInteraction}
                onRemove={removeHomepageWork}
                selected={selectedItemId === item.id}
                setSelectedItemId={setSelectedItemId}
              />
            ))}
          </div>
          <div className="h-[calc(100vh-64px)] min-h-[600px]" aria-hidden="true" />
          <div className="mx-auto mt-12 grid max-w-7xl gap-7 border-t border-black/[0.06] pt-6 text-left text-sm leading-6 text-[#777777] md:grid-cols-[1fr_1.5fr_1fr]">
            <p className="font-medium uppercase tracking-tight text-[#111111]">Architecture / Interior / Objects</p>
            <p className="max-w-2xl">
              A Bangkok-based architecture and interior studio shaping spatial identities for hospitality, residential,
              and cultural work.
            </p>
            <p className="md:text-right">Selected works, project notes, and studio operations.</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-tight text-[#777777]">
            {publicAuthMessage && <span className="text-red-700">{publicAuthMessage}</span>}
            {saveMessage && <span>{saveMessage}</span>}
          </div>
          {isEditingLayout && (
            <HomepageEditPanel
              backgroundColor={backgroundColor}
              hasSelection={Boolean(selectedItem)}
              onAdd={addHomepageWork}
              onLayerChange={(action) => selectedItem && updateItemLayer(selectedItem.id, action)}
              onRemove={() => selectedItem && removeHomepageWork(selectedItem.id)}
              onSave={saveLayout}
            />
          )}
        </section>

        <section id="work" className="bg-[#e9e8e4] px-5 pb-24 md:px-8" style={{ backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND }}>
          <div className="mb-10 flex items-end justify-between border-t border-black/[0.06] pt-6">
            <h2 className="text-[10px] font-bold uppercase  text-studio-muted">Work</h2>
            <span className="text-[10px] font-bold uppercase tracking-tight text-studio-muted/60">Selected portfolio</span>
          </div>
          <div className="stagger-in grid gap-x-10 gap-y-22 md:grid-cols-2 xl:grid-cols-3">
            {layoutItems.map((item) => (
              <PortfolioGridCard key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        </section>

        <section id="journal" className="grid gap-8 border-y border-black/12 px-5 py-14 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-semibold uppercase tracking-tight text-[#777777]">Journal</p>
          <div className="grid gap-4 text-[clamp(2rem,5vw,5.6rem)] font-semibold uppercase leading-none text-[#111111]">
            <span>Hospitality</span>
            <span>Residence</span>
            <span>Retail</span>
          </div>
        </section>

        <section id="about" className="grid gap-8 px-5 py-16 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-semibold uppercase tracking-tight text-[#777777]">About</p>
          <p className="max-w-4xl text-[clamp(1.8rem,4vw,4.4rem)] font-semibold leading-[0.98] text-[#111111]">
            We design quiet spatial systems: clear plans, tactile material stories, and details built for real use.
          </p>
        </section>

        <footer id="contact" className="flex flex-col gap-5 border-t border-black/12 px-5 py-8 text-xs font-semibold uppercase tracking-tight text-[#777777] md:flex-row md:items-center md:justify-between md:px-8">
          <span>Bangkok / Phuket / Chiang Mai</span>
          <a className="transition hover:text-[#111111]" href="mailto:studio@beblanktobehindstudio.com">
            studio@beblanktobehindstudio.com
          </a>
        </footer>
      </main>
    </div>
  );
}

function PortfolioCanvasCard({ isEditing, item, index, navigate, onPointerDown, selected, setSelectedItemId }) {
  const layout = getPortfolioLayout(item, index);
  const style = {
    left: `${layout.x}%`,
    top: `${layout.y}%`,
    width: `${layout.width}%`,
    zIndex: layout.zIndex,
  };

  return (
    <article
      className={`group absolute text-left transition-all duration-1000 ease-studio-out ${
        isEditing && selected ? 'cursor-grab select-none outline outline-1 outline-black/50' : isEditing ? 'cursor-grab select-none' : ''
      }`}
      style={style}
      onPointerDown={(event) => onPointerDown(event, item, index, 'drag')}
    >
      <button
        className="block w-full text-left"
        type="button"
        onClick={(event) => {
          if (isEditing) {
            event.preventDefault();
            setSelectedItemId(item.id);
            return;
          }
          navigate(`/portfolio/${encodeURIComponent(item.id)}`);
        }}
      >
        <span className="block overflow-hidden rounded-sm">
          <img
            alt={item.title}
            className="w-full object-cover shadow-studioSoft transition-all duration-[1500ms] ease-studio-out group-hover:scale-[1.04] group-hover:opacity-[0.98] group-hover:shadow-premium"
            src={item.imageUrl}
            style={{
              height: `${layout.height}vh`,
              minHeight: '150px',
              objectPosition: getPortfolioImageObjectPosition(index),
            }}
          />
        </span>
        <div className="mt-3 max-w-full">
          <PortfolioCardMeta item={item} />
        </div>
      </button>
      {isEditing && selected && (
        <>
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <button
              key={corner}
              aria-label={`Resize ${item.title} ${corner}`}
              className={`absolute size-3 border border-black/60 bg-[#f3f3f0] ${
                corner.includes('n') ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'
              } ${corner.includes('w') ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'} ${
                corner === 'nw' || corner === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'
              }`}
              type="button"
              onPointerDown={(event) => onPointerDown(event, item, index, `resize-${corner}`)}
            />
          ))}
        </>
      )}
    </article>
  );
}

function PortfolioGridCard({ item, navigate }) {
  return (
    <button className="group text-left" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}>
      <div className="aspect-[4/5] overflow-hidden bg-[#e5e5e1] rounded-sm">
        <img
          alt={item.title}
          className="h-full w-full object-cover transition-all duration-[1500ms] ease-studio-out group-hover:scale-[1.05] group-hover:opacity-[0.9] filter grayscale group-hover:grayscale-0"
          src={item.imageUrl}
        />
      </div>
      <div className="mt-6">
        <PortfolioCardMeta item={item} />
      </div>
    </button>
  );
}

function HomepageEditPanel({
  backgroundColor,
  hasSelection,
  onAdd,
  onLayerChange,
  onRemove,
  onSave,
}) {
  return (
    <div className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,680px)] -translate-x-1/2 border border-black/15 bg-[#f3f3f0]/95 p-3 text-[10px] font-semibold uppercase tracking-tight text-[#111111] shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Background {backgroundColor}</span>
        <div className="flex flex-wrap items-center gap-2">
          <button className="border border-black/20 px-3 py-2 transition hover:border-black/70" type="button" onClick={onAdd}>
            Add
          </button>
          <button className="border border-black/20 px-3 py-2 transition hover:border-black/70" disabled={!hasSelection} type="button" onClick={() => onLayerChange('forward')}>
            Bring forward
          </button>
          <button className="border border-black/20 px-3 py-2 transition hover:border-black/70" disabled={!hasSelection} type="button" onClick={() => onLayerChange('backward')}>
            Send backward
          </button>
          <button className="border border-black/20 px-3 py-2 transition hover:border-black/70" disabled={!hasSelection} type="button" onClick={() => onLayerChange('front')}>
            Bring front
          </button>
          <button className="border border-black/20 px-3 py-2 transition hover:border-black/70" disabled={!hasSelection} type="button" onClick={() => onLayerChange('back')}>
            Send back
          </button>
          <button className="border border-black/20 px-3 py-2 transition hover:border-black/70" disabled={!hasSelection} type="button" onClick={onRemove}>
            Remove
          </button>
          <button className="border border-black px-3 py-2 transition hover:bg-[#111111] hover:text-[#f3f3f0]" type="button" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function PortfolioCardMeta({ item }) {
  return (
    <span className="grid gap-2 font-sans">
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-xl font-bold tracking-tight text-[#111111]">
          {item.title}
        </span>
        <span className="shrink-0 text-right text-[10px] font-bold uppercase tracking-widest text-[#777777]">
          {[item.year, item.areaSqm ? `${item.areaSqm} sqm` : ''].filter(Boolean).join(' / ')}
        </span>
      </span>
      <p className="text-sm font-medium text-[#777777]">
        {item.subtitle || item.description || item.location}
      </p>
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#adb5bd]">
        {[item.category, item.location].filter(Boolean).join(' • ')}
      </span>
    </span>
  );
}
