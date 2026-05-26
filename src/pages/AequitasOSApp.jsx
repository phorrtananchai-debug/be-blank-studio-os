import { useMemo, useRef } from 'react';
import { Button } from '../components/Button.jsx';
import { AequitasHeader } from '../components/aequitas-os/AequitasHeader.jsx';
import { AequitasNavigation } from '../components/aequitas-os/AequitasNavigation.jsx';
import { AequitasToolbar } from '../components/aequitas-os/AequitasToolbar.jsx';
import { AequitasWorkspaceContent } from '../components/aequitas-os/AequitasWorkspaceContent.jsx';
import { useAequitasCore } from '../hooks/useAequitasCore.js';
import { useToastMessage } from '../hooks/useToastMessage.js';

const downloadTextFile = (filename, text, contentType = 'application/json;charset=utf-8') => {
  const blob = new Blob([text], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const readFileText = async (file) => file.text();

export function AequitasOSApp({ navigate, routePath }) {
  const { derived, actions, ...state } = useAequitasCore();
  const { toast, showToast } = useToastMessage();
  const importInputRef = useRef(null);
  const backupInputRef = useRef(null);

  const activeTab = useMemo(() => {
    const segment = String(routePath || '').replace(/^\/os\/?/, '').split('/')[0];
    return segment || 'dashboard';
  }, [routePath]);

  const handleTabChange = (tabId) => {
    navigate(tabId === 'dashboard' ? '/os' : `/os/${tabId}`);
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(derived.aiPromptText);
      showToast('AI prompt copied.', 'success');
    } catch {
      showToast('Clipboard copy failed.', 'error');
    }
  };

  const handleExportPrompt = () => {
    downloadTextFile('aequitas-ai-prompt.txt', derived.aiPromptText, 'text/plain;charset=utf-8');
    showToast('AI prompt exported.', 'success');
  };

  const handleExportBackup = () => {
    downloadTextFile(`aequitas-backup-${new Date().toISOString().slice(0, 10)}.json`, actions.exportBackup());
    showToast('Backup exported.', 'success');
  };

  const handleImportAiPlan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileText(file);
      const result = actions.importAiPlanFromJson(content);
      if (!result.valid) throw new Error(result.errors[0] || 'AI import failed.');
      showToast('AI plan imported.', 'success');
    } catch (error) {
      showToast(error.message || 'AI import failed.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFileText(file);
      actions.importBackup(content);
      showToast('Backup restored.', 'success');
    } catch (error) {
      showToast(error.message || 'Backup import failed.', 'error');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="studio-os-shell min-h-screen bg-studio-paper text-studio-ink selection:bg-studio-ink/10 selection:text-studio-ink">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-16 px-8 py-12 lg:px-12">
        <AequitasHeader derived={derived} onBackHome={() => navigate('/')} />

        <AequitasToolbar
          backupInputRef={backupInputRef}
          importInputRef={importInputRef}
          onCopyPrompt={handleCopyPrompt}
          onExportBackup={handleExportBackup}
          onExportPrompt={handleExportPrompt}
          onImportAiPlan={handleImportAiPlan}
          onImportBackup={handleImportBackup}
          onResetToEmpty={() => {
            actions.resetToEmpty();
            showToast('Workspace reset to empty.', 'warning');
          }}
          onResetToSample={() => {
            actions.resetToSample();
            showToast('Sample workspace restored.', 'success');
          }}
          toast={toast}
        />

        <AequitasNavigation activeTab={activeTab} onTabChange={handleTabChange} />

        <AequitasWorkspaceContent
          activeTab={activeTab}
          derived={derived}
          navigate={navigate}
          showToast={showToast}
          state={state}
          actions={actions}
        />

        <footer className="border-t border-black/[0.03] pb-24 pt-16 text-center">
          <p className="text-[9px] font-bold uppercase text-studio-muted/40">
            Aequitas • local-first AI investment operating system • private workspace
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => handleTabChange('ai-workflow')}>
              Open AI Workflow
            </Button>
            <Button variant="secondary" onClick={() => handleTabChange('snapshots')}>
              Open Snapshots
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AequitasOSApp;
