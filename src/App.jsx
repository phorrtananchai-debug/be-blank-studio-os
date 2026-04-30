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
import { MetricCard } from './components/MetricCard.jsx';
import { SectionCard } from './components/SectionCard.jsx';
import { StatusSelect } from './components/StatusSelect.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
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
const SOCIAL_LINKS = {
  instagram: '',
  facebook: '',
};

function getRoutePath() {
  return window.location.pathname || '/';
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

  if (routePath === '/os' || routePath === '/dashboard') {
    return <StudioOSApp navigate={navigate} />;
  }

  if (routePath.startsWith('/portfolio/')) {
    const portfolioId = decodeURIComponent(routePath.replace('/portfolio/', ''));
    return <PortfolioDetailPage item={publicPortfolioItems.find((item) => item.id === portfolioId)} navigate={navigate} />;
  }

  return <PublicHomepage portfolioItems={publicPortfolioItems} navigate={navigate} />;
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
    <div className="min-h-screen bg-studio-black text-studio-ink">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(255,136,0,0.12),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(200,155,60,0.07),transparent_28%),linear-gradient(135deg,#0b0b0b_0%,#101010_48%,#050505_100%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-9 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="grid gap-8 border-b border-white/[0.08] pb-8 xl:grid-cols-[minmax(0,1fr)_minmax(560px,0.85fr)] xl:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.34em] text-studio-orange">
              <Sparkles size={18} />
              Studio Operations
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-normal text-white sm:text-5xl">
              Be Blank Studio OS
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-studio-muted">
              Internal command center for projects, timelines, content, and portfolio assets.
            </p>
            <button
              className="mt-5 text-xs font-bold uppercase tracking-[0.24em] text-studio-orange transition hover:text-white"
              type="button"
              onClick={() => navigate('/')}
            >
              Public portfolio
            </button>
          </div>
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Active projects" value={activeProjects} />
            <MetricCard label="Approved posts" value={contentApproved} />
            <MetricCard label="Portfolio items" value={portfolioItems.length} />
            <MetricCard label="Next opening" value={nextOpening ? formatDate(nextOpening.openingDate) : 'TBD'} />
          </div>
        </header>

        <section className="flex flex-col gap-5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-5 shadow-studioSoft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-studio-orange">Local database</p>
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
            {authMessage && <span className="text-sm font-semibold text-red-200">{authMessage}</span>}
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

        <section className="rounded-lg border border-white/[0.08] bg-black/20 p-4 text-xs text-studio-muted">
          <p className="mb-3 font-bold uppercase tracking-[0.2em] text-studio-orange">Firebase Debug</p>
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

        <nav className="grid grid-cols-2 gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-2 shadow-studioSoft backdrop-blur sm:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition ${
                  isActive
                    ? 'bg-studio-orange text-black shadow-[0_8px_22px_rgba(255,136,0,0.12)]'
                    : 'text-studio-muted hover:bg-white/[0.055] hover:text-white'
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
  const [layoutItems, setLayoutItems] = useState(featuredItems);
  const [publicUser, setPublicUser] = useState(null);
  const [publicAuthMessage, setPublicAuthMessage] = useState('');
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [layoutInteraction, setLayoutInteraction] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isEditingLayout) {
      setLayoutItems(featuredItems);
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
      setScrollProgress(Math.min(window.scrollY / 520, 1));
    };

    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollProgress);
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

      setLayoutItems((items) =>
        items.map((item, index) => {
          if (item.id !== layoutInteraction.itemId) {
            return item;
          }

          const initial = layoutInteraction.initialLayout;
          const nextLayout =
            layoutInteraction.mode === 'resize'
              ? {
                  width: clampNumber(initial.width + dxPercent, 16, 70),
                  height: clampNumber(initial.height + dy, 180, 760),
                }
              : {
                  x: clampNumber(initial.x + dxPercent, 0, 78),
                  y: Math.max(0, initial.y + dy),
                };

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
    opacity: 1 - scrollProgress * 0.25,
    transform: `scale(${1 - scrollProgress * 0.46})`,
  };
  const canEditLayout = Boolean(publicUser);
  const canvasHeight = getPortfolioCanvasHeight(layoutItems);

  const handlePublicSignIn = async () => {
    try {
      setPublicAuthMessage('');
      await signInToStudio();
    } catch (error) {
      setPublicAuthMessage(error.message);
    }
  };

  const handlePublicSignOut = async () => {
    await signOutOfStudio();
    setPublicUser(null);
    setIsEditingLayout(false);
  };

  const beginLayoutInteraction = (event, item, index, mode) => {
    if (!isEditingLayout) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setLayoutInteraction({
      itemId: item.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialLayout: getPortfolioLayout(item, index),
    });
  };

  const saveLayout = async () => {
    if (!canEditLayout) {
      setPublicAuthMessage('Sign in with the studio account before saving layout.');
      return;
    }

    await Promise.all(
      layoutItems.map((item, index) =>
        addCollectionItem('portfolioItems', {
          ...item,
          ...stringifyLayout(getPortfolioLayout(item, index)),
        }),
      ),
    );
    setSaveMessage('Layout saved');
    window.setTimeout(() => setSaveMessage(''), 1600);
  };

  return (
    <div className="min-h-screen bg-[#12110f] text-[#d8d5cc]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#d8d5cc]/10 bg-[#12110f]/82 px-5 py-4 backdrop-blur md:px-8">
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a9a49a]">
          <a className="justify-self-start transition hover:text-[#d8d5cc]" href="#contact">
            contact
          </a>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <a className="transition hover:text-[#d8d5cc]" href="#projects">[projects]</a>
            <a className="transition hover:text-[#d8d5cc]" href="#collections">collections</a>
            <a className="transition hover:text-[#d8d5cc]" href="#archives">archives</a>
            <a className="transition hover:text-[#d8d5cc]" href="#about">about</a>
          </div>
          <div className="flex justify-end gap-4">
            <a className="transition hover:text-[#d8d5cc]" href={SOCIAL_LINKS.instagram || '#instagram'}>instagram</a>
            <a className="transition hover:text-[#d8d5cc]" href={SOCIAL_LINKS.facebook || '#facebook'}>facebook</a>
          </div>
        </nav>
      </header>

      <main>
        <section className="min-h-[118vh] px-5 pb-10 pt-24 text-center md:px-8 md:pb-16">
          <div className="sticky top-16 z-20 mx-auto origin-top transition duration-300 ease-out" style={titleStyle}>
            <h1 className="mx-auto max-w-[1280px] text-center text-[clamp(4.5rem,16vw,14rem)] font-black uppercase leading-[0.78] tracking-normal text-[#8c867a]">
              BE BLANK TO BEHIND STUDIO
            </h1>
          </div>
          <div className="mx-auto mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#777269]">
            <a className="text-[#d8d5cc] transition hover:text-[#d8d5cc]" href="#projects">[all]</a>
            <a className="transition hover:text-[#d8d5cc]" href="#interior">interior</a>
            <a className="transition hover:text-[#d8d5cc]" href="#architecture">architecture</a>
            <a className="transition hover:text-[#d8d5cc]" href="#retail">retail</a>
            <a className="transition hover:text-[#d8d5cc]" href="#food-beverage">food & beverage</a>
          </div>
          <div className="mx-auto mt-[36vh] grid max-w-7xl gap-6 border-t border-[#d8d5cc]/18 pt-5 text-left text-sm leading-6 text-[#a9a49a] md:grid-cols-[1fr_1.5fr_1fr]">
            <p className="font-bold uppercase tracking-[0.2em] text-[#d8d5cc]">Architecture / Interior / Objects</p>
            <p className="max-w-2xl text-[#a9a49a]">
              A Bangkok-based architecture and interior studio shaping spatial identities for hospitality, residential,
              and cultural work.
            </p>
            <p className="text-[#777269] md:text-right">Selected works, project notes, and studio operations.</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a9a49a]">
            <button className="border border-[#d8d5cc]/20 px-4 py-2 transition hover:border-[#d8d5cc]/60 hover:text-[#d8d5cc]" type="button" onClick={() => navigate('/os')}>
              Studio OS
            </button>
            {publicUser ? (
              <button className="border border-[#d8d5cc]/20 px-4 py-2 transition hover:border-[#d8d5cc]/60 hover:text-[#d8d5cc]" type="button" onClick={handlePublicSignOut}>
                Sign Out
              </button>
            ) : (
              <button className="border border-[#d8d5cc]/20 px-4 py-2 transition hover:border-[#d8d5cc]/60 hover:text-[#d8d5cc]" type="button" onClick={handlePublicSignIn}>
                Sign In
              </button>
            )}
            {(canEditLayout || publicAuthMessage || saveMessage) && (
              <>
              {canEditLayout && !isEditingLayout && (
                <button className="border border-[#d8d5cc]/20 px-4 py-2 transition hover:border-[#d8d5cc]/60 hover:text-[#d8d5cc]" type="button" onClick={() => setIsEditingLayout(true)}>
                  Edit Layout
                </button>
              )}
              {canEditLayout && isEditingLayout && (
                <>
                  <button className="border border-[#d8d5cc]/20 px-4 py-2 transition hover:border-[#d8d5cc]/60 hover:text-[#d8d5cc]" type="button" onClick={saveLayout}>
                    Save Layout
                  </button>
                  <button className="border border-[#d8d5cc]/20 px-4 py-2 transition hover:border-[#d8d5cc]/60 hover:text-[#d8d5cc]" type="button" onClick={() => setIsEditingLayout(false)}>
                    Exit Edit
                  </button>
                </>
              )}
              {publicAuthMessage && <span className="text-red-200">{publicAuthMessage}</span>}
              {saveMessage && <span>{saveMessage}</span>}
              </>
            )}
          </div>
        </section>

        <section id="projects" className="px-5 pb-20 md:px-8">
          <div ref={canvasRef} className="relative hidden border-t border-[#d8d5cc]/18 pt-10 lg:block" style={{ minHeight: canvasHeight }}>
            {layoutItems.map((item, index) => (
              <PortfolioCanvasCard
                key={item.id}
                index={index}
                isEditing={isEditingLayout}
                item={item}
                navigate={navigate}
                onPointerDown={beginLayoutInteraction}
              />
            ))}
          </div>

          <div className="grid gap-10 border-t border-[#d8d5cc]/18 pt-6 lg:hidden">
            {layoutItems.map((item) => (
              <PortfolioGridCard key={item.id} item={item} navigate={navigate} />
            ))}
          </div>
        </section>

        <section id="collections" className="grid gap-8 border-y border-[#d8d5cc]/18 px-5 py-14 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#777269]">Collections</p>
          <div className="grid gap-4 text-[clamp(2rem,5vw,5.6rem)] font-black uppercase leading-none text-[#d8d5cc]">
            <span>Hospitality</span>
            <span>Residence</span>
            <span>Retail</span>
          </div>
        </section>

        <section id="about" className="grid gap-8 px-5 py-16 md:grid-cols-[1fr_2fr] md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#777269]">About</p>
          <p className="max-w-4xl text-[clamp(1.8rem,4vw,4.4rem)] font-black leading-[0.95] text-[#d8d5cc]">
            We design quiet spatial systems: clear plans, tactile material stories, and details built for real use.
          </p>
        </section>

        <footer id="contact" className="flex flex-col gap-5 border-t border-[#d8d5cc]/18 px-5 py-8 text-xs font-bold uppercase tracking-[0.2em] text-[#a9a49a] md:flex-row md:items-center md:justify-between md:px-8">
          <span>Bangkok / Phuket / Chiang Mai</span>
          <a className="transition hover:text-[#d8d5cc]" href="mailto:studio@beblanktobehindstudio.com">
            studio@beblanktobehindstudio.com
          </a>
        </footer>
      </main>
    </div>
  );
}

function PortfolioCanvasCard({ isEditing, item, index, navigate, onPointerDown }) {
  const layout = getPortfolioLayout(item, index);
  const style = {
    left: `${layout.x}%`,
    top: `${layout.y}px`,
    width: `${layout.width}%`,
    zIndex: layout.zIndex,
  };

  return (
    <article
      className={`group absolute text-left ${isEditing ? 'cursor-grab select-none outline outline-1 outline-[#d8d5cc]/25' : ''}`}
      style={style}
      onPointerDown={(event) => onPointerDown(event, item, index, 'drag')}
    >
      <button
        className="block w-full text-left"
        type="button"
        onClick={(event) => {
          if (isEditing) {
            event.preventDefault();
            return;
          }
          navigate(`/portfolio/${encodeURIComponent(item.id)}`);
        }}
      >
        <img
          alt={item.title}
          className="w-full object-cover"
          src={item.imageUrl}
          style={{ height: `${layout.height}px` }}
        />
        <div className="mt-3">
          <PortfolioCardMeta item={item} />
        </div>
      </button>
      {isEditing && (
        <button
          aria-label={`Resize ${item.title}`}
          className="absolute right-0 size-7 translate-x-1/2 -translate-y-1/2 cursor-nwse-resize border border-[#d8d5cc]/60 bg-[#12110f] text-[#d8d5cc]"
          style={{ top: `${layout.height}px` }}
          type="button"
          onPointerDown={(event) => onPointerDown(event, item, index, 'resize')}
        />
      )}
    </article>
  );
}

function PortfolioGridCard({ item, navigate }) {
  return (
    <button className="text-left" type="button" onClick={() => navigate(`/portfolio/${encodeURIComponent(item.id)}`)}>
      <div className="aspect-[4/5] overflow-hidden bg-[#1a1916]">
        <img alt={item.title} className="h-full w-full object-cover" src={item.imageUrl} />
      </div>
      <div className="mt-3">
        <PortfolioCardMeta item={item} />
      </div>
    </button>
  );
}

function PortfolioCardMeta({ item }) {
  return (
    <span className="grid gap-2.5 font-sans">
      <span className="flex items-start justify-between gap-4">
        <span
          className="block"
          style={{
            color: '#d8d5cc',
            fontSize: 'clamp(34px, 3.8vw, 58px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
          }}
        >
          {item.title}
        </span>
        <span className="shrink-0 pt-1 text-right text-[12px] font-normal text-[#b9b4aa]">
          {[item.year, item.areaSqm ? `${item.areaSqm} sqm` : ''].filter(Boolean).join(' / ')}
        </span>
      </span>
      <span className="text-[14px] font-light leading-[1.4] text-[#b9b4aa]">
        {item.subtitle || item.description || item.location}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a9488]">
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
  const defaultLayout = {
    x: index % 2 === 0 ? 6 : 50,
    y: 60 + index * 450,
    width: index % 2 === 0 ? 34 : 30,
    height: index % 2 === 0 ? 360 : 320,
    zIndex: index + 1,
  };
  const y = toLayoutNumber(item.y, defaultLayout.y);
  const height = toLayoutNumber(item.height, defaultLayout.height);

  return {
    x: clampNumber(toLayoutNumber(item.x, defaultLayout.x), 0, 78),
    y: y < 120 && index > 0 ? defaultLayout.y : y,
    width: clampNumber(toLayoutNumber(item.width, defaultLayout.width), 16, 70),
    height: height < 160 ? defaultLayout.height : height,
    zIndex: Math.max(1, Math.round(toLayoutNumber(item.zIndex, defaultLayout.zIndex))),
  };
}

function getPortfolioCanvasHeight(items) {
  return Math.max(
    980,
    ...items.map((item, index) => {
      const layout = getPortfolioLayout(item, index);
      return layout.y + layout.height + 180;
    }),
  );
}

function stringifyLayout(layout) {
  return {
    x: String(Math.round(layout.x * 10) / 10),
    y: String(Math.round(layout.y)),
    width: String(Math.round(layout.width * 10) / 10),
    height: String(Math.round(layout.height)),
    zIndex: String(Math.round(layout.zIndex)),
  };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
            <p className="mt-5 text-3xl font-extrabold text-white">{statusCounts[status]}</p>
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
        <div className="mb-6 grid gap-3 rounded-lg border border-white/[0.08] bg-black/20 p-4 lg:grid-cols-[1fr_240px]">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">
              Search projects
            </span>
            <div className="flex min-h-11 items-center gap-3 rounded-lg border border-white/[0.08] bg-black/25 px-3.5 focus-within:border-studio-orange focus-within:ring-2 focus-within:ring-studio-orange/15">
              <Search size={17} className="text-studio-muted" />
              <input
                className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-studio-muted/60"
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
              className="h-11 w-full rounded-lg border border-white/[0.08] bg-black/25 px-3.5 text-sm font-semibold capitalize text-white outline-none transition focus:border-studio-orange focus:bg-black/35 focus:ring-2 focus:ring-studio-orange/15"
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
                className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 shadow-studioSoft transition hover:border-studio-orange/25 hover:bg-white/[0.05]"
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
                      className="w-full bg-transparent text-2xl font-bold text-white outline-none transition focus:text-studio-orange"
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
                      className="grid size-9 place-items-center rounded-full border border-white/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-400/45 bg-red-500/10 px-4 text-sm font-bold text-red-200 transition hover:bg-red-500/15"
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
          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-5">
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
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">Timeline</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-extrabold text-white">{timeline.progressPercent}%</p>
                  <p className="mt-1 text-sm text-studio-muted">delivery progress</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${timeline.riskTextClass}`}>{timeline.daysLeftToHandover}</p>
                  <p className="text-xs text-studio-muted">days left</p>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
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
              <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-studio-muted">
                    Delivery pressure
                  </p>
                  <Badge tone={timeline.deliveryPressure}>{timeline.deliveryPressure}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-white/[0.08] bg-black/20 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-studio-orange">Key dates</p>
              <KeyDate calendarLabel="Start date" label="Start" project={project} value={project.startDate} />
              <KeyDate label="Design complete" value={project.designCompleteDate} />
              <KeyDate calendarLabel="Handover date" label="Handover" project={project} value={project.handoverDate} />
              <KeyDate calendarLabel="Opening date" label="Opening" project={project} value={project.openingDate} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-5">
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
                <span className="text-sm font-bold text-white">
                  {financials.projectValue ? Math.round((financials.totalCost / financials.projectValue) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full rounded-full ${getProfitBarClass(financials.profitStatus)}`}
                  style={{
                    width: `${Math.min(financials.projectValue ? Math.round((financials.totalCost / financials.projectValue) * 100) : 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-5">
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

        <div className="mt-6 rounded-lg border border-white/[0.08] bg-black/20 p-5">
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
                <article key={log.id} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-4">
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
                      className="grid size-10 place-items-center rounded-full border border-white/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
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
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-studio-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold text-white">{value ? formatDate(value) : 'TBD'}</span>
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
        className="grid size-8 place-items-center rounded-full border border-white/[0.08] text-studio-muted transition hover:border-studio-orange hover:text-studio-orange"
        title="Add to Google Calendar"
        type="button"
        onClick={openGoogleCalendar}
      >
        <CalendarPlus size={15} />
      </button>
      <button
        aria-label={`Download ${label} ICS file`}
        className="grid size-8 place-items-center rounded-full border border-white/[0.08] text-studio-muted transition hover:border-studio-orange hover:text-studio-orange"
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
    healthy: 'text-emerald-200',
    watch: 'text-amber-100',
    loss: 'text-red-200',
    neutral: 'text-white',
  }[tone];

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-4">
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
          <div className="grid grid-cols-2 gap-2 rounded-full border border-white/[0.08] bg-black/25 p-1">
            {['overview', 'detail'].map((mode) => (
              <button
                key={mode}
                className={`h-9 rounded-full px-4 text-sm font-bold capitalize transition ${
                  viewMode === mode ? 'bg-studio-orange text-black' : 'text-studio-muted hover:bg-white/[0.06] hover:text-white'
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
          <article key={project.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5 shadow-studioSoft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-extrabold text-white">{project.name}</h3>
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
                <p className="mt-1 text-2xl font-extrabold text-white">{timeline.totalProjectDays}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">Days to opening</p>
                <p className={`mt-1 text-2xl font-extrabold ${timeline.riskTextClass}`}>{timeline.daysRemainingToOpening}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-studio-muted">Progress</span>
                <span className="text-xs font-bold text-white">{timeline.progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
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
          <article key={project.id} className="rounded-lg border border-white/[0.08] bg-white/[0.03] shadow-studioSoft">
            <button
              className="flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between"
              type="button"
              onClick={() => onToggleExpanded(project.id)}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-black/20 text-studio-orange">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-extrabold text-white">{project.name}</h3>
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
              <div className="border-t border-white/[0.08] p-5">
                <div className="grid gap-3">
                  {phases.map((phase) => (
                    <div
                      key={phase.name}
                      className="grid gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-4 sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{phase.name}</p>
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
    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-studio-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">{value ? formatDate(value) : 'TBD'}</p>
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
          <article key={item.id} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 shadow-studioSoft">
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
                  className="grid size-10 place-items-center rounded-full border border-white/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
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
          <article key={item.id} className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.035] shadow-studioSoft">
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
                  className="mt-7 grid size-10 place-items-center rounded-full border border-white/[0.08] text-studio-muted transition hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
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
