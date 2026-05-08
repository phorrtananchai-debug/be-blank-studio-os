import {
  FileJson,
  LayoutDashboard,
  CalendarClock,
  ClipboardCopy,
  Image as ImageIcon,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../components/Badge.jsx';
import { Button } from '../components/Button.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { LoginPage } from '../components/LoginPage.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useStudioAuth } from '../hooks/useStudioAuth.js';
import { useStudioProjects } from '../hooks/useStudioProjects.js';
import {
  addCollectionItem,
  deleteCollectionItem,
  getFirebaseDebugInfo,
  subscribeToCollection,
  updateCollectionItem,
} from '../services/firebase.js';
import {
  createFirebaseProject,
  deleteFirebaseProject,
  updateFirebaseProject,
} from '../services/firebaseProjects.js';
import {
  initialContentItems,
  initialPortfolioItems,
  projectStatuses,
} from '../data/seed.js';
import {
  countByStatus,
  createContentItem,
  createPortfolioItem,
  createProject,
  downloadJson,
  formatDate,
} from '../utils/dashboard.js';

import { ProjectDashboard } from '../components/dashboard/ProjectDashboard.jsx';
import { TimelineCalculator } from '../components/dashboard/TimelineCalculator.jsx';
import { ContentPlanner } from '../components/dashboard/ContentPlanner.jsx';
import { PortfolioManager } from '../components/dashboard/PortfolioManager.jsx';

const tabs = [
  { id: 'projects', label: 'Projects', icon: LayoutDashboard },
  { id: 'timeline', label: 'Timeline', icon: CalendarClock },
  { id: 'content', label: 'Content', icon: ClipboardCopy },
  { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
];

export function StudioOSApp({ navigate }) {
  const {
    user: studioUser,
    authMessage,
    signIn: handleFirebaseSignIn,
    signOut: handleFirebaseSignOut,
    isFirebaseConfigured
  } = useStudioAuth();

  const { projects, error: projectsError } = useStudioProjects(studioUser);

  const [activeTab, setActiveTab] = useState('projects');
  const [contentItems, setContentItems] = useLocalStorage('beBlank.content', initialContentItems);
  const [portfolioItems, setPortfolioItems] = useState(initialPortfolioItems);
  const [copiedId, setCopiedId] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const importInputRef = useRef(null);

  const dataMode = isFirebaseConfigured
    ? (studioUser ? 'firebase' : 'firebase-auth')
    : 'checking';

  useEffect(() => {
    if (!studioUser || !isFirebaseConfigured) {
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
  }, [studioUser, isFirebaseConfigured]);

  const statusCounts = useMemo(() => countByStatus(projects, projectStatuses), [projects]);
  const activeProjects = projects.filter((project) => project.status !== 'open').length;
  const nextOpening = [...projects]
    .filter((project) => project.openingDate)
    .sort((a, b) => new Date(a.openingDate) - new Date(b.openingDate))[0];
  const contentApproved = contentItems.filter((item) => item.status === 'approved').length;

  if (!studioUser && dataMode === 'firebase-auth') {
    return <LoginPage errorMessage={authMessage || projectsError} onBack={() => navigate('/')} onSignIn={handleFirebaseSignIn} />;
  }

  const updateProject = async (id, updates) => {
    if (!studioUser) return;
    await updateFirebaseProject(id, updates);
  };

  const addProject = async () => {
    if (!studioUser) return;
    await createFirebaseProject(createProject());
  };

  const deleteProject = async (id) => {
    if (!studioUser) return;
    await deleteFirebaseProject(id);
  };

  const updateContent = (id, updates) => {
    setContentItems((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addPortfolio = async () => {
    if (!studioUser) return;
    await addCollectionItem('portfolioItems', createPortfolioItem());
  };

  const updatePortfolio = async (id, updates) => {
    if (!studioUser) return;
    await updateCollectionItem('portfolioItems', id, updates);
  };

  const deletePortfolio = async (id) => {
    if (!studioUser) return;
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
    if (!file) return;

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

  const firebaseDebugInfo = getFirebaseDebugInfo();

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
                : dataMode === 'firebase-error' || projectsError
                  ? 'Firestore error'
                  : 'Firebase sign-in required'}
            </Badge>
            {isFirebaseConfigured && studioUser && (
              <Button variant="secondary" onClick={handleFirebaseSignOut}>
                Sign Out
              </Button>
            )}
            {isFirebaseConfigured && !studioUser && (
              <Button variant="secondary" onClick={handleFirebaseSignIn}>
                Sign In
              </Button>
            )}
            {(authMessage || projectsError) && <span className="text-sm font-semibold text-red-700">{authMessage || projectsError}</span>}
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
