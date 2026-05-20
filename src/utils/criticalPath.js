export const criticalPathStatuses = ['NOT_STARTED', 'ACTIVE', 'WAITING', 'BLOCKED', 'DONE'];
export const criticalPathRiskLevels = ['SAFE', 'WATCH', 'RISK', 'CRITICAL'];

export const criticalPathMilestoneTemplates = [
  { id: 'designFreeze', label: 'Design Freeze', dependsOn: [] },
  { id: 'BOQApproval', label: 'BOQ Approval', dependsOn: ['designFreeze'] },
  { id: 'contractorLock', label: 'Contractor Lock', dependsOn: ['BOQApproval'] },
  { id: 'procurementStart', label: 'Procurement Start', dependsOn: ['contractorLock'] },
  { id: 'siteHandover', label: 'Site Handover', dependsOn: ['procurementStart'] },
  { id: 'constructionStart', label: 'Construction Start', dependsOn: ['siteHandover'] },
  { id: 'storeReady', label: 'Store Ready', dependsOn: ['constructionStart'] },
  { id: 'opening', label: 'Opening', dependsOn: ['storeReady'] },
];

const dayInMs = 1000 * 60 * 60 * 24;

function compact(value) {
  return String(value || '').trim();
}

function normalizeStatus(value) {
  const status = compact(value).toUpperCase();
  return criticalPathStatuses.includes(status) ? status : 'NOT_STARTED';
}

function normalizeRisk(value) {
  const risk = compact(value).toUpperCase();
  return criticalPathRiskLevels.includes(risk) ? risk : 'SAFE';
}

export function parseCriticalDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getCriticalDaysUntil(value) {
  const date = parseCriticalDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / dayInMs);
}

function inferTargetDate(project, id) {
  const values = {
    designFreeze: project.designCompleteDate || '',
    BOQApproval: project.designCompleteDate || '',
    contractorLock: project.designCompleteDate || '',
    procurementStart: project.handoverDate || '',
    siteHandover: project.handoverDate || '',
    constructionStart: project.handoverDate || '',
    storeReady: project.openingDate || '',
    opening: project.openingDate || '',
  };

  return values[id] || '';
}

export function createCriticalPathMilestone(project = {}, template = {}) {
  return {
    dependsOn: template.dependsOn || [],
    id: template.id,
    label: template.label,
    notes: '',
    owner: '',
    riskLevel: 'SAFE',
    status: 'NOT_STARTED',
    targetDate: inferTargetDate(project, template.id),
  };
}

export function normalizeCriticalPath(project = {}) {
  const existing = Array.isArray(project.criticalPath) ? project.criticalPath : [];
  const byId = Object.fromEntries(existing.map((milestone) => [milestone.id, milestone]));

  return criticalPathMilestoneTemplates.map((template) => {
    const saved = byId[template.id] || {};
    const dependsOn = Array.isArray(saved.dependsOn)
      ? saved.dependsOn
      : compact(saved.dependsOn).split(',').map((item) => item.trim()).filter(Boolean);

    return {
      ...createCriticalPathMilestone(project, template),
      ...saved,
      dependsOn: dependsOn.length ? dependsOn : template.dependsOn,
      id: template.id,
      label: saved.label || template.label,
      riskLevel: normalizeRisk(saved.riskLevel),
      status: normalizeStatus(saved.status),
      targetDate: saved.targetDate || inferTargetDate(project, template.id),
    };
  });
}

export function serializeCriticalPath(project = {}) {
  return normalizeCriticalPath(project).map((milestone) => ({
    id: milestone.id,
    label: milestone.label,
    targetDate: milestone.targetDate || '',
    status: normalizeStatus(milestone.status),
    dependsOn: milestone.dependsOn || [],
    owner: milestone.owner || '',
    notes: milestone.notes || '',
    riskLevel: normalizeRisk(milestone.riskLevel),
  }));
}

export function getBlockedCriticalDependencies(milestones = []) {
  const byId = Object.fromEntries(milestones.map((milestone) => [milestone.id, milestone]));
  return milestones.flatMap((milestone) => {
    const dependencies = milestone.dependsOn || [];
    const blocked = dependencies
      .map((id) => byId[id])
      .filter((dependency) => dependency && !['DONE'].includes(normalizeStatus(dependency.status)));

    return blocked.map((dependency) => ({ dependency, milestone }));
  });
}

export function getNextCriticalMilestone(project = {}) {
  const milestones = normalizeCriticalPath(project);
  return milestones.find((milestone) => normalizeStatus(milestone.status) !== 'DONE') || null;
}

export function mergeCriticalPathUpdates(project = {}, updates = []) {
  if (!Array.isArray(updates) || !updates.length) {
    return normalizeCriticalPath(project);
  }

  const normalized = normalizeCriticalPath(project);
  const byId = Object.fromEntries(updates.map((milestone) => [milestone.id, milestone]));

  return normalized.map((milestone) => {
    const update = byId[milestone.id];
    if (!update) return milestone;

    return {
      ...milestone,
      ...(update.targetDate !== undefined ? { targetDate: update.targetDate || '' } : {}),
      ...(update.status ? { status: normalizeStatus(update.status) } : {}),
      ...(update.notes !== undefined ? { notes: update.notes || '' } : {}),
      ...(update.owner !== undefined ? { owner: update.owner || '' } : {}),
      ...(update.riskLevel ? { riskLevel: normalizeRisk(update.riskLevel) } : {}),
      ...(update.dependsOn !== undefined ? { dependsOn: Array.isArray(update.dependsOn) ? update.dependsOn : compact(update.dependsOn).split(',').map((item) => item.trim()).filter(Boolean) } : {}),
    };
  });
}
