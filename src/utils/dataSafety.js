import { mergeCriticalPathUpdates } from './criticalPath.js';

export const aiImportSnapshotKey = 'beBlank.aiImportSnapshots.v1';

const fieldMap = [
  { incoming: 'currentPriority', label: 'Current priority', target: 'currentFocus' },
  { incoming: 'deliveryConstraints', label: 'Delivery constraints', target: 'phaseNotes' },
  { incoming: 'status', label: 'Status', target: 'status' },
  { incoming: 'pressureState', label: 'Pressure state', target: 'intelligencePressureState' },
  { incoming: 'dependencies', label: 'Dependencies', target: 'dependencies' },
  { incoming: 'nextDecision', label: 'Next decision', target: 'currentFocus' },
  { incoming: 'procurementStatus', label: 'Procurement status', target: 'procurementStatus' },
  { incoming: 'handoverReadiness', label: 'Handover readiness', target: 'handoverReadiness' },
];

function compact(value) {
  return String(value || '').trim();
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  return compact(value).length > 0;
}

function areEqual(left, right) {
  return JSON.stringify(left ?? '') === JSON.stringify(right ?? '');
}

export function buildAnalysisDiffPreview({ analysis, findProject }) {
  const projectDiffs = (analysis?.projectUpdates || []).map((projectUpdate) => {
    const project = findProject(projectUpdate);
    const changes = [];
    const skipped = [];

    fieldMap.forEach((field) => {
      const incomingValue = projectUpdate[field.incoming];
      if (!hasMeaningfulValue(incomingValue)) {
        if (Object.prototype.hasOwnProperty.call(projectUpdate, field.incoming)) {
          skipped.push({ field: field.label, reason: 'Incoming value is empty.' });
        }
        return;
      }

      const before = project?.[field.target] || '';
      if (!areEqual(before, incomingValue)) {
        changes.push({
          after: incomingValue,
          before,
          field: field.label,
          target: field.target,
        });
      }
    });

    if (Array.isArray(projectUpdate.risks) && projectUpdate.risks.length) {
      changes.push({
        after: projectUpdate.risks,
        before: project?.intelligenceRisks || [],
        field: 'Intelligence risks',
        target: 'intelligenceRisks',
      });
    } else if (Array.isArray(projectUpdate.risks)) {
      skipped.push({ field: 'Intelligence risks', reason: 'Incoming array is empty.' });
    }

    if (Array.isArray(projectUpdate.recommendedNextActions) && projectUpdate.recommendedNextActions.length) {
      changes.push({
        after: projectUpdate.recommendedNextActions.join('\n'),
        before: project?.nextAction || '',
        field: 'Recommended next actions',
        target: 'nextAction',
      });
    } else if (Array.isArray(projectUpdate.recommendedNextActions)) {
      skipped.push({ field: 'Recommended next actions', reason: 'Incoming array is empty.' });
    }

    if (Array.isArray(projectUpdate.criticalPath) && projectUpdate.criticalPath.length) {
      const merged = project ? mergeCriticalPathUpdates(project, projectUpdate.criticalPath) : [];
      changes.push({
        after: projectUpdate.criticalPath,
        before: project?.criticalPath || [],
        field: 'Critical path updates',
        target: 'criticalPath',
        merged,
      });
    } else if (Array.isArray(projectUpdate.criticalPath)) {
      skipped.push({ field: 'Critical path updates', reason: 'Incoming array is empty.' });
    }

    return {
      changes,
      projectId: project?.id || projectUpdate.projectId || '',
      projectName: project?.name || projectUpdate.projectName || projectUpdate.projectId || 'Unknown project',
      skipped,
      suggestedTasks: Array.isArray(projectUpdate.suggestedTasks) ? projectUpdate.suggestedTasks.filter((task) => task) : [],
    };
  });

  return {
    newTasks: Array.isArray(analysis?.newTasks) ? analysis.newTasks.filter(Boolean) : [],
    notes: Array.isArray(analysis?.notes) ? analysis.notes.filter(Boolean) : [],
    projectDiffs,
    summary: compact(analysis?.summary),
  };
}

export function readAiImportSnapshots() {
  if (typeof window === 'undefined') return [];
  try {
    const snapshots = JSON.parse(window.localStorage.getItem(aiImportSnapshotKey) || '[]');
    return Array.isArray(snapshots) ? snapshots : [];
  } catch {
    return [];
  }
}

export function getLatestAiImportSnapshot() {
  return readAiImportSnapshots()[0] || null;
}

export function writeAiImportSnapshot(snapshot) {
  if (typeof window === 'undefined') return [];
  const snapshots = [snapshot, ...readAiImportSnapshots()].slice(0, 5);
  window.localStorage.setItem(aiImportSnapshotKey, JSON.stringify(snapshots));
  return snapshots;
}

export function createAiImportSnapshot({ actionType = 'ai-analysis-import', analysis, contentItems = [], projects = [], tasks = [] }) {
  const affectedProjectIds = (analysis?.projectUpdates || [])
    .map((projectUpdate) => projectUpdate.projectId || projects.find((project) => compact(project.name).toLowerCase() === compact(projectUpdate.projectName).toLowerCase())?.id)
    .filter(Boolean);
  const affectedProjectSet = new Set(affectedProjectIds);

  return {
    actionType,
    affectedProjectIds: [...affectedProjectSet],
    createdAt: new Date().toISOString(),
    id: `snapshot-${Date.now()}`,
    records: {
      contentItems,
      projects: projects.filter((project) => affectedProjectSet.has(project.id)),
      tasks: tasks.filter((task) => affectedProjectSet.has(task.projectId)),
    },
    schema: 'be-blank-studio-recovery-snapshot-v1',
    source: {
      analysisGeneratedAt: analysis?.generatedAt || '',
      analysisSummary: analysis?.summary || '',
    },
  };
}

export function applySafeAnalysisProjectUpdates({ project, projectUpdate, historyEntry }) {
  const updates = {};

  fieldMap.forEach((field) => {
    const incomingValue = projectUpdate[field.incoming];
    if (hasMeaningfulValue(incomingValue)) {
      updates[field.target] = incomingValue;
    }
  });

  if (Array.isArray(projectUpdate.risks) && projectUpdate.risks.length) {
    updates.intelligenceRisks = projectUpdate.risks;
  }

  if (Array.isArray(projectUpdate.criticalPath) && projectUpdate.criticalPath.length) {
    updates.criticalPath = mergeCriticalPathUpdates(project, projectUpdate.criticalPath);
  }

  if (Array.isArray(projectUpdate.recommendedNextActions) && projectUpdate.recommendedNextActions.length) {
    updates.nextAction = projectUpdate.recommendedNextActions.join('\n');
  }

  const previousHistory = Array.isArray(project.intelligenceHistory) ? project.intelligenceHistory : [];
  updates.intelligenceHistory = [...previousHistory, historyEntry].slice(-20);

  return updates;
}
