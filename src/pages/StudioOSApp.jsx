import { useMemo, useRef, useState } from 'react';
import { CommandPalette } from '../components/CommandPalette.jsx';
import { LoginPage } from '../components/LoginPage.jsx';
import { QuickCapture } from '../components/dashboard/QuickCapture.jsx';
import { StudioOSDebugPanel } from '../components/studio-os/StudioOSDebugPanel.jsx';
import { StudioOSHeader } from '../components/studio-os/StudioOSHeader.jsx';
import { StudioOSNavigation } from '../components/studio-os/StudioOSNavigation.jsx';
import { StudioOSToolbar } from '../components/studio-os/StudioOSToolbar.jsx';
import { StudioOSWorkspaceContent } from '../components/studio-os/StudioOSWorkspaceContent.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { usePortfolioItems } from '../hooks/usePortfolioItems.js';
import { useStudioAuth } from '../hooks/useStudioAuth.js';
import { useStudioProjects } from '../hooks/useStudioProjects.js';
import { useToastMessage } from '../hooks/useToastMessage.js';
import {
  addCollectionItem,
  deleteCollectionItem,
  getFirebaseDebugInfo,
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const importInputRef = useRef(null);

  const dataMode = isFirebaseConfigured
    ? (studioUser ? 'firebase' : 'firebase-auth')
    : 'checking';

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

  const deleteContent = (id) => {
    setContentItems((items) => items.filter((item) => item.id !== id));
    showToast('Journal item deleted.');
  };

  const addPortfolio = async () => {
    if (!studioUser) return;
    try {
      await addCollectionItem('portfolioItems', createPortfolioItem());
      showToast('Portfolio item added.');
    } catch (error) {
      console.error(error);
      showToast('Portfolio item could not be added.', 'error');
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
        version: 1,
        exportedAt: new Date().toISOString(),
        projects,
        contentItems,
        portfolioItems,
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
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.projects) || !Array.isArray(data.contentItems) || !Array.isArray(data.portfolioItems)) {
        throw new Error('Invalid backup file');
      }

      if (Array.isArray(data.projects) && studioUser) {
        await Promise.all(data.projects.map((project) => createFirebaseProject(project)));
      }
      setContentItems(data.contentItems);
      setPortfolioItems(data.portfolioItems);
      showToast('Backup restored.');
    } catch (error) {
      console.error(error);
      showToast('Import failed. Use a valid Studio OS backup file.', 'error');
    } finally {
      event.target.value = '';
    }
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
    <div className="min-h-screen bg-studio-bone text-studio-ink selection:bg-studio-ink/10 selection:text-studio-ink">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-16 px-8 py-12 lg:px-12">
        <StudioOSHeader
          activeProjects={activeProjects}
          contentApproved={contentApproved}
          nextHandover={nextOpening ? formatDate(nextOpening.openingDate) : 'TBD'}
          portfolioCount={portfolioItems.length}
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
          onDisconnect={handleFirebaseSignOut}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleDebug={toggleDebugPanel}
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
          projects={projects}
          selectedArtworkProjectId={selectedArtworkProjectId}
          statusCounts={statusCounts}
          studioUser={studioUser}
          updateContent={updateContent}
          updatePortfolio={updatePortfolio}
          updateProject={updateProject}
        />

        <footer className="border-t border-black/[0.03] pt-16 pb-24 text-center">
          <p className="text-[9px] font-bold uppercase  text-studio-muted/40">
            Be Blank to Behind Studio &bull; Private Environment &bull; v1.0.0
          </p>
        </footer>
      </div>
      <QuickCapture onOpenArtwork={() => handleTabChange('artwork')} />
      <CommandPalette
        commands={commandPaletteCommands}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpen={() => setIsCommandPaletteOpen(true)}
      />
    </div>
  );
}
