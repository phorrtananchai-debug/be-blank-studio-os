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
const DEFAULT_HOMEPAGE_BACKGROUND = '#f8f9fa';

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

  const canSaveToFirebase = Boolean(publicUser && isFirebaseConfigured());
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
    <div className="min-h-screen bg-[#f8f9fa] text-studio-ink selection:bg-studio-ink/10">
      <header className="fixed left-0 right-0 top-0 z-[100] bg-white/80 px-5 py-6 backdrop-blur-md md:px-8 border-b border-black/[0.03]">
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#111111]">
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-2">
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/work')}>WORK</button>
            <button className="opacity-100" type="button" onClick={() => navigate('/')}>ABOUT</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>JOURNAL</button>
          </div>
          <div className="flex flex-wrap justify-end gap-6 tracking-tight">
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

      <main className="page-fade">
        {/* Asymmetrical Hero Section */}
        <section className="relative flex min-h-screen items-center px-5 pt-32 pb-24 md:px-8">
          <div className="mx-auto grid w-full max-w-screen-2xl items-center gap-16 md:grid-cols-12">
            <div className="md:col-span-7 lg:col-span-6 space-y-10">
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-studio-muted">Bangkok / Architecture Studio</span>
                <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-[#111111] md:text-7xl lg:text-8xl">
                  Be Blank to <br /> Behind Studio
                </h1>
              </div>
              <p className="max-w-md text-lg font-medium leading-relaxed text-studio-muted md:text-xl">
                Shaping spatial identities through silence, precision, and architectural intent.
              </p>
              <div className="pt-8">
                <button
                  onClick={() => navigate('/work')}
                  className="group flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-studio-ink"
                >
                  <span className="h-px w-8 bg-studio-ink transition-all group-hover:w-12" />
                  Explore Projects
                </button>
              </div>
            </div>

            <div className="md:col-span-5 lg:col-span-6">
              <div className="aspect-[3/4] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio relative group">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a20a61?auto=format&fit=crop&q=80&w=1200"
                  alt="Atmosphere"
                  className="h-full w-full object-cover grayscale brightness-110 transition-transform duration-[3000ms] group-hover:scale-105"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('bg-studio-stone/10');
                  }}
                />
                <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />
              </div>
              <div className="mt-4 flex justify-end">
                <span className="text-[9px] font-bold uppercase tracking-widest text-studio-muted/40 italic">01 / Material Study, Bangkok</span>
              </div>
            </div>
          </div>
        </section>

        {/* Spatial Narrative Section 1 */}
        <section id="about" className="mx-auto max-w-screen-2xl px-5 py-48 md:px-8">
          <div className="grid gap-24 md:grid-cols-12 items-end">
            <div className="md:col-span-4 space-y-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">Philosophy</span>
              <p className="text-sm font-medium leading-relaxed text-studio-muted">
                Our approach is rooted in the belief that space should be a blank canvas for human experience—refined, intentional, and enduring. We design quiet spatial systems: clear plans, tactile material stories, and details built for real use.
              </p>
            </div>
            <div className="md:col-span-8">
              <h2 className="text-3xl font-bold leading-tight text-studio-ink md:text-5xl lg:text-6xl tracking-tight max-w-3xl">
                We believe in the tension between raw structure and refined detail.
              </h2>
            </div>
          </div>
        </section>

        {/* Spatial Rhythm: Overlapping Images */}
        <section className="px-5 py-24 md:px-8">
          <div className="mx-auto max-w-screen-2xl relative min-h-[80vh]">
            <div className="md:absolute md:top-0 md:left-0 md:w-1/2 aspect-[16/10] overflow-hidden rounded-sm bg-studio-stone/5 shadow-premium z-10 group">
              <img
                src="https://images.unsplash.com/photo-1600607687940-4e524cb35a36?auto=format&fit=crop&q=80&w=1200"
                alt="Architecture 1"
                className="h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-studio-stone/10'); }}
              />
            </div>
            <div className="mt-12 md:mt-0 md:absolute md:bottom-0 md:right-0 md:w-[45%] aspect-[4/5] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio group">
              <img
                src="https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&q=80&w=1200"
                alt="Architecture 2"
                className="h-full w-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-studio-stone/10'); }}
              />
            </div>
            <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-64 bg-black/[0.05]" />
          </div>
        </section>

        {/* Narrative Section 2 */}
        <section className="mx-auto max-w-7xl px-5 py-48 md:px-8">
          <div className="grid gap-16 md:grid-cols-2 items-center">
            <div className="space-y-12">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">Precision & Delivery</h3>
               <div className="space-y-8">
                 <h4 className="text-2xl font-bold tracking-tight md:text-4xl">Technical delivery is as critical as the conceptual spark.</h4>
                 <p className="text-lg font-medium text-studio-muted leading-relaxed">
                   We curate light and texture to evoke emotion without noise. Every line matters, from the initial sketch to the final construction detail.
                 </p>
               </div>
            </div>
            <div className="md:pl-24">
               <div className="h-64 w-px bg-black/[0.08] mx-auto md:mx-0" />
            </div>
          </div>
        </section>

        {/* Selected Works: Editorial Layout */}
        <section id="work" className="px-5 py-48 md:px-8 bg-white">
          <div className="mx-auto max-w-screen-2xl">
            <div className="mb-32 flex items-end justify-between border-b border-black/[0.03] pb-12">
              <h2 className="text-4xl font-bold tracking-tight text-studio-ink">Selected <br /> Delivery</h2>
              <button
                onClick={() => navigate('/work')}
                className="text-[10px] font-bold uppercase tracking-widest text-studio-ink hover:opacity-50 transition-opacity"
              >
                Archive &rarr;
              </button>
            </div>

            <div className="space-y-64">
              {featuredItems.slice(0, 3).map((item, i) => (
                <div
                  key={item.id}
                  className={`flex flex-col md:flex-row gap-16 items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
                >
                  <button
                    className="w-full md:w-2/3 aspect-[16/10] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio relative group"
                    onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
                  >
                    <img
                      alt={item.title}
                      className="h-full w-full object-cover transition-all duration-[1500ms] ease-studio-out group-hover:scale-105"
                      src={item.imageUrl}
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-studio-stone/10'); }}
                    />
                  </button>
                  <div className="w-full md:w-1/3 space-y-6">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-studio-muted">Project 0{i + 1}</span>
                    <div className="space-y-4">
                       <h3 className="text-3xl font-bold tracking-tight text-studio-ink">{item.title}</h3>
                       <p className="text-sm font-medium text-studio-muted leading-relaxed line-clamp-4">{item.description}</p>
                    </div>
                    <button
                       onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
                       className="text-[10px] font-bold uppercase tracking-widest border-b border-black pb-1 hover:text-studio-muted hover:border-black/20 transition-all"
                    >
                       View Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="border-t border-black/[0.08] bg-white px-5 py-32 text-center md:px-8">
          <div className="mx-auto max-w-4xl space-y-16">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Stay in silence.</h2>
            <div className="flex flex-col items-center gap-12">
               <button
                  onClick={() => navigate('/work')}
                  className="rounded-full border border-black px-12 py-4 text-[10px] font-bold uppercase tracking-widest transition hover:bg-black hover:text-white"
                >
                  Full Portfolio
                </button>
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-ink">Architecture / Interior / Objects</p>
                  <p className="text-sm font-medium text-studio-muted">Bangkok / Phuket / Chiang Mai</p>
                </div>
            </div>
          </div>
          <div className="mt-48 flex flex-col gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted/30 md:flex-row md:items-center md:justify-between border-t border-black/[0.03] pt-12">
            <span>© 2024 BE BLANK TO BEHIND</span>
            <a className="transition hover:text-studio-ink" href="mailto:studio@beblanktobehindstudio.com">
              studio@beblanktobehindstudio.com
            </a>
            <span className="flex gap-4">
              <a href="#" className="hover:text-studio-ink transition-colors">Instagram</a>
              <a href="#" className="hover:text-studio-ink transition-colors">Behance</a>
            </span>
          </div>
        </footer>
      </main>

      {isEditingLayout && (
        <div className="fixed inset-0 z-[200] pointer-events-none opacity-0">
          <div ref={canvasRef} />
          {layoutItems.map((item, index) => (
             <PortfolioCanvasCard
               key={item.id}
               item={item}
               index={index}
               isEditing={isEditingLayout}
               navigate={navigate}
               onLayerChange={updateItemLayer}
               onPointerDown={beginLayoutInteraction}
               onRemove={removeHomepageWork}
               selected={selectedItemId === item.id}
               setSelectedItemId={setSelectedItemId}
             />
          ))}
          <HomepageEditPanel
            backgroundColor={backgroundColor}
            hasSelection={Boolean(selectedItem)}
            onAdd={addHomepageWork}
            onLayerChange={(action) => selectedItem && updateItemLayer(selectedItem.id, action)}
            onRemove={() => selectedItem && removeHomepageWork(selectedItem.id)}
            onSave={saveLayout}
          />
        </div>
      )}
      {publicAuthMessage && <div className="fixed bottom-4 left-4 z-[300] bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold">{publicAuthMessage}</div>}
      {saveMessage && <div className="fixed bottom-4 left-4 z-[300] bg-studio-ink text-white px-4 py-2 rounded-lg text-xs font-bold">{saveMessage}</div>}
    </div>
  );
}

export function PortfolioCanvasCard({ isEditing, item, index, navigate, onPointerDown, selected, setSelectedItemId }) {
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

export function PortfolioGridCard({ item, navigate }) {
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

export function PortfolioCardMeta({ item }) {
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
