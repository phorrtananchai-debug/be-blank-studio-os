import {
  ArrowLeft,
  CalendarPlus,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Download,
  FileJson,
  Image,
  LayoutDashboard,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from './components/Badge.jsx';
import { Button } from './components/Button.jsx';
import { EmptyState } from './components/EmptyState.jsx';
import { Field } from './components/Field.jsx';
import { LoginPage } from './components/LoginPage.jsx';
import { MetricCard } from './components/MetricCard.jsx';
import { SectionCard } from './components/SectionCard.jsx';
import { StatusSelect } from './components/StatusSelect.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { MobileDashboard } from './pages/MobileDashboard.jsx';
import { MobileLogin } from './pages/MobileLogin.jsx';
import {
  addCollectionItem,
  deleteCollectionItem,
  getFirebaseDebugInfo,
  isAllowedUser,
  isFirebaseConfigured,
  onStudioAuthChange,
  signInToStudio,
  signOutOfStudio,
  subscribeToCollection,
  updateCollectionItem,
} from './services/firebase.js';
import {
  createFirebaseProject,
  deleteFirebaseProject,
  subscribeToProjects,
  updateFirebaseProject,
} from './services/firebaseProjects.js';
import {
  contentStatuses,
  initialContentItems,
  initialPortfolioItems,
  platforms,
  projectStatuses,
} from './data/seed.js';
import {
  calculateTimeline,
  calculateProjectFinancials,
  createGoogleCalendarUrl,
  countByStatus,
  createContentItem,
  createPortfolioItem,
  createProject,
  downloadIcsCalendarEvent,
  downloadJson,
  formatDate,
  formatTHB,
} from './utils/dashboard.js';

const tabs = [
  { id: 'projects', label: 'Projects', icon: LayoutDashboard },
  { id: 'timeline', label: 'Timeline', icon: CalendarClock },
  { id: 'content', label: 'Content', icon: ClipboardCopy },
  { id: 'portfolio', label: 'Portfolio', icon: Image },
];

const drawingStatuses = ['draft', 'review', 'approved', 'issued'];
const firebaseDebugInfo = getFirebaseDebugInfo();
const HOMEPAGE_LAYOUT_STORAGE_KEY = 'beBlank.homepageLayout.v1';
const HOMEPAGE_BACKGROUND_STORAGE_KEY = 'beBlank.homepageBackground.v1';
const DEFAULT_HOMEPAGE_BACKGROUND = '#e9e8e4';

function getRoutePath() {
  return window.location.pathname || '/';
}

function isMobileDevice() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
}

function App() {
  const [routePath, setRoutePath] = useState(getRoutePath);
  const [publicPortfolioItems, setPublicPortfolioItems] = useState(initialPortfolioItems);

  useEffect(() => {
    const handleRouteChange = () => setRoutePath(getRoutePath());
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  useEffect(() => {
    if (routePath === '/' && isMobileDevice()) {
      window.history.replaceState({}, '', '/m');
      setRoutePath('/m');
    }
  }, [routePath]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setPublicPortfolioItems(initialPortfolioItems);
      return undefined;
    }

    try {
      return subscribeToCollection(
        'portfolioItems',
        (items) => setPublicPortfolioItems(items.length ? items : initialPortfolioItems),
        () => setPublicPortfolioItems(initialPortfolioItems),
      );
    } catch {
      setPublicPortfolioItems(initialPortfolioItems);
      return undefined;
    }
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoutePath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (routePath === '/m') {
    return <MobileStudioApp navigate={navigate} />;
  }

  if (routePath === '/os' || routePath === '/dashboard') {
    return <StudioOSApp navigate={navigate} />;
  }

  if (routePath.startsWith('/portfolio/')) {
    const portfolioId = decodeURIComponent(routePath.replace('/portfolio/', ''));
    return <PortfolioDetailPage item={publicPortfolioItems.find((item) => item.id === portfolioId)} navigate={navigate} />;
  }

  return <PublicHomepage portfolioItems={publicPortfolioItems} navigate={navigate} />;
}

function MobileStudioApp({ navigate }) {
  const [mobileUser, setMobileUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAuthMessage('Firebase is not configured.');
      setIsCheckingAuth(false);
      return undefined;
    }

    return onStudioAuthChange((user) => {
      setIsCheckingAuth(false);

      if (!user) {
        setMobileUser(null);
        return;
      }

      if (!isAllowedUser(user)) {
        setMobileUser(null);
        setAuthMessage('Access restricted');
        signOutOfStudio();
        return;
      }

      setMobileUser(user);
      setAuthMessage('');
    });
  }, []);

  const handleMobileSignIn = async () => {
    try {
      setAuthMessage('');
      const user = await signInToStudio();
      setMobileUser(user);
    } catch (error) {
      setAuthMessage(error.message?.toLowerCase().includes('not allowed') ? 'Access restricted' : error.message);
    }
  };

  const handleMobileSignOut = async () => {
    await signOutOfStudio();
    setMobileUser(null);
  };

  const previewMobileDashboard = () => {
    if (import.meta.env.DEV) {
      setMobileUser({ email: 'preview@local.dev' });
      setAuthMessage('');
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f5f5] px-5 text-[#111111]">
        <div className="text-center">
          <p className="whitespace-nowrap text-[15px] font-medium tracking-[0.03em]">Be blank to behind studio</p>
          <div className="mx-auto my-4 h-px w-10 bg-black/[0.18]" />
          <p className="text-sm tracking-[0.08em] text-[#777777]">Studio OS</p>
        </div>
      </main>
    );
  }

  if (!mobileUser) {
    return (
      <MobileLogin
        errorMessage={authMessage}
        onPreviewDashboard={previewMobileDashboard}
        onSignIn={handleMobileSignIn}
      />
    );
  }

  return (
    <MobileDashboard
      user={mobileUser}
      onOpenDesktop={() => navigate('/os')}
      onSignOut={handleMobileSignOut}
    />
  );
}

function StudioOSApp({ navigate }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [contentItems, setContentItems] = useLocalStorage('beBlank.content', initialContentItems);
  const [portfolioItems, setPortfolioItems] = useState(initialPortfolioItems);
  const [copiedId, setCopiedId] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [studioUser, setStudioUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [dataMode, setDataMode] = useState(isFirebaseConfigured() ? 'firebase-auth' : 'checking');
  const importInputRef = useRef(null);

  useEffect(() => {
    console.info('Firebase config debug', firebaseDebugInfo);
  }, []);

  useEffect(() => {
    if (!studioUser || !isFirebaseConfigured()) {
      return undefined;
    }

    let didSeedPortfolio = false;

    return subscribeToCollection(
      'portfolioItems',
      async (items) => {
        if (!items.length && !didSeedPortfolio) {
          didSeedPortfolio = true;
          await Promise.all(initialPortfolioItems.map((item) => addCollectionItem('portfolioItems', item)));
          return;
        }

        setPortfolioItems(items.length ? items : initialPortfolioItems);
      },
      () => setPortfolioItems(initialPortfolioItems),
    );
  }, [studioUser]);

  const statusCounts = useMemo(() => countByStatus(projects, projectStatuses), [projects]);
  const activeProjects = projects.filter((project) => project.status !== 'open').length;
  const nextOpening = [...projects]
    .filter((project) => project.openingDate)
    .sort((a, b) => new Date(a.openingDate) - new Date(b.openingDate))[0];
  const contentApproved = contentItems.filter((item) => item.status === 'approved').length;

  useEffect(() => {
    let isActive = true;
    let unsubscribeProjects = null;

    if (isFirebaseConfigured()) {
      const unsubscribeAuth = onStudioAuthChange((user) => {
        if (!isActive) {
          return;
        }

        if (!user) {
          setStudioUser(null);
          setDataMode('firebase-auth');
          setProjects([]);
          return;
        }

        if (!isAllowedUser(user)) {
          setStudioUser(null);
          setAuthMessage('This Google account is not allowed.');
          signOutOfStudio();
          setProjects([]);
          return;
        }

        setStudioUser(user);
        setAuthMessage('');
        setDataMode('firebase');

        unsubscribeProjects = subscribeToProjects(
          (firebaseProjects) => {
            setProjects(firebaseProjects);
            setDataMode('firebase');
          },
          () => {
            setDataMode('firebase-error');
            setAuthMessage('Could not read Firestore projects. Check Firebase rules and connection.');
          },
        );
      });

      return () => {
        isActive = false;
        unsubscribeProjects?.();
        unsubscribeAuth?.();
      };
    }

    setDataMode('firebase-auth');
    setAuthMessage('Firebase is not configured. Fill .env.local with VITE_FIREBASE_* values.');
    setProjects([]);

    return () => {
      isActive = false;
      unsubscribeProjects?.();
    };
  }, []);

  const handleFirebaseSignIn = async () => {
    try {
      setAuthMessage('');
      await signInToStudio();
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const handleFirebaseSignOut = async () => {
    await signOutOfStudio();
    setStudioUser(null);
  };

  if (!studioUser && dataMode === 'firebase-auth') {
    return <LoginPage errorMessage={authMessage} onBack={() => navigate('/')} onSignIn={handleFirebaseSignIn} />;
  }

  const updateProject = async (id, updates) => {
    if (!studioUser) {
      setAuthMessage('Sign in before updating Firestore projects.');
      return;
    }

    await updateFirebaseProject(id, updates);
  };

  const addProject = async () => {
    const project = createProject();

    if (!studioUser) {
      setAuthMessage('Sign in before creating Firestore projects.');
      return;
    }

    await createFirebaseProject(project);
  };

  const deleteProject = async (id) => {
    if (!studioUser) {
      setAuthMessage('Sign in before deleting Firestore projects.');
      return;
    }

    await deleteFirebaseProject(id);
  };

  const updateContent = (id, updates) => {
    setContentItems((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addPortfolio = async () => {
    if (!studioUser) {
      setAuthMessage('Sign in before creating portfolio items.');
      return;
    }

    await addCollectionItem('portfolioItems', createPortfolioItem());
  };

  const updatePortfolio = async (id, updates) => {
    if (!studioUser) {
      setAuthMessage('Sign in before updating portfolio items.');
      return;
    }

    await updateCollectionItem('portfolioItems', id, updates);
  };

  const deletePortfolio = async (id) => {
    if (!studioUser) {
      setAuthMessage('Sign in before deleting portfolio items.');
      return;
    }

    await deleteCollectionItem('portfolioItems', id);
  };

  const copyCaption = async (item) => {
    const text = `${item.captionTH}\n\n${item.captionEN}`.trim();
    await navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(''), 1400);
  };

  const exportBackup = () => {
    downloadJson('be-blank-studio-os-backup.json', {
      app: 'Be Blank Studio OS',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      contentItems,
      portfolioItems,
    });
    setBackupMessage('Backup exported');
    window.setTimeout(() => setBackupMessage(''), 1800);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.projects) || !Array.isArray(data.contentItems) || !Array.isArray(data.portfolioItems)) {
        throw new Error('Invalid backup file');
      }

      if (Array.isArray(data.projects) && studioUser) {
        await Promise.all(data.projects.map((project) => createFirebaseProject(project)));
      }
      setContentItems(data.contentItems);
      setPortfolioItems(data.portfolioItems);
      setBackupMessage('Backup restored');
    } catch {
      setBackupMessage('Import failed');
    } finally {
      event.target.value = '';
      window.setTimeout(() => setBackupMessage(''), 2200);
    }
  };

  return (
    <div className="os-dashboard-enter min-h-screen bg-[#e9e8e4] text-[#111111]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="grid gap-8 border-b border-black/[0.08] pb-8 xl:grid-cols-[minmax(0,1fr)_minmax(560px,0.85fr)] xl:items-end">
          <div>
            <button
              className="mb-6 text-xs font-medium uppercase tracking-[0.16em] text-[#111111] transition hover:text-[#777777]"
              type="button"
              onClick={() => navigate('/')}
            >
              ← Back to Site
            </button>
            <div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-studio-orange">
              <Sparkles size={18} />
              Studio Operations
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-[#111111] sm:text-5xl">
              Be Blank Studio OS
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-studio-muted">
              Internal command center for projects, timelines, content, and portfolio assets.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Active projects" value={activeProjects} />
            <MetricCard label="Approved posts" value={contentApproved} />
            <MetricCard label="Portfolio items" value={portfolioItems.length} />
            <MetricCard label="Next opening" value={nextOpening ? formatDate(nextOpening.openingDate) : 'TBD'} />
          </div>
        </header>

        <section className="flex flex-col gap-5 rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-5 shadow-studioSoft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-studio-orange">Local database</p>
            <p className="mt-1 text-sm text-studio-muted">
              Projects and portfolio sync from Firestore. Content keeps local backup tools.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={dataMode === 'firebase' ? 'safe' : 'medium'}>
              {dataMode === 'firebase'
                ? 'Firebase connected'
                : dataMode === 'firebase-error'
                  ? 'Firestore error'
                  : 'Firebase sign-in required'}
            </Badge>
            {isFirebaseConfigured() && studioUser && (
              <Button variant="secondary" onClick={handleFirebaseSignOut}>
                Sign Out
              </Button>
            )}
            {isFirebaseConfigured() && !studioUser && (
              <Button variant="secondary" onClick={handleFirebaseSignIn}>
                Sign In
              </Button>
            )}
            {authMessage && <span className="text-sm font-semibold text-red-700">{authMessage}</span>}
            {backupMessage && <span className="text-sm font-semibold text-studio-orange">{backupMessage}</span>}
            <input ref={importInputRef} accept="application/json" className="hidden" type="file" onChange={importBackup} />
            <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
              <Upload size={16} />
              Import Backup
            </Button>
            <Button onClick={exportBackup}>
              <FileJson size={16} />
              Export Backup
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-4 text-xs text-studio-muted shadow-studioSoft">
          <p className="mb-3 font-semibold uppercase tracking-[0.16em] text-studio-orange">Firebase Debug</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <span>apiKeyExists: {String(firebaseDebugInfo.apiKeyExists)}</span>
            <span>configSource: {firebaseDebugInfo.configSource}</span>
            <span>apiKeySuffix: {firebaseDebugInfo.apiKeySuffix || 'missing'}</span>
            <span>projectId: {firebaseDebugInfo.projectId || 'missing'}</span>
            <span>authDomain: {firebaseDebugInfo.authDomain || 'missing'}</span>
            <span>appIdExists: {String(firebaseDebugInfo.appIdExists)}</span>
            <span>storageBucket: {firebaseDebugInfo.storageBucket || 'missing'}</span>
          </div>
        </section>

        <nav className="grid grid-cols-2 gap-2 rounded-full border border-black/[0.08] bg-[#f3f2ee] p-2 shadow-studioSoft backdrop-blur sm:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition ${
                  isActive
                    ? 'bg-[#111111] text-[#f3f2ee] shadow-[0_12px_30px_rgba(0,0,0,0.06)]'
                    : 'text-studio-muted hover:bg-black/[0.04] hover:text-[#111111]'
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === 'projects' && (
          <ProjectDashboard
            projects={projects}
            statusCounts={statusCounts}
            onAdd={addProject}
            onDelete={deleteProject}
            onUpdate={updateProject}
          />
        )}

        {activeTab === 'timeline' && <TimelineCalculator projects={projects} onUpdate={updateProject} />}

        {activeTab === 'content' && (
          <ContentPlanner
            contentItems={contentItems}
            copiedId={copiedId}
            onAdd={() => setContentItems((items) => [createContentItem(), ...items])}
            onCopy={copyCaption}
            onDelete={(id) => setContentItems((items) => items.filter((item) => item.id !== id))}
            onUpdate={updateContent}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioManager
            portfolioItems={portfolioItems}
            onAdd={addPortfolio}
            onDelete={deletePortfolio}
            onExport={() => downloadJson('be-blank-portfolio.json', portfolioItems)}
            onUpdate={updatePortfolio}
          />
        )}
      </div>
    </div>
  );
}

function PublicHomepage({ portfolioItems, navigate }) {
  const featuredItems = portfolioItems.length ? portfolioItems : initialPortfolioItems;
  const [scrollProgress, setScrollProgress] = useState(0);
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
    if (!isFirebaseConfigured()) {
      return undefined;
    }

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
    if (!layoutInteraction) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const dx = event.clientX - layoutInteraction.startX;
      const dy = event.clientY - layoutInteraction.startY;
      const canvasWidth = canvas.getBoundingClientRect().width || 1;
      const dxPercent = (dx / canvasWidth) * 100;
      const canvasHeight = canvas.getBoundingClientRect().height || 1;
      const dyPercent = (dy / canvasHeight) * 100;

      setLayoutItems((items) =>
        items.map((item, index) => {
          if (item.id !== layoutInteraction.itemId) {
            return item;
          }

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

  const easedScrollProgress = easeOutCubic(scrollProgress);
  const titleStyle = {
    top: `clamp(86px, ${38 - easedScrollProgress * 28}vh, 38vh)`,
    opacity: clampNumber(1 - easedScrollProgress * 0.1, 0.9, 1),
    transform: `translateX(-50%) scale(${clampNumber(1 - easedScrollProgress * 0.38, 0.62, 1)})`,
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
    if (!isEditingLayout) {
      return;
    }

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
        if (item.id !== itemId) {
          return item;
        }

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
        className="fixed left-0 right-0 top-0 z-[100] border-b border-black/[0.05] bg-[#e9e8e4] px-5 py-4 backdrop-blur md:px-8"
        style={{ backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND }}
      >
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#111111]">
          <button className="justify-self-start text-left transition hover:text-[#777777]" type="button" onClick={() => navigate('/')}>
            BE BLANK
          </button>
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2">
            <a className="transition hover:text-[#777777]" href="#work">WORK</a>
            <a className="transition hover:text-[#777777]" href="#about">ABOUT</a>
            <a className="transition hover:text-[#777777]" href="#journal">JOURNAL</a>
          </div>
          <div className="flex flex-wrap justify-end gap-3 text-[10px] tracking-[0.14em]">
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
          className="mx-auto max-w-[96vw] whitespace-nowrap text-center text-[clamp(18px,5vw,72px)] font-medium uppercase text-[#111111] transition-[transform,top,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:text-[clamp(32px,5vw,72px)]"
          style={{
            letterSpacing: '0.03em',
            lineHeight: 1.05,
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          BE BLANK TO BEHIND STUDIO
        </h1>
      </div>

      <main className="bg-[#e9e8e4]" style={{ backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND }}>
        <section className="relative min-h-[138vh] bg-[#e9e8e4] px-5 pb-16 pt-24 md:px-8" style={{ backgroundColor: DEFAULT_HOMEPAGE_BACKGROUND }}>
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
            <p className="font-medium uppercase tracking-[0.14em] text-[#111111]">Architecture / Interior / Objects</p>
            <p className="max-w-2xl">
              A Bangkok-based architecture and interior studio shaping spatial identities for hospitality, residential,
              and cultural work.
            </p>
            <p className="md:text-right">Selected works, project notes, and studio operations.</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
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
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-[#111111]">Work</h2>
            <span className="text-xs uppercase tracking-[0.08em] text-[#777777]">Selected portfolio</span>
          </div>
          <div className="grid gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
            {layoutItems.map((item) => (
              <PortfolioGridCard key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        </section>

        <section id="journal" className="grid gap-8 border-y border-black/12 px-5 py-14 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#777777]">Journal</p>
          <div className="grid gap-4 text-[clamp(2rem,5vw,5.6rem)] font-semibold uppercase leading-none text-[#111111]">
            <span>Hospitality</span>
            <span>Residence</span>
            <span>Retail</span>
          </div>
        </section>

        <section id="about" className="grid gap-8 px-5 py-16 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#777777]">About</p>
          <p className="max-w-4xl text-[clamp(1.8rem,4vw,4.4rem)] font-semibold leading-[0.98] text-[#111111]">
            We design quiet spatial systems: clear plans, tactile material stories, and details built for real use.
          </p>
        </section>

        <footer id="contact" className="flex flex-col gap-5 border-t border-black/12 px-5 py-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#777777] md:flex-row md:items-center md:justify-between md:px-8">
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
      className={`group absolute text-left ${
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
        <span className="block overflow-hidden">
          <img
            alt={item.title}
            className="w-full object-cover shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition duration-200 ease-out group-hover:scale-[1.02] group-hover:opacity-[0.97]"
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
      <div className="aspect-[4/5] overflow-hidden bg-[#e5e5e1]">
        <img
          alt={item.title}
          className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.02] group-hover:opacity-[0.97]"
          src={item.imageUrl}
        />
      </div>
      <div className="mt-3">
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
    <div className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,680px)] -translate-x-1/2 border border-black/15 bg-[#f3f3f0]/95 p-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#111111] shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur">
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
    <span className="grid gap-2.5 font-sans">
      <span className="flex items-start justify-between gap-4">
        <span
          className="block"
          style={{
            color: '#111111',
            fontSize: 'clamp(24px, 2.5vw, 40px)',
            fontWeight: 500,
            letterSpacing: '0',
            lineHeight: 1,
          }}
        >
          {item.title}
        </span>
        <span className="shrink-0 pt-1 text-right text-[12px] font-normal tracking-[0.02em] text-[#777777]">
          {[item.year, item.areaSqm ? `${item.areaSqm} sqm` : ''].filter(Boolean).join(' / ')}
        </span>
      </span>
      <span className="text-[14px] font-light leading-[1.45] tracking-[0.02em] text-[#777777]">
        {item.subtitle || item.description || item.location}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#777777]">
        {[item.category, item.location].filter(Boolean).join(' / ')}
      </span>
    </span>
  );
}

function PortfolioDetailPage({ item, navigate }) {
  const portfolioItem = item || initialPortfolioItems[0];
  const gallery = getGalleryImages(portfolioItem);

  return (
    <div className="min-h-screen bg-[#12110f] text-[#d8d5cc]">
      <header className="flex items-center justify-between border-b border-[#d8d5cc]/18 px-5 py-5 text-xs font-black uppercase tracking-[0.22em] text-[#a9a49a] md:px-8">
        <button className="transition hover:text-[#d8d5cc]" type="button" onClick={() => navigate('/')}>
          projects
        </button>
        <button className="transition hover:text-[#d8d5cc]" type="button" onClick={() => navigate('/os')}>
          studio os
        </button>
      </header>
      <main>
        <section className="grid gap-10 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#777269]">{portfolioItem.category || 'Project'}</p>
            <h1 className="mt-4 text-[clamp(3.5rem,12vw,11rem)] font-black uppercase leading-[0.8] text-[#d8d5cc]">
              {portfolioItem.title}
            </h1>
          </div>
          <div className="grid content-end gap-5 text-sm leading-6 text-[#a9a49a]">
            <ProjectFact label="Client" value={portfolioItem.client} />
            <ProjectFact label="Location" value={portfolioItem.location} />
            <ProjectFact label="Year" value={portfolioItem.year} />
            <ProjectFact label="Area" value={portfolioItem.areaSqm ? `${portfolioItem.areaSqm} sqm` : ''} />
          </div>
        </section>

        <section className="px-5 md:px-8">
          <img alt={portfolioItem.title} className="max-h-[78vh] w-full object-cover" src={portfolioItem.imageUrl} />
        </section>

        <section className="grid gap-10 px-5 py-14 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#777269]">Design story</p>
          <div className="grid gap-8">
            <p className="max-w-4xl text-3xl font-black leading-tight text-[#d8d5cc] md:text-5xl">{portfolioItem.description}</p>
            <p className="max-w-3xl text-lg leading-8 text-[#a9a49a]">{portfolioItem.concept || portfolioItem.description}</p>
            {portfolioItem.credits && (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777269]">{portfolioItem.credits}</p>
            )}
          </div>
        </section>

        <section className="grid gap-4 px-5 pb-16 md:grid-cols-2 md:px-8">
          {gallery.map((imageUrl) => (
            <img key={imageUrl} alt={portfolioItem.title} className="aspect-[4/3] w-full object-cover" src={imageUrl} />
          ))}
        </section>
      </main>
    </div>
  );
}

function ProjectFact({ label, value }) {
  return (
    <div className="grid grid-cols-[90px_1fr] border-t border-[#d8d5cc]/18 pt-3">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#777269]">{label}</span>
      <span className="text-[#a9a49a]">{value || '-'}</span>
    </div>
  );
}

function getGalleryImages(item) {
  const gallery = String(item.galleryUrls || '')
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);

  return gallery.length ? gallery : [item.imageUrl].filter(Boolean);
}

function getPortfolioLayout(item, index) {
  const defaultLayouts = [
    { x: 7, y: 16, width: 24, height: 34, zIndex: 3 },
    { x: 70, y: 23, width: 18, height: 26, zIndex: 3 },
    { x: 18, y: 63, width: 15, height: 19, zIndex: 2 },
    { x: 57, y: 66, width: 22, height: 20, zIndex: 2 },
  ];
  const scatteredLayout = defaultLayouts[index % defaultLayouts.length];
  const defaultLayout = {
    ...scatteredLayout,
    y: scatteredLayout.y + Math.floor(index / defaultLayouts.length) * 6,
  };
  const hasLegacyPixelLayout = Number(item.y) > 100 || Number(item.height) > 100;
  const rawX = hasLegacyPixelLayout ? defaultLayout.x : normalizeLayoutPercent(item.x, defaultLayout.x);
  const rawY = hasLegacyPixelLayout ? defaultLayout.y : normalizeLayoutPercent(item.y, defaultLayout.y);
  const rawWidth = hasLegacyPixelLayout ? defaultLayout.width : normalizeLayoutPercent(item.width, defaultLayout.width);
  const rawHeight = hasLegacyPixelLayout ? defaultLayout.height : normalizeLayoutPercent(item.height, defaultLayout.height);
  const rawZIndex = hasLegacyPixelLayout ? defaultLayout.zIndex : toLayoutNumber(item.zIndex, defaultLayout.zIndex);

  return {
    x: clampNumber(rawX, 2, 84),
    y: clampNumber(rawY, 5, 78),
    width: clampNumber(rawWidth, 14, 42),
    height: clampNumber(rawHeight, 14, 48),
    zIndex: clampNumber(Math.round(rawZIndex), 1, 20),
  };
}

function getNextInteractionLayout(mode, initial, dxPercent, dyPercent) {
  if (mode === 'resize-se') {
    return {
      width: clampNumber(initial.width + dxPercent, 14, 42),
      height: clampNumber(initial.height + dyPercent, 14, 48),
    };
  }

  if (mode === 'resize-sw') {
    const width = clampNumber(initial.width - dxPercent, 14, 42);
    return {
      x: clampNumber(initial.x + (initial.width - width), 2, 84),
      width,
      height: clampNumber(initial.height + dyPercent, 14, 48),
    };
  }

  if (mode === 'resize-ne') {
    const height = clampNumber(initial.height - dyPercent, 14, 48);
    return {
      y: clampNumber(initial.y + (initial.height - height), 5, 78),
      width: clampNumber(initial.width + dxPercent, 14, 42),
      height,
    };
  }

  if (mode === 'resize-nw') {
    const width = clampNumber(initial.width - dxPercent, 14, 42);
    const height = clampNumber(initial.height - dyPercent, 14, 48);
    return {
      x: clampNumber(initial.x + (initial.width - width), 2, 84),
      y: clampNumber(initial.y + (initial.height - height), 5, 78),
      width,
      height,
    };
  }

  return {
    x: clampNumber(initial.x + dxPercent, 2, 84),
    y: clampNumber(initial.y + dyPercent, 5, 78),
  };
}

function getPortfolioImageObjectPosition(index) {
  return ['50% 44%', '58% 50%', '44% 60%', '52% 42%'][index % 4];
}

function stringifyLayout(layout) {
  return {
    x: String(Math.round(layout.x * 10) / 10),
    y: String(Math.round(layout.y * 10) / 10),
    width: String(Math.round(layout.width * 10) / 10),
    height: String(Math.round(layout.height * 10) / 10),
    zIndex: String(Math.round(layout.zIndex)),
  };
}

function getHomepageLayoutStore() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(HOMEPAGE_LAYOUT_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveHomepageLayout(layoutById) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(HOMEPAGE_LAYOUT_STORAGE_KEY, JSON.stringify(layoutById));
}

function getHomepageBackground() {
  if (typeof window === 'undefined') {
    return DEFAULT_HOMEPAGE_BACKGROUND;
  }

  return window.localStorage.getItem(HOMEPAGE_BACKGROUND_STORAGE_KEY) || DEFAULT_HOMEPAGE_BACKGROUND;
}

function saveHomepageBackground(backgroundColor) {
  if (typeof window === 'undefined') {
    return;
  }

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

function getMaxLayer(items) {
  return Math.max(1, ...items.map((item, index) => getPortfolioLayout(item, index).zIndex));
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(value) {
  const clampedValue = clampNumber(value, 0, 1);
  return 1 - Math.pow(1 - clampedValue, 3);
}

function normalizeLayoutPercent(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : fallback;
}

function toLayoutNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ProjectDashboard({ projects, statusCounts, onAdd, onDelete, onUpdate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      const searchableText = [project.name, project.client, project.location, project.notes, project.owner, project.blockers]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [projects, searchQuery, statusFilter]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const deleteProject = (id) => {
    if (selectedProjectId === id) {
      setSelectedProjectId('');
    }
    onDelete(id);
  };

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProjectId('')}
        onDelete={() => deleteProject(selectedProject.id)}
        onUpdate={(updates) => onUpdate(selectedProject.id, updates)}
      />
    );
  }

  return (
    <main className="grid gap-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {projectStatuses.map((status) => (
          <SectionCard key={status} compact>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">{status}</p>
              <Badge tone={status}>{status}</Badge>
            </div>
            <p className="mt-5 text-3xl font-extrabold text-[#111111]">{statusCounts[status]}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        action={
          <Button onClick={onAdd}>
            <Plus size={16} />
            New Project
          </Button>
        }
        eyebrow="Project Dashboard"
        title="Studio Pipeline"
      >
        <div className="mb-6 grid gap-3 rounded-lg border border-black/[0.08] bg-[#efeee9] p-4 lg:grid-cols-[1fr_240px]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">
              Search projects
            </span>
            <div className="flex min-h-11 items-center gap-3 rounded-lg border border-black/[0.08] bg-[#f3f2ee] px-3.5 focus-within:border-studio-orange focus-within:ring-2 focus-within:ring-studio-orange/15">
              <Search size={17} className="text-studio-muted" />
              <input
                className="h-10 w-full bg-transparent text-sm text-[#111111] outline-none placeholder:text-studio-muted/60"
                placeholder="Name, client, location, or notes"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">
              Filter status
            </span>
            <select
              className="h-11 w-full rounded-lg border border-black/[0.08] bg-[#f3f2ee] px-3.5 text-sm font-semibold capitalize text-[#111111] outline-none transition focus:border-studio-orange focus:bg-[#f7f6f2] focus:ring-2 focus:ring-studio-orange/15"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {projectStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {projects.length === 0 ? (
          <EmptyState message="No projects yet. Add the first project to begin tracking studio delivery." />
        ) : filteredProjects.length === 0 ? (
          <EmptyState message="No projects match the current search and status filter." />
        ) : (
          <div className="grid gap-6">
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className="cursor-pointer rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-5 shadow-studioSoft transition hover:border-studio-orange/25 hover:bg-[#f3f2ee]"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProjectId(project.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSelectedProjectId(project.id);
                  }
                }}
              >
                <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <input
                      aria-label="Project name"
                      className="w-full bg-transparent text-2xl font-bold text-[#111111] outline-none transition focus:text-studio-orange"
                      value={project.name}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onUpdate(project.id, { name: event.target.value })}
                    />
                    <p className="mt-1 text-sm text-studio-muted">
                      {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 lg:max-w-sm lg:justify-end">
                    <Badge tone={project.status}>{project.status}</Badge>
                    <Button variant="secondary" onClick={(event) => {
                      event.stopPropagation();
                      setSelectedProjectId(project.id);
                    }}>
                      Open Detail
                    </Button>
                    <button
                      aria-label="Delete project"
                      className="grid size-9 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteProject(project.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" onClick={(event) => event.stopPropagation()}>
                  <Field label="Client" value={project.client} onChange={(value) => onUpdate(project.id, { client: value })} />
                  <Field
                    label="Location"
                    value={project.location}
                    onChange={(value) => onUpdate(project.id, { location: value })}
                  />
                  <StatusSelect
                    label="Status"
                    options={projectStatuses}
                    value={project.status}
                    onChange={(value) => onUpdate(project.id, { status: value })}
                  />
                  <Field
                    label="Start date"
                    type="date"
                    value={project.startDate}
                    onChange={(value) => onUpdate(project.id, { startDate: value })}
                  />
                  <Field
                    label="Handover date"
                    type="date"
                    value={project.handoverDate}
                    onChange={(value) => onUpdate(project.id, { handoverDate: value })}
                  />
                  <Field
                    label="Opening date"
                    type="date"
                    value={project.openingDate}
                    onChange={(value) => onUpdate(project.id, { openingDate: value })}
                  />
                  <Field
                    label="Notes"
                    multiline
                    value={project.notes}
                    wrapperClassName="md:col-span-2 xl:col-span-2"
                    onChange={(value) => onUpdate(project.id, { notes: value })}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}

function ProjectDetailView({ project, onBack, onDelete, onUpdate }) {
  const timeline = calculateTimeline(project);
  const financials = calculateProjectFinancials(project);
  const siteLogs = Array.isArray(project.siteLogs) ? project.siteLogs : [];
  const addSiteLog = () => {
    onUpdate({
      siteLogs: [
        {
          id: `site-${crypto.randomUUID()}`,
          date: new Date().toISOString().slice(0, 10),
          notes: '',
          issues: '',
          imageLink: '',
        },
        ...siteLogs,
      ],
    });
  };
  const updateSiteLog = (id, updates) => {
    onUpdate({ siteLogs: siteLogs.map((log) => (log.id === id ? { ...log, ...updates } : log)) });
  };
  const deleteSiteLog = (id) => {
    onUpdate({ siteLogs: siteLogs.filter((log) => log.id !== id) });
  };
  const updatePricing = (updates) => {
    const nextProject = { ...project, ...updates };
    const shouldUseManualValue = Boolean(nextProject.useManualProjectValue);
    const automaticValue = (Number(nextProject.areaSqm) || 0) * (Number(nextProject.ratePerSqm) || 0);
    onUpdate({
      ...updates,
      ...(shouldUseManualValue ? {} : { projectValue: automaticValue ? String(automaticValue) : '' }),
    });
  };

  return (
    <main className="grid gap-7">
      <SectionCard
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-400/45 bg-red-500/10 px-4 text-sm font-bold text-red-700 transition hover:bg-red-500/15"
              type="button"
              onClick={onDelete}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        }
        eyebrow="Project Detail"
        title={project.name}
      >
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-black/[0.08] bg-[#efeee9] p-5">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge tone={project.status}>{project.status}</Badge>
              <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
              <p className="text-sm text-studio-muted">
                {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" value={project.name} onChange={(value) => onUpdate({ name: value })} />
              <Field label="Client" value={project.client} onChange={(value) => onUpdate({ client: value })} />
              <Field label="Location" value={project.location} onChange={(value) => onUpdate({ location: value })} />
              <Field label="Owner" value={project.owner || ''} onChange={(value) => onUpdate({ owner: value })} />
              <StatusSelect
                label="Status"
                options={projectStatuses}
                value={project.status}
                onChange={(value) => onUpdate({ status: value })}
              />
              <Field
                label="Start date"
                type="date"
                value={project.startDate}
                onChange={(value) => onUpdate({ startDate: value })}
              />
              <Field
                label="Design complete"
                type="date"
                value={project.designCompleteDate}
                onChange={(value) => onUpdate({ designCompleteDate: value })}
              />
              <Field
                label="Handover date"
                type="date"
                value={project.handoverDate}
                onChange={(value) => onUpdate({ handoverDate: value })}
              />
              <Field
                label="Opening date"
                type="date"
                value={project.openingDate}
                onChange={(value) => onUpdate({ openingDate: value })}
              />
              <Field
                label="Notes"
                multiline
                value={project.notes || ''}
                onChange={(value) => onUpdate({ notes: value })}
              />
              <Field
                label="Blocker"
                multiline
                value={project.blockers || ''}
                onChange={(value) => onUpdate({ blockers: value })}
              />
              <Field
                label="Next action"
                multiline
                value={project.nextAction || ''}
                wrapperClassName="sm:col-span-2"
                onChange={(value) => onUpdate({ nextAction: value })}
              />
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-lg border border-black/[0.08] bg-[#efeee9] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">Timeline</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-extrabold text-[#111111]">{timeline.progressPercent}%</p>
                  <p className="mt-1 text-sm text-studio-muted">delivery progress</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${timeline.riskTextClass}`}>{timeline.daysLeftToHandover}</p>
                  <p className="text-xs text-studio-muted">days left</p>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#f3f2ee]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${timeline.riskBarClass}`}
                  style={{ width: `${timeline.progressPercent}%` }}
                />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricCard label="Design" value={`${timeline.designDays}d`} />
                <MetricCard label="Construction" value={`${timeline.constructionDays}d`} />
                <div className={`rounded-lg border p-4 shadow-studioSoft ${timeline.riskClass}`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em]">Risk</p>
                  <p className="mt-2 text-2xl font-extrabold">{timeline.riskLevel}</p>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-black/[0.08] bg-[#efeee9] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">
                    Delivery pressure
                  </p>
                  <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-black/[0.08] bg-[#efeee9] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">Key dates</p>
              <KeyDate calendarLabel="Start date" label="Start" project={project} value={project.startDate} />
              <KeyDate label="Design complete" value={project.designCompleteDate} />
              <KeyDate calendarLabel="Handover date" label="Handover" project={project} value={project.handoverDate} />
              <KeyDate calendarLabel="Opening date" label="Opening" project={project} value={project.openingDate} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-lg border border-black/[0.08] bg-[#efeee9] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">
                  Profit and cost tracking
                </p>
                <p className="mt-1 text-sm text-studio-muted">Pricing, cost breakdown, and margin in THB.</p>
              </div>
              <ProfitStatusBadge status={financials.profitStatus} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Field
                label="Area sqm"
                type="number"
                value={project.areaSqm || ''}
                onChange={(value) => updatePricing({ areaSqm: value })}
              />
              <Field
                label="Rate / sqm"
                type="number"
                value={project.ratePerSqm || ''}
                onChange={(value) => updatePricing({ ratePerSqm: value })}
              />
              <label className="flex min-h-11 items-end gap-3 pb-2">
                <input
                  checked={Boolean(project.useManualProjectValue)}
                  className="size-4 accent-studio-orange"
                  type="checkbox"
                  onChange={(event) => updatePricing({ useManualProjectValue: event.target.checked })}
                />
                <span className="text-sm font-semibold text-studio-muted">Use manual project value</span>
              </label>
              <Field
                label="Project value"
                type="number"
                value={project.useManualProjectValue ? project.projectValue || '' : String(financials.automaticProjectValue || '')}
                disabled={!project.useManualProjectValue}
                onChange={(value) => onUpdate({ projectValue: value })}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceStat label="Project value" value={formatTHB(financials.projectValue)} />
              <FinanceStat label="Total cost" value={formatTHB(financials.totalCost)} />
              <FinanceStat label="Profit" value={formatTHB(financials.profit)} tone={financials.profitStatus} />
              <FinanceStat label="Margin" value={`${financials.marginPercent}%`} tone={financials.profitStatus} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Design cost"
                type="number"
                value={project.designCost || ''}
                onChange={(value) => onUpdate({ designCost: value })}
              />
              <Field
                label="Perspective cost"
                type="number"
                value={project.perspectiveCost || ''}
                onChange={(value) => onUpdate({ perspectiveCost: value })}
              />
              <Field
                label="Working drawing"
                type="number"
                value={project.workingDrawingCost || ''}
                onChange={(value) => onUpdate({ workingDrawingCost: value })}
              />
              <Field
                label="Revision cost"
                type="number"
                value={project.revisionCost || ''}
                onChange={(value) => onUpdate({ revisionCost: value })}
              />
              <Field
                label="Transport cost"
                type="number"
                value={project.transportCost || ''}
                onChange={(value) => onUpdate({ transportCost: value })}
              />
              <Field
                label="Site visit cost"
                type="number"
                value={project.siteVisitCost || ''}
                onChange={(value) => onUpdate({ siteVisitCost: value })}
              />
              <Field
                label="Misc cost"
                type="number"
                value={project.miscCost || ''}
                onChange={(value) => onUpdate({ miscCost: value })}
              />
              <FinanceStat label="Time cost" value={formatTHB(financials.timeCost)} />
              <Field
                label="Hours worked"
                type="number"
                value={project.hoursWorked || ''}
                onChange={(value) => onUpdate({ hoursWorked: value })}
              />
              <Field
                label="Hourly rate"
                type="number"
                value={project.hourlyRate || ''}
                onChange={(value) => onUpdate({ hourlyRate: value })}
              />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-studio-muted">Cost used against project value</span>
                <span className="text-sm font-bold text-[#111111]">
                  {financials.projectValue ? Math.round((financials.totalCost / financials.projectValue) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f3f2ee]">
                <div
                  className={`h-full rounded-full ${getProfitBarClass(financials.profitStatus)}`}
                  style={{
                    width: `${Math.min(financials.projectValue ? Math.round((financials.totalCost / financials.projectValue) * 100) : 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-black/[0.08] bg-[#efeee9] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">File control</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Drawing link"
                value={project.drawingLink || ''}
                onChange={(value) => onUpdate({ drawingLink: value })}
              />
              <Field
                label="Version"
                value={project.drawingVersion || ''}
                onChange={(value) => onUpdate({ drawingVersion: value })}
              />
              <StatusSelect
                label="Drawing status"
                options={drawingStatuses}
                value={project.drawingStatus || 'draft'}
                onChange={(value) => onUpdate({ drawingStatus: value })}
              />
              <div className="flex items-end">
                <Badge tone={project.drawingStatus || 'draft'}>{project.drawingStatus || 'draft'}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-black/[0.08] bg-[#efeee9] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">Site log</p>
              <p className="mt-1 text-sm text-studio-muted">Local notes, issues, and image references from site visits.</p>
            </div>
            <Button onClick={addSiteLog}>
              <Plus size={16} />
              Add Log
            </Button>
          </div>
          <div className="mt-5 grid gap-4">
            {siteLogs.length === 0 ? (
              <EmptyState message="No site logs yet. Add the first site update when work begins." />
            ) : (
              siteLogs.map((log) => (
                <article key={log.id} className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <Field
                      label="Date"
                      type="date"
                      value={log.date || ''}
                      wrapperClassName="w-full sm:w-48"
                      onChange={(value) => updateSiteLog(log.id, { date: value })}
                    />
                    <button
                      aria-label="Delete site log"
                      className="grid size-10 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
                      type="button"
                      onClick={() => deleteSiteLog(log.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field
                      label="Notes"
                      multiline
                      value={log.notes || ''}
                      onChange={(value) => updateSiteLog(log.id, { notes: value })}
                    />
                    <Field
                      label="Issues"
                      multiline
                      value={log.issues || ''}
                      onChange={(value) => updateSiteLog(log.id, { issues: value })}
                    />
                    <Field
                      label="Image link"
                      value={log.imageLink || ''}
                      onChange={(value) => updateSiteLog(log.id, { imageLink: value })}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </SectionCard>
    </main>
  );
}

function KeyDate({ calendarLabel, label, project, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.08] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-studio-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold text-[#111111]">{value ? formatDate(value) : 'TBD'}</span>
        {project && calendarLabel && value && <CalendarActions date={value} label={calendarLabel} project={project} />}
      </span>
    </div>
  );
}

function CalendarActions({ date, label, project }) {
  const openGoogleCalendar = () => {
    window.open(createGoogleCalendarUrl(project, date, label), '_blank', 'noopener,noreferrer');
  };

  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        aria-label={`Add ${label} to Google Calendar`}
        className="grid size-8 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-studio-orange hover:text-studio-orange"
        title="Add to Google Calendar"
        type="button"
        onClick={openGoogleCalendar}
      >
        <CalendarPlus size={15} />
      </button>
      <button
        aria-label={`Download ${label} ICS file`}
        className="grid size-8 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-studio-orange hover:text-studio-orange"
        title="Download .ics"
        type="button"
        onClick={() => downloadIcsCalendarEvent(project, date, label)}
      >
        <Download size={14} />
      </button>
    </span>
  );
}

function FinanceStat({ label, value, tone = 'neutral' }) {
  const toneClass = {
    healthy: 'text-emerald-700',
    watch: 'text-amber-700',
    loss: 'text-red-700',
    neutral: 'text-[#111111]',
  }[tone];

  return (
    <div className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">{label}</p>
      <p className={`mt-2 text-xl font-extrabold leading-tight ${toneClass}`}>{value}</p>
    </div>
  );
}

function ProfitStatusBadge({ status }) {
  const label = {
    healthy: 'Profit',
    watch: 'Low margin',
    loss: 'Loss',
  }[status];
  const tone = {
    healthy: 'low',
    watch: 'medium',
    loss: 'high',
  }[status];

  return <Badge tone={tone}>{label}</Badge>;
}

function getProfitBarClass(status) {
  if (status === 'loss') {
    return 'bg-red-400';
  }
  if (status === 'watch') {
    return 'bg-amber-300';
  }
  return 'bg-emerald-400';
}

function TimelineCalculator({ projects, onUpdate }) {
  const [viewMode, setViewMode] = useState('overview');
  const [expandedProjectIds, setExpandedProjectIds] = useState(() => new Set());

  const toggleExpanded = (projectId) => {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <main className="grid gap-6">
      <SectionCard
        action={
          <div className="grid grid-cols-2 gap-2 rounded-full border border-black/[0.08] bg-[#f3f2ee] p-1">
            {['overview', 'detail'].map((mode) => (
              <button
                key={mode}
                className={`h-9 rounded-full px-4 text-sm font-bold capitalize transition ${
                  viewMode === mode ? 'bg-[#111111] text-[#f3f2ee]' : 'text-studio-muted hover:bg-black/[0.04] hover:text-[#111111]'
                }`}
                type="button"
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        }
        eyebrow="Timeline"
        title={viewMode === 'overview' ? 'Project Timeline Overview' : 'Project Timeline Detail'}
      >
        {viewMode === 'overview' ? (
          <TimelineOverview projects={projects} />
        ) : (
          <TimelineDetail
            expandedProjectIds={expandedProjectIds}
            projects={projects}
            onToggleExpanded={toggleExpanded}
            onUpdate={onUpdate}
          />
        )}
      </SectionCard>
    </main>
  );
}

function TimelineOverview({ projects }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {projects.map((project) => {
        const timeline = calculateTimeline(project);

        return (
          <article key={project.id} className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-5 shadow-studioSoft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-extrabold text-[#111111]">{project.name}</h3>
                <p className="mt-1 text-sm leading-6 text-studio-muted">
                  {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Badge tone={project.status}>{project.status}</Badge>
                <Badge tone={timeline.riskLevel.toLowerCase()}>{timeline.riskLevel}</Badge>
                <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TimelineDate calendarLabel="Start date" label="Start" project={project} value={project.startDate} />
              <TimelineDate calendarLabel="Handover date" label="Handover" project={project} value={project.handoverDate} />
              <TimelineDate calendarLabel="Opening date" label="Opening" project={project} value={project.openingDate} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">Total project days</p>
                <p className="mt-1 text-2xl font-extrabold text-[#111111]">{timeline.totalProjectDays}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">Days to opening</p>
                <p className={`mt-1 text-2xl font-extrabold ${timeline.riskTextClass}`}>{timeline.daysRemainingToOpening}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-studio-muted">Progress</span>
                <span className="text-xs font-bold text-[#111111]">{timeline.progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f3f2ee]">
                <div className={`h-full rounded-full ${timeline.riskBarClass}`} style={{ width: `${timeline.progressPercent}%` }} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TimelineDetail({ expandedProjectIds, projects, onToggleExpanded, onUpdate }) {
  return (
    <div className="grid gap-4">
      {projects.map((project) => {
        const isExpanded = expandedProjectIds.has(project.id);
        const timeline = calculateTimeline(project);
        const phases = getTimelinePhases(project, timeline);

        return (
          <article key={project.id} className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] shadow-studioSoft">
            <button
              className="flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between"
              type="button"
              onClick={() => onToggleExpanded(project.id)}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-black/[0.08] bg-[#efeee9] text-studio-orange">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-extrabold text-[#111111]">{project.name}</h3>
                  <p className="mt-1 text-sm text-studio-muted">
                    {project.client || 'Client TBD'} / {project.location || 'Location TBD'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Badge tone={project.status}>{project.status}</Badge>
                <Badge tone={timeline.riskLevel.toLowerCase()}>{timeline.riskLevel}</Badge>
                <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-black/[0.08] p-5">
                <div className="grid gap-3">
                  {phases.map((phase) => (
                    <div
                      key={phase.name}
                      className="grid gap-3 rounded-lg border border-black/[0.08] bg-[#efeee9] p-4 sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#111111]">{phase.name}</p>
                        <p className="mt-1 text-xs text-studio-muted">{phase.range}</p>
                      </div>
                      <p className="text-lg font-extrabold text-studio-orange">{phase.duration}d</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <Field
                    label="Notes"
                    multiline
                    value={project.notes || ''}
                    onChange={(value) => onUpdate(project.id, { notes: value })}
                  />
                  <Field
                    label="Blocker"
                    multiline
                    value={project.blockers || ''}
                    onChange={(value) => onUpdate(project.id, { blockers: value })}
                  />
                  <Field
                    label="Next action"
                    multiline
                    value={project.nextAction || ''}
                    onChange={(value) => onUpdate(project.id, { nextAction: value })}
                  />
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function TimelineDate({ calendarLabel, label, project, value }) {
  return (
    <div className="rounded-lg border border-black/[0.08] bg-[#efeee9] p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#111111]">{value ? formatDate(value) : 'TBD'}</p>
        {project && calendarLabel && value && <CalendarActions date={value} label={calendarLabel} project={project} />}
      </div>
    </div>
  );
}

function getTimelinePhases(project, timeline) {
  return [
    {
      name: 'Design',
      duration: timeline.designDays,
      range: formatPhaseRange(project.startDate, project.designCompleteDate),
    },
    {
      name: 'Construction',
      duration: timeline.constructionDays,
      range: formatPhaseRange(project.designCompleteDate, project.handoverDate),
    },
    {
      name: 'Handover',
      duration: project.handoverDate ? 1 : 0,
      range: project.handoverDate ? formatDate(project.handoverDate) : 'TBD',
    },
    {
      name: 'Training / Setup',
      duration: timeline.handoverToOpeningDays,
      range: formatPhaseRange(project.handoverDate, project.openingDate),
    },
    {
      name: 'Opening',
      duration: project.openingDate ? 1 : 0,
      range: project.openingDate ? formatDate(project.openingDate) : 'TBD',
    },
  ];
}

function formatPhaseRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'TBD';
  }

  return `${startDate ? formatDate(startDate) : 'TBD'} - ${endDate ? formatDate(endDate) : 'TBD'}`;
}

function ContentPlanner({ contentItems, copiedId, onAdd, onCopy, onDelete, onUpdate }) {
  return (
    <SectionCard
      action={
        <Button onClick={onAdd}>
          <Plus size={16} />
          New Post
        </Button>
      }
      eyebrow="Content Planner"
      title="Studio Publishing Queue"
    >
      <div className="grid gap-6">
        {contentItems.map((item) => (
          <article key={item.id} className="rounded-lg border border-black/[0.08] bg-[#f3f2ee] p-5 shadow-studioSoft">
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <Field
                label="Post title"
                value={item.title}
                wrapperClassName="lg:flex-1"
                onChange={(value) => onUpdate(item.id, { title: value })}
              />
              <div className="flex flex-wrap items-end gap-3">
                <Button variant="secondary" onClick={() => onCopy(item)}>
                  <ClipboardCopy size={16} />
                  {copiedId === item.id ? 'Copied' : 'Copy Caption'}
                </Button>
                <button
                  aria-label="Delete post"
                  className="grid size-10 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
                  type="button"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-5 flex flex-wrap gap-3">
              <Badge tone={item.status}>{item.status}</Badge>
              <Badge tone="default">{item.platform}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <StatusSelect
                label="Platform"
                options={platforms}
                value={item.platform}
                onChange={(value) => onUpdate(item.id, { platform: value })}
              />
              <StatusSelect
                label="Status"
                options={contentStatuses}
                value={item.status}
                onChange={(value) => onUpdate(item.id, { status: value })}
              />
              <Field
                label="Caption TH"
                multiline
                value={item.captionTH}
                onChange={(value) => onUpdate(item.id, { captionTH: value })}
              />
              <Field
                label="Caption EN"
                multiline
                value={item.captionEN}
                onChange={(value) => onUpdate(item.id, { captionEN: value })}
              />
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function PortfolioManager({ portfolioItems, onAdd, onDelete, onExport, onUpdate }) {
  return (
    <SectionCard
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onExport}>
            <Download size={16} />
            Export JSON
          </Button>
          <Button onClick={onAdd}>
            <Plus size={16} />
            New Item
          </Button>
        </div>
      }
      eyebrow="Portfolio Manager"
      title="Selected Works"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {portfolioItems.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-lg border border-black/[0.08] bg-[#f3f2ee] shadow-studioSoft">
            <div className="aspect-[16/9] bg-studio-black">
              {item.imageUrl ? (
                <img alt={item.title} className="h-full w-full object-cover" src={item.imageUrl} />
              ) : (
                <div className="grid h-full place-items-center text-studio-muted">
                  <Image size={38} />
                </div>
              )}
            </div>
            <div className="grid gap-4 p-5">
              <div className="flex items-start gap-4">
                <Field
                  label="Project title"
                  value={item.title}
                  wrapperClassName="flex-1"
                  onChange={(value) => onUpdate(item.id, { title: value })}
                />
                <button
                  aria-label="Delete portfolio item"
                  className="mt-7 grid size-10 place-items-center rounded-full border border-black/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
                  type="button"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Category"
                  value={item.category}
                  onChange={(value) => onUpdate(item.id, { category: value })}
                />
                <Field label="Location" value={item.location || ''} onChange={(value) => onUpdate(item.id, { location: value })} />
                <Field label="Client" value={item.client || ''} onChange={(value) => onUpdate(item.id, { client: value })} />
                <Field label="Year" value={item.year || ''} onChange={(value) => onUpdate(item.id, { year: value })} />
                <Field label="Area / sqm" value={item.areaSqm || ''} onChange={(value) => onUpdate(item.id, { areaSqm: value })} />
                <Field label="Cover image URL" value={item.imageUrl || ''} onChange={(value) => onUpdate(item.id, { imageUrl: value })} />
              </div>
              <Field label="Subtitle" value={item.subtitle || ''} onChange={(value) => onUpdate(item.id, { subtitle: value })} />
              <Field
                label="Gallery image URLs"
                multiline
                value={item.galleryUrls || ''}
                onChange={(value) => onUpdate(item.id, { galleryUrls: value })}
              />
              <Field
                label="Description"
                multiline
                value={item.description}
                onChange={(value) => onUpdate(item.id, { description: value })}
              />
              <Field
                label="Design story / concept"
                multiline
                value={item.concept || ''}
                onChange={(value) => onUpdate(item.id, { concept: value })}
              />
              <Field label="Credits" value={item.credits || ''} onChange={(value) => onUpdate(item.id, { credits: value })} />
              <Field label="Tags" value={item.tags} onChange={(value) => onUpdate(item.id, { tags: value })} />
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">Homepage card layout</p>
                <div className="grid gap-4 sm:grid-cols-5">
                  <Field label="X %" value={item.x || ''} onChange={(value) => onUpdate(item.id, { x: value })} />
                  <Field label="Y %" value={item.y || ''} onChange={(value) => onUpdate(item.id, { y: value })} />
                  <Field label="Width %" value={item.width || ''} onChange={(value) => onUpdate(item.id, { width: value })} />
                  <Field label="Height %" value={item.height || ''} onChange={(value) => onUpdate(item.id, { height: value })} />
                  <Field label="Z index" value={item.zIndex || ''} onChange={(value) => onUpdate(item.id, { zIndex: value })} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export default App;
