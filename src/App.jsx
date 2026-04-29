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
  isAllowedUser,
  isFirebaseConfigured,
  onStudioAuthChange,
  signInToStudio,
  signOutOfStudio,
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

function App() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [contentItems, setContentItems] = useLocalStorage('beBlank.content', initialContentItems);
  const [portfolioItems, setPortfolioItems] = useLocalStorage('beBlank.portfolio', initialPortfolioItems);
  const [copiedId, setCopiedId] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [studioUser, setStudioUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [dataMode, setDataMode] = useState(isFirebaseConfigured() ? 'firebase-auth' : 'checking');
  const importInputRef = useRef(null);

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

  const updatePortfolio = (id, updates) => {
    setPortfolioItems((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
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
              Projects sync from Firestore. Content and portfolio keep local backup tools.
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
            onAdd={() => setPortfolioItems((items) => [createPortfolioItem(), ...items])}
            onDelete={(id) => setPortfolioItems((items) => items.filter((item) => item.id !== id))}
            onExport={() => downloadJson('be-blank-portfolio.json', portfolioItems)}
            onUpdate={updatePortfolio}
          />
        )}
      </div>
    </div>
  );
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
                <Field
                  label="Image URL"
                  value={item.imageUrl}
                  onChange={(value) => onUpdate(item.id, { imageUrl: value })}
                />
              </div>
              <Field
                label="Description"
                multiline
                value={item.description}
                onChange={(value) => onUpdate(item.id, { description: value })}
              />
              <Field label="Tags" value={item.tags} onChange={(value) => onUpdate(item.id, { tags: value })} />
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export default App;
