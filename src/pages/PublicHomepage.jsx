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
        <nav className="grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#111111]">
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>

          <div className="hidden lg:flex flex-wrap justify-center gap-x-12 gap-y-2">
            <button className="opacity-100" type="button" onClick={() => navigate('/work')}>WORK</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>ABOUT</button>
            <button className="opacity-40 hover:opacity-100" type="button" onClick={() => navigate('/')}>JOURNAL</button>
          </div>

          <div className="flex flex-wrap justify-end gap-x-8 lg:gap-x-12">
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
        {/* Asymmetrical Image-Led Hero */}
        <section className="relative min-h-[90vh] px-5 pt-48 pb-24 md:px-8">
          <div className="mx-auto max-w-screen-2xl">
            <div className="grid grid-cols-12 gap-8 items-start">
              <div className="col-span-12 lg:col-span-4 space-y-12">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-studio-muted">Bangkok / Architecture Studio</p>
                  <h1 className="text-4xl font-bold tracking-tight text-[#111111] leading-none">
                    Be Blank to <br /> Behind Studio
                  </h1>
                </div>
                <p className="max-w-xs text-sm font-medium leading-relaxed text-studio-muted">
                  Shaping spatial identities through silence, precision, and architectural intent.
                </p>
              </div>

              <div className="col-span-12 lg:col-span-8 relative min-h-[70vh]">
                <div className="absolute top-0 right-0 w-[55%] aspect-[4/5] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio group z-10">
                  <img
                    src="https://images.unsplash.com/photo-1600585154340-be6161a20a61?auto=format&fit=crop&q=80&w=1200"
                    alt="Atmosphere"
                    className="h-full w-full object-cover transition-transform duration-[4000ms] group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-studio-stone/10');
                    }}
                  />
                </div>
                <div className="absolute top-[20%] left-0 w-[45%] aspect-[1/1] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio group z-20">
                  <img
                    src="https://images.unsplash.com/photo-1600607687940-4e524cb35a36?auto=format&fit=crop&q=80&w=1200"
                    alt="Interior"
                    className="h-full w-full object-cover transition-transform duration-[4000ms] group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-studio-stone/10');
                    }}
                  />
                </div>
                <div className="absolute bottom-0 right-[20%] w-[35%] aspect-[3/2] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio group z-30">
                  <img
                    src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000"
                    alt="Architecture"
                    className="h-full w-full object-cover transition-transform duration-[4000ms] group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-studio-stone/10');
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Spatial Moments Section */}
        <section className="px-5 py-48 md:px-8">
          <div className="mx-auto max-w-screen-2xl">
            <div className="grid grid-cols-12 gap-y-32 gap-x-8">
              <div className="col-span-12 md:col-span-7">
                <div className="aspect-[16/10] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio group">
                  <img
                    src="https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&q=80&w=1200"
                    alt="Space Detail"
                    className="h-full w-full object-cover transition-transform duration-[3000ms] group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-studio-stone/10');
                    }}
                  />
                </div>
                <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-studio-muted/40">01 / Residential Study, Bangkok</p>
              </div>

              <div className="col-span-12 md:col-start-8 md:col-span-5 md:mt-64">
                <div className="aspect-[3/4] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio group">
                  <img
                    src="https://images.unsplash.com/photo-1600607687920-4e2c03cf179b?auto=format&fit=crop&q=80&w=1200"
                    alt="Material Interaction"
                    className="h-full w-full object-cover transition-transform duration-[3000ms] group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-studio-stone/10');
                    }}
                  />
                </div>
                <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-studio-muted/40">02 / Texture & Light</p>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Studio Philosophy */}
        <section id="about" className="mx-auto max-w-screen-2xl px-5 py-48 md:px-8">
          <div className="grid gap-24 md:grid-cols-12 items-baseline">
            <div className="md:col-span-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">Philosophy</span>
            </div>
            <div className="md:col-span-8">
              <p className="text-2xl font-medium leading-tight text-studio-ink tracking-tight max-w-2xl">
                Our approach is rooted in the belief that space should be a blank canvas for human experience—refined, intentional, and enduring. We design quiet spatial systems: clear plans, tactile material stories, and details built for real use.
              </p>
            </div>
          </div>
        </section>

        {/* Curated Selected Works */}
        <section id="work" className="px-5 py-48 md:px-8 bg-white border-y border-black/[0.03]">
          <div className="mx-auto max-w-screen-2xl">
            <div className="mb-32 flex items-end justify-between">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-muted">Selected Delivery</h2>
              <button
                onClick={() => navigate('/work')}
                className="text-[10px] font-bold uppercase tracking-widest text-studio-ink hover:opacity-50 transition-opacity pb-1 border-b border-black"
              >
                Full Archive &rarr;
              </button>
            </div>

            <div className="space-y-48">
              {featuredItems.slice(0, 3).map((item, i) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-16 items-center ${i % 2 === 1 ? 'direction-rtl' : ''}`}
                >
                  <div className={`col-span-12 md:col-span-8 ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                    <button
                      className="w-full aspect-[16/10] overflow-hidden rounded-sm bg-studio-stone/5 shadow-studio relative group"
                      onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
                    >
                      <img
                        alt={item.title}
                        className="h-full w-full object-cover transition-all duration-[1500ms] ease-studio-out group-hover:scale-105"
                        src={item.imageUrl}
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-studio-stone/10'); }}
                      />
                    </button>
                  </div>
                  <div className={`col-span-12 md:col-span-4 space-y-6 ${i % 2 === 1 ? 'md:order-1 text-right' : ''}`}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-studio-muted">Project 0{i + 1}</span>
                    <h3 className="text-3xl font-bold tracking-tight text-studio-ink">{item.title}</h3>
                    <p className="text-sm font-medium text-studio-muted leading-relaxed max-w-xs ml-auto mr-0">{item.description}</p>
                    <button
                      onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}
                      className="inline-block text-[10px] font-bold uppercase tracking-widest border-b border-black pb-1 hover:opacity-50"
                    >
                      View Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architectural Footer Band */}
        <footer className="bg-white px-5 py-32 md:px-8">
          <div className="mx-auto max-w-screen-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start pb-24 border-b border-black/[0.05]">
              <div className="space-y-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-studio-ink">Architecture / Interior / Objects</p>
                <p className="text-sm font-medium leading-relaxed text-studio-muted max-w-sm">
                  A Bangkok-based architecture and interior studio shaping spatial identities for hospitality, residential, and cultural work.
                </p>
              </div>
              <div className="space-y-8 md:text-right">
                <p className="text-sm font-medium text-studio-muted">
                  Selected works, project notes, and studio operations.
                </p>
                <button
                  onClick={() => navigate('/work')}
                  className="inline-block text-[10px] font-bold uppercase tracking-widest border border-black px-8 py-3 hover:bg-black hover:text-white transition-all"
                >
                  Full Portfolio
                </button>
              </div>
            </div>

            <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-bold uppercase tracking-widest text-studio-muted/40">
              <span>© 2024 BE BLANK TO BEHIND STUDIO</span>
              <div className="flex gap-12">
                <a href="mailto:studio@beblanktobehind.com" className="hover:text-studio-ink transition-colors">Contact</a>
                <a href="#" className="hover:text-studio-ink transition-colors">Instagram</a>
                <a href="#" className="hover:text-studio-ink transition-colors">Behance</a>
              </div>
            </div>
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
