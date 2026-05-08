import {
  FileJson,
  LayoutDashboard,
  CalendarClock,
  ClipboardCopy,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Wind,
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
import { DailyFlow } from '../components/dashboard/DailyFlow.jsx';

const tabs = [
  { id: 'flow', label: 'Daily Flow', icon: Wind },
  { id: 'projects', label: 'Overview', icon: LayoutDashboard },
  { id: 'timeline', label: 'Schedule', icon: CalendarClock },
  { id: 'content', label: 'Journal', icon: ClipboardCopy },
  { id: 'portfolio', label: 'Gallery', icon: ImageIcon },
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

  const [activeTab, setActiveTab] = useState('flow');
  const [contentItems, setContentItems] = useLocalStorage('beBlank.content', initialContentItems);
  const [portfolioItems, setPortfolioItems] = useState(initialPortfolioItems);
  const [copiedId, setCopiedId] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [showDebug, setShowDebug] = useState(false);
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
    <div className="os-dashboard-enter min-h-screen bg-studio-bone text-studio-ink selection:bg-studio-orange/10 selection:text-studio-ink">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-24 px-8 py-12 lg:px-12 lg:py-20">
        <header className="grid gap-12 xl:grid-cols-[1fr_auto] xl:items-end border-b border-black/[0.03] pb-16">
          <div className="space-y-10">
            <button
              className="text-[9px] font-bold uppercase tracking-cinema text-studio-muted transition hover:text-studio-ink"
              type="button"
              onClick={() => navigate('/')}
            >
              &larr; Studio Profile
            </button>
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-cinema text-studio-orange">
                <Sparkles size={16} strokeWidth={1.5} />
                Operating System
              </div>
              <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl font-light tracking-tightest leading-[0.85] max-w-4xl">
                Be Blank Studio OS
              </h1>
              <p className="max-w-2xl text-lg font-medium tracking-tight text-studio-muted leading-relaxed">
                A calm workspace for architectural delivery, content strategy, and portfolio management.
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 xl:w-[700px]">
            <MetricCard label="Active Projects" value={activeProjects} />
            <MetricCard label="Approved posts" value={contentApproved} />
            <MetricCard label="Archive Items" value={portfolioItems.length} />
            <MetricCard label="Next Handover" value={nextOpening ? formatDate(nextOpening.openingDate) : 'TBD'} />
          </div>
        </header>

        <section className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between border-y border-black/[0.02] py-12">
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-orange">Realtime Workspace</p>
            <p className="text-sm font-medium text-studio-muted">
              Projects and assets are synced via Firestore &bull; Local backups remain active.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Badge tone={dataMode === 'firebase' ? 'safe' : 'medium'}>
              {dataMode === 'firebase' ? 'Encrypted Connection' : 'Sync Offline'}
            </Badge>
            {isFirebaseConfigured && studioUser && (
              <Button variant="secondary" onClick={handleFirebaseSignOut}>
                Disconnect
              </Button>
            )}
            {(authMessage || projectsError) && <span className="text-[11px] font-bold uppercase tracking-editorial text-red-500">{authMessage || projectsError}</span>}
            {backupMessage && <span className="text-[11px] font-bold uppercase tracking-editorial text-studio-orange">{backupMessage}</span>}
            <input ref={importInputRef} accept="application/json" className="hidden" type="file" onChange={importBackup} />
            <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
              <Upload size={14} strokeWidth={2.5} />
              Import
            </Button>
            <Button onClick={exportBackup}>
              <FileJson size={14} strokeWidth={2.5} />
              Export
            </Button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="size-11 grid place-items-center rounded-full border border-black/[0.03] text-studio-muted hover:text-studio-ink transition-colors"
            >
              <LayoutDashboard size={16} strokeWidth={1.5} />
            </button>
          </div>
        </section>

        {showDebug && (
          <section className="rounded-2xl border border-black/[0.02] bg-[#f9f9f7] p-8 text-[10px] font-bold uppercase tracking-cinema text-studio-muted/50">
            <p className="mb-6 text-studio-orange">System Debug Trace</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <span>apiKeyExists: {String(firebaseDebugInfo.apiKeyExists)}</span>
              <span>configSource: {firebaseDebugInfo.configSource}</span>
              <span>apiKeySuffix: {firebaseDebugInfo.apiKeySuffix || 'missing'}</span>
              <span>projectId: {firebaseDebugInfo.projectId || 'missing'}</span>
              <span>authDomain: {firebaseDebugInfo.authDomain || 'missing'}</span>
              <span>appIdExists: {String(firebaseDebugInfo.appIdExists)}</span>
              <span>storageBucket: {firebaseDebugInfo.storageBucket || 'missing'}</span>
            </div>
          </section>
        )}

        <div className="sticky top-12 z-[100] flex justify-center">
          <nav className="flex gap-1 rounded-full border border-white/20 bg-white/40 p-1.5 shadow-premium backdrop-blur-2xl paper-layer">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  className={`flex h-11 min-w-[140px] items-center justify-center gap-3 rounded-full text-[11px] font-bold uppercase tracking-editorial transition-all duration-500 ${
                    isActive
                      ? 'bg-studio-ink text-white shadow-premium'
                      : 'text-studio-muted hover:bg-black/[0.03] hover:text-studio-ink'
                  }`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 1.5} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-32 page-fade">
          <div key={activeTab} className="page-fade">
            {activeTab === 'flow' && <DailyFlow projects={projects} />}

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

        <footer className="border-t border-black/[0.03] pt-16 pb-24 text-center">
          <p className="text-[9px] font-bold uppercase tracking-cinema text-studio-muted/40">
            Be Blank to Behind Studio &bull; Private Environment &bull; v1.0.0
          </p>
        </footer>
      </div>
    </div>
  );
}
