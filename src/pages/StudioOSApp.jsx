import { useMemo, useRef, useState } from 'react';
import { CommandPalette } from '../components/CommandPalette.jsx';
import { LoginPage } from '../components/LoginPage.jsx';
import { QuickCapture } from '../components/dashboard/QuickCapture.jsx';
import { StudioOSAnalysisPreview } from '../components/studio-os/StudioOSAnalysisPreview.jsx';
import { StudioOSDebugPanel } from '../components/studio-os/StudioOSDebugPanel.jsx';
import { StudioOSHeader } from '../components/studio-os/StudioOSHeader.jsx';
import { StudioOSImportPreview } from '../components/studio-os/StudioOSImportPreview.jsx';
import { StudioOSNavigation } from '../components/studio-os/StudioOSNavigation.jsx';
import { StudioOSToolbar } from '../components/studio-os/StudioOSToolbar.jsx';
import { StudioOSWorkspaceContent } from '../components/studio-os/StudioOSWorkspaceContent.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useOperationalTasks } from '../hooks/useOperationalTasks.js';
import { usePortfolioItems } from '../hooks/usePortfolioItems.js';
import { useStudioAuth } from '../hooks/useStudioAuth.js';
import { useStudioProjects } from '../hooks/useStudioProjects.js';
import { useToastMessage } from '../hooks/useToastMessage.js';
import {
  addCollectionItem,
  deleteCollectionItem,
  getFirebaseDebugInfo,
  isFirebaseConfigured as hasFirebaseStorageConfig,
  updateCollectionItem,
  uploadFile,
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
} from '../utils/dashboard.js';
import { getAutoPortfolioLayout, stringifyLayout } from '../utils/layout.js';
import { inferTaskDraft, normalizeTaskStatus } from '../utils/operationalTasks.js';
import { parseBackupJson, validateStudioBackup } from '../utils/backupValidation.js';
import {
  buildAiAnalysisPrompt,
  buildIntelligenceHistoryEntry,
  buildStudioIntelligenceExport,
  buildStudioIntelligenceSummary,
  createAnalysisNote,
  createAnalysisTask,
  parseStudioAnalysisJson,
} from '../utils/studioIntelligence.js';
import { mergeCriticalPathUpdates } from '../utils/criticalPath.js';
import {
  buildWeeklyReviewBriefing,
  buildWeeklyStudioReview,
} from '../utils/weeklyReview.js';

export function StudioOSApp({ navigate, routePath }) {
  const {
    user: studioUser,
    authMessage,
    signIn: handleFirebaseSignIn,
    signOut: handleFirebaseSignOut,
    isFirebaseConfigured
  } = useStudioAuth();

  const { projects, error: projectsError } = useStudioProjects(studioUser);

  // Derive active tab and project ID from routePath
  const activeTab = useMemo(() => {
    if (routePath.startsWith('/os/artwork/')) return 'artwork';
    if (routePath.startsWith('/os/projects')) return 'projects';
    if (routePath.startsWith('/os/timeline')) return 'timeline';
    if (routePath.startsWith('/os/content')) return 'content';
    if (routePath.startsWith('/os/portfolio')) return 'portfolio';
    return 'flow';
  }, [routePath]);

  const selectedArtworkProjectId = useMemo(() => {
    if (routePath.startsWith('/os/artwork/')) {
      return routePath.replace('/os/artwork/', '');
    }
    return '';
  }, [routePath]);

  const handleTabChange = (tabId) => {
    if (tabId === 'flow') navigate('/os');
    else if (tabId === 'artwork') {
      if (selectedArtworkProjectId) navigate(`/os/artwork/${selectedArtworkProjectId}`);
      else navigate('/os/artwork');
    }
    else navigate(`/os/${tabId}`);
  };

  const handleSelectArtwork = (id) => {
    navigate(`/os/artwork/${id}`);
  };

  const handleBackToGallery = () => {
    navigate('/os/artwork');
  };
  const [contentItems, setContentItems] = useLocalStorage('beBlank.content', initialContentItems);
  const { portfolioItems, setPortfolioItems } = usePortfolioItems({ enabled: Boolean(studioUser), seedWhenEmpty: true });
  const [copiedId, setCopiedId] = useState('');
  const { showToast, toast } = useToastMessage();
  const {
    completeTask,
    createTask,
    replaceLocalTasks,
    tasks,
    updateTask,
  } = useOperationalTasks({ enabled: Boolean(studioUser) || !isFirebaseConfigured, onToast: showToast });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [lastAddedPortfolioId, setLastAddedPortfolioId] = useState('');
  const importInputRef = useRef(null);
  const importModeRef = useRef('backup');

  const dataMode = isFirebaseConfigured
    ? (studioUser ? 'firebase' : 'firebase-auth')
    : 'checking';

  const statusCounts = useMemo(() => countByStatus(projects, projectStatuses), [projects]);
  if (!studioUser && dataMode === 'firebase-auth') {
    return <LoginPage errorMessage={authMessage || projectsError} onBack={() => navigate('/')} onSignIn={handleFirebaseSignIn} />;
  }

  const updateProject = async (id, updates) => {
    if (!studioUser) return;
    try {
      await updateFirebaseProject(id, updates);
      showToast('Project updated.');
    } catch (error) {
      console.error(error);
      showToast('Project update failed. Check your connection and try again.', 'error');
    }
  };

  const addProject = async () => {
    if (!studioUser) return;
    try {
      await createFirebaseProject(createProject());
      showToast('New project created.');
    } catch (error) {
      console.error(error);
      showToast('Project creation failed. Check your connection and try again.', 'error');
    }
  };

  const deleteProject = async (id) => {
    if (!studioUser) return;
    try {
      await deleteFirebaseProject(id);
      showToast('Project deleted.');
    } catch (error) {
      console.error(error);
      showToast('Project delete failed. Check your connection and try again.', 'error');
    }
  };

  const updateContent = (id, updates) => {
    setContentItems((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    showToast('Journal item updated.');
  };

  const addContent = () => {
    setContentItems((items) => [createContentItem(), ...items]);
    showToast('Journal item created.');
  };

  const addQuickNote = (text) => {
    const [firstLine] = text.split('\n').map((line) => line.trim()).filter(Boolean);
    setContentItems((items) => [
      {
        ...createContentItem(),
        title: firstLine?.slice(0, 80) || 'Quick studio note',
        captionEN: text,
        platform: 'Studio',
      },
      ...items,
    ]);
    showToast('Note saved to Journal.');
  };

  const addQuickTask = async (text) => {
    const savedTask = await createTask(inferTaskDraft(text, projects));
    return Boolean(savedTask);
  };

  const deleteContent = (id) => {
    setContentItems((items) => items.filter((item) => item.id !== id));
    showToast('Journal item deleted.');
  };

  const addPortfolio = async () => {
    if (!studioUser) return;
    try {
      const itemId = crypto.randomUUID ? `portfolio-${crypto.randomUUID()}` : `portfolio-${Date.now()}`;
      const layout = stringifyLayout(getAutoPortfolioLayout(portfolioItems));
      const portfolioItem = createPortfolioItem({ id: itemId, ...layout });
      await addCollectionItem('portfolioItems', portfolioItem);
      setLastAddedPortfolioId(itemId);
      showToast('Portfolio item added.');
    } catch (error) {
      console.error(error);
      showToast('Portfolio item could not be added.', 'error');
    }
  };

  const openHomepageEditor = (portfolioItemId = '') => {
    const query = new URLSearchParams({ edit: '1' });
    if (portfolioItemId) {
      query.set('highlight', portfolioItemId);
    }
    navigate(`/work?${query.toString()}`);
  };

  const uploadPortfolioImage = async (id, file, relationship = 'gallery') => {
    if (!studioUser) {
      showToast('Sign in before uploading portfolio images.', 'warning');
      return null;
    }

    if (!hasFirebaseStorageConfig()) {
      showToast('Direct upload requires Firebase Storage. URL fields remain available.', 'warning');
      return null;
    }

    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/(^-|-$)/g, '') || 'image';
      const folder = relationship === 'cover' ? 'cover' : 'gallery';
      const path = `portfolio/${id}/${folder}/${Date.now()}-${safeName}`;
      const url = await uploadFile(path, file);
      const imageMeta = {
        alt: file.name.replace(/\.[^.]+$/, ''),
        blurhash: '',
        caption: '',
        fullUrl: url,
        height: null,
        mediumUrl: url,
        order: 0,
        path,
        placeholder: '',
        relationship,
        thumbnailUrl: url,
        url,
        width: null,
      };

      if (relationship === 'cover') {
        await updatePortfolio(id, { coverImage: imageMeta, imageUrl: url });
      } else {
        const currentItem = portfolioItems.find((item) => item.id === id);
        const galleryImages = Array.isArray(currentItem?.galleryImages) ? currentItem.galleryImages : [];
        await updatePortfolio(id, {
          galleryImages: [
            ...galleryImages,
            { ...imageMeta, order: galleryImages.length },
          ],
        });
      }

      showToast(relationship === 'cover' ? 'Cover image uploaded.' : 'Gallery image uploaded.');
      return imageMeta;
    } catch (error) {
      console.error(error);
      showToast('Image upload failed. URL input is still available.', 'error');
      return null;
    }
  };

  const updatePortfolio = async (id, updates) => {
    if (!studioUser) return;
    try {
      await updateCollectionItem('portfolioItems', id, updates);
      showToast('Portfolio item updated.');
    } catch (error) {
      console.error(error);
      showToast('Portfolio update failed. Check your connection and try again.', 'error');
    }
  };

  const deletePortfolio = async (id) => {
    if (!studioUser) return;
    try {
      await deleteCollectionItem('portfolioItems', id);
      showToast('Portfolio item deleted.');
    } catch (error) {
      console.error(error);
      showToast('Portfolio delete failed. Check your connection and try again.', 'error');
    }
  };

  const exportPortfolio = () => {
    try {
      downloadJson('be-blank-portfolio.json', portfolioItems);
      showToast('Portfolio export downloaded.');
    } catch (error) {
      console.error(error);
      showToast('Portfolio export failed.', 'error');
    }
  };

  const getIntelligenceJson = () => buildStudioIntelligenceExport({
    contentItems,
    portfolioItems,
    projects,
    tasks,
  });

  const getWeeklyReview = () => buildWeeklyStudioReview({ projects, tasks });

  const exportIntelligenceJson = () => {
    try {
      downloadJson('be-blank-studio-intelligence.json', getIntelligenceJson());
      showToast('Intelligence JSON exported.');
    } catch (error) {
      console.error(error);
      showToast('Intelligence export failed.', 'error');
    }
  };

  const exportWeeklyReviewJson = () => {
    try {
      downloadJson('be-blank-weekly-studio-review.json', getWeeklyReview());
      showToast('Weekly review JSON exported.');
    } catch (error) {
      console.error(error);
      showToast('Weekly review export failed.', 'error');
    }
  };

  const downloadText = (filename, text) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyTextToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (error) {
      console.error(error);
      showToast('Clipboard copy failed.', 'error');
    }
  };

  const copyIntelligenceJson = () => copyTextToClipboard(
    JSON.stringify(getIntelligenceJson(), null, 2),
    'Intelligence JSON copied.',
  );

  const copyWeeklyReview = () => copyTextToClipboard(
    JSON.stringify(getWeeklyReview(), null, 2),
    'Weekly review copied.',
  );

  const exportWeeklyReviewBriefing = () => {
    const briefingText = buildWeeklyReviewBriefing(getWeeklyReview());
    downloadText('be-blank-weekly-studio-briefing.txt', briefingText);
    showToast('Weekly briefing exported.');
  };

  const exportIntelligenceSummary = () => {
    const summaryText = buildStudioIntelligenceSummary(getIntelligenceJson());
    downloadText('be-blank-studio-intelligence-summary.txt', summaryText);
    showToast('Intelligence summary exported.');
  };

  const copyIntelligencePrompt = () => copyTextToClipboard(
    buildAiAnalysisPrompt(),
    'AI analysis prompt copied.',
  );

  const copyCaption = async (item) => {
    const text = `${item.captionTH}\n\n${item.captionEN}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      showToast('Caption copied.');
      window.setTimeout(() => setCopiedId(''), 1400);
    } catch (error) {
      console.error(error);
      showToast('Caption could not be copied.', 'error');
    }
  };

  const exportBackup = () => {
    try {
      downloadJson('be-blank-studio-os-backup.json', {
        app: 'Be Blank Studio OS',
        schema: 'studio-os-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        projects,
        contentItems,
        portfolioItems,
        tasks,
      });
      showToast('Backup exported.');
    } catch (error) {
      console.error(error);
      showToast('Backup export failed.', 'error');
    }
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data, error: parseError } = parseBackupJson(await file.text());
      if (parseError) {
        throw new Error(parseError);
      }

      const { backup, errors, preview } = validateStudioBackup(data);
      if (errors.length) {
        throw new Error(errors[0]);
      }

      setPendingBackup({ backup, fileName: file.name, preview });
      showToast('Backup ready to review.', 'info');
    } catch (error) {
      console.error(error);
      setPendingBackup(null);
      showToast(error.message || 'Import failed. Use a valid Studio OS backup file.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const importAnalysis = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { analysis, errors, preview } = parseStudioAnalysisJson(await file.text());
      if (errors.length) {
        throw new Error(errors[0]);
      }

      setPendingAnalysis({ analysis, fileName: file.name, preview });
      showToast('AI analysis ready to review.', 'info');
    } catch (error) {
      setPendingAnalysis(null);
      showToast(error.message || 'Import failed. Use valid AI analysis JSON.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const importJsonFile = (event) => {
    if (importModeRef.current === 'analysis') {
      importAnalysis(event);
    } else {
      importBackup(event);
    }
    importModeRef.current = 'backup';
  };

  const requestBackupImport = () => {
    importModeRef.current = 'backup';
    importInputRef.current?.click();
  };

  const requestAnalysisImport = () => {
    importModeRef.current = 'analysis';
    importInputRef.current?.click();
  };

  const confirmImportBackup = async () => {
    if (!pendingBackup) return;

    const { backup, preview } = pendingBackup;

    try {
      if (preview.projects && studioUser) {
        await Promise.all(backup.projects.map((project) => createFirebaseProject(project)));
      }

      setContentItems(backup.contentItems);
      setPortfolioItems(backup.portfolioItems);
      if (backup.tasks?.length) {
        replaceLocalTasks(backup.tasks);
      }
      setPendingBackup(null);
      showToast(
        preview.projects && !studioUser
          ? 'Backup imported. Projects skipped until sign-in.'
          : 'Backup restored.',
        preview.projects && !studioUser ? 'warning' : 'success',
      );
    } catch (error) {
      console.error(error);
      showToast('Import failed before local data changed. Check your connection and try again.', 'error');
    }
  };

  const cancelImportBackup = () => {
    setPendingBackup(null);
    showToast('Backup import cancelled.', 'info');
  };

  const findAnalysisProject = (update) => {
    const byId = projects.find((project) => project.id === update.projectId);
    if (byId) return byId;
    const name = String(update.projectName || '').trim().toLowerCase();
    return projects.find((project) => name && String(project.name || '').trim().toLowerCase() === name);
  };

  const getProjectTaskMetrics = (projectId) => {
    const openTasks = tasks.filter((task) => task.projectId === projectId && normalizeTaskStatus(task.status) !== 'DONE');
    return {
      blocked: openTasks.filter((task) => normalizeTaskStatus(task.status) === 'BLOCKED' || String(task.blockedBy || '').trim()).length,
      overdue: openTasks.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(`${task.dueDate}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return !Number.isNaN(dueDate.getTime()) && dueDate < today;
      }).length,
      waiting: openTasks.filter((task) => normalizeTaskStatus(task.status) === 'WAITING' || String(task.waitingFor || '').trim()).length,
    };
  };

  const confirmImportAnalysis = async () => {
    if (!pendingAnalysis) return;

    const { analysis } = pendingAnalysis;

    try {
      await Promise.all(analysis.projectUpdates.map(async (projectUpdate) => {
        const project = findAnalysisProject(projectUpdate);
        if (!project) return;

        const updates = {};
        if (projectUpdate.currentPriority) updates.currentFocus = projectUpdate.currentPriority;
        if (projectUpdate.deliveryConstraints) updates.phaseNotes = projectUpdate.deliveryConstraints;
        if (projectUpdate.status) updates.status = projectUpdate.status;
        if (projectUpdate.pressureState) updates.intelligencePressureState = projectUpdate.pressureState;
        if (Array.isArray(projectUpdate.risks)) updates.intelligenceRisks = projectUpdate.risks;
        if (projectUpdate.dependencies) updates.dependencies = projectUpdate.dependencies;
        if (projectUpdate.nextDecision) updates.currentFocus = projectUpdate.nextDecision;
        if (projectUpdate.procurementStatus) updates.procurementStatus = projectUpdate.procurementStatus;
        if (projectUpdate.handoverReadiness) updates.handoverReadiness = projectUpdate.handoverReadiness;
        if (Array.isArray(projectUpdate.criticalPath)) {
          updates.criticalPath = mergeCriticalPathUpdates(project, projectUpdate.criticalPath);
        }
        if (Array.isArray(projectUpdate.recommendedNextActions)) {
          updates.nextAction = projectUpdate.recommendedNextActions.join('\n');
        }

        const previousHistory = Array.isArray(project.intelligenceHistory) ? project.intelligenceHistory : [];
        const currentMetrics = getProjectTaskMetrics(project.id);
        updates.intelligenceHistory = [
          ...previousHistory,
          buildIntelligenceHistoryEntry({
            ...projectUpdate,
            blockedCount: projectUpdate.blockedCount ?? currentMetrics.blocked,
            overdueCount: projectUpdate.overdueCount ?? currentMetrics.overdue,
            waitingCount: projectUpdate.waitingCount ?? currentMetrics.waiting,
          }, analysis),
        ].slice(-20);

        if (Object.keys(updates).length) {
          await updateProject(project.id, updates);
        }

        if (Array.isArray(projectUpdate.suggestedTasks)) {
          await Promise.all(projectUpdate.suggestedTasks.map((task) => createTask(createAnalysisTask(task, project.id))));
        }
      }));

      await Promise.all((analysis.newTasks || []).map((task) => createTask(createAnalysisTask(task))));

      const analysisNotes = (analysis.notes || []).map(createAnalysisNote);
      if (analysis.summary) {
        analysisNotes.unshift(createAnalysisNote({ title: 'AI analysis summary', body: analysis.summary }));
      }
      if (analysisNotes.length) {
        setContentItems((items) => [...analysisNotes, ...items]);
      }

      setPendingAnalysis(null);
      showToast('AI analysis applied.');
    } catch (error) {
      console.error(error);
      showToast('AI analysis apply failed. Existing data was preserved where possible.', 'error');
    }
  };

  const cancelImportAnalysis = () => {
    setPendingAnalysis(null);
    showToast('AI analysis import cancelled.', 'info');
  };

  const toggleDebugPanel = () => {
    setShowDebug((value) => {
      const nextValue = !value;
      showToast(nextValue ? 'Debug panel opened.' : 'Debug panel hidden.', 'info');
      return nextValue;
    });
  };

  const firebaseDebugInfo = getFirebaseDebugInfo();
  const commandPaletteCommands = [
    {
      id: 'go-dashboard',
      label: 'Go to Dashboard',
      description: 'Open the Daily Flow dashboard',
      group: 'Navigate',
      keywords: ['home', 'flow', 'daily'],
      run: () => navigate('/os'),
    },
    {
      id: 'go-projects',
      label: 'Go to Projects',
      description: 'Open project overview',
      group: 'Navigate',
      keywords: ['overview', 'status'],
      run: () => navigate('/os/projects'),
    },
    {
      id: 'go-artwork',
      label: 'Go to Artwork Space',
      description: 'Open studio artwork boards',
      group: 'Navigate',
      keywords: ['board', 'canvas'],
      run: () => navigate('/os/artwork'),
    },
    {
      id: 'go-portfolio',
      label: 'Go to Portfolio',
      description: 'Open portfolio management',
      group: 'Navigate',
      keywords: ['gallery', 'archive'],
      run: () => navigate('/os/portfolio'),
    },
    {
      id: 'go-mobile',
      label: 'Go to Mobile OS',
      description: 'Open the mobile workspace',
      group: 'Navigate',
      keywords: ['phone', 'mobile'],
      run: () => navigate('/m'),
    },
    {
      id: 'create-project',
      label: 'Create New Project',
      description: 'Add a new Firebase project record',
      group: 'Action',
      disabled: !studioUser,
      keywords: ['new', 'add'],
      run: () => {
        addProject();
        navigate('/os/projects');
      },
    },
    {
      id: 'export-backup',
      label: 'Export Backup',
      description: 'Download a JSON backup',
      group: 'Action',
      run: exportBackup,
    },
    {
      id: 'import-backup',
      label: 'Import Backup',
      description: 'Choose a JSON backup file',
      group: 'Action',
      run: () => importInputRef.current?.click(),
    },
    {
      id: 'toggle-debug',
      label: 'Toggle Debug Panel',
      description: 'Show or hide Firebase debug trace',
      group: 'System',
      run: toggleDebugPanel,
    },
  ];

  return (
    <div className="studio-os-shell min-h-screen bg-studio-paper text-studio-ink selection:bg-studio-ink/10 selection:text-studio-ink">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-16 px-8 py-12 lg:px-12">
        <StudioOSHeader
          contentItems={contentItems}
          tasks={tasks}
          projects={projects}
          onBackHome={() => navigate('/')}
        />

        <StudioOSToolbar
          authMessage={authMessage}
          dataMode={dataMode}
          importInputRef={importInputRef}
          isFirebaseConfigured={isFirebaseConfigured}
          projectsError={projectsError}
          studioUser={studioUser}
          toast={toast}
          onCopyIntelligenceJson={copyIntelligenceJson}
          onCopyIntelligencePrompt={copyIntelligencePrompt}
          onCopyWeeklyReview={copyWeeklyReview}
          onDisconnect={handleFirebaseSignOut}
          onExportBackup={exportBackup}
          onExportIntelligenceJson={exportIntelligenceJson}
          onExportIntelligenceSummary={exportIntelligenceSummary}
          onExportWeeklyReviewBriefing={exportWeeklyReviewBriefing}
          onExportWeeklyReviewJson={exportWeeklyReviewJson}
          onImportFile={importJsonFile}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onRequestAnalysisImport={requestAnalysisImport}
          onRequestBackupImport={requestBackupImport}
          onToggleDebug={toggleDebugPanel}
        />

        <StudioOSImportPreview
          pendingBackup={pendingBackup}
          studioUser={studioUser}
          onCancel={cancelImportBackup}
          onConfirm={confirmImportBackup}
        />

        {showDebug && <StudioOSDebugPanel debugInfo={firebaseDebugInfo} />}

        <StudioOSNavigation activeTab={activeTab} onTabChange={handleTabChange} />

        <StudioOSWorkspaceContent
          activeTab={activeTab}
          addContent={addContent}
          addPortfolio={addPortfolio}
          addProject={addProject}
          contentItems={contentItems}
          copiedId={copiedId}
          copyCaption={copyCaption}
          deleteContent={deleteContent}
          deletePortfolio={deletePortfolio}
          deleteProject={deleteProject}
          exportPortfolio={exportPortfolio}
          handleBackToGallery={handleBackToGallery}
          handleSelectArtwork={handleSelectArtwork}
          portfolioItems={portfolioItems}
          lastAddedPortfolioId={lastAddedPortfolioId}
          projects={projects}
          selectedArtworkProjectId={selectedArtworkProjectId}
          statusCounts={statusCounts}
          studioUser={studioUser}
          updateContent={updateContent}
          updatePortfolio={updatePortfolio}
          updateProject={updateProject}
          onOpenHomepageEditor={openHomepageEditor}
          onUploadPortfolioImage={uploadPortfolioImage}
          tasks={tasks}
          onCompleteTask={completeTask}
          onUpdateTask={updateTask}
        />

        <StudioOSAnalysisPreview
          pendingAnalysis={pendingAnalysis}
          onCancel={cancelImportAnalysis}
          onConfirm={confirmImportAnalysis}
        />

        <footer className="border-t border-black/[0.03] pt-16 pb-24 text-center">
          <p className="text-[9px] font-bold uppercase  text-studio-muted/40">
            Be Blank to Behind Studio &bull; Private Environment &bull; v1.0.0
          </p>
        </footer>
      </div>
      <QuickCapture
        onAddNote={addQuickNote}
        onAddProject={addProject}
        onAddTask={addQuickTask}
        onOpenArtwork={() => handleTabChange('artwork')}
        onOpenProjects={() => navigate('/os/projects')}
        onToast={showToast}
      />
      <CommandPalette
        commands={commandPaletteCommands}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpen={() => setIsCommandPaletteOpen(true)}
      />
    </div>
  );
}
