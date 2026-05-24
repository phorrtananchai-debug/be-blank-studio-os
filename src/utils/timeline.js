import { formatDate } from './dashboard.js';
import { normalizeCriticalPath } from './criticalPath.js';

export const timelinePhaseDefinitions = [
  {
    id: 'design',
    name: 'Design',
    startField: 'startDate',
    endField: 'designCompleteDate',
    milestoneIds: ['designFreeze'],
  },
  {
    id: 'clientReview',
    name: 'Client Review',
    startField: 'designCompleteDate',
    endField: 'clientReviewDate',
    fallbackEndField: 'designCompleteDate',
    milestoneIds: ['BOQApproval'],
  },
  {
    id: 'revision',
    name: 'Revision',
    startField: 'clientReviewDate',
    fallbackStartField: 'designCompleteDate',
    endField: 'revisionCompleteDate',
    fallbackEndField: 'designCompleteDate',
    milestoneIds: ['contractorLock'],
  },
  {
    id: 'procurement',
    name: 'Procurement',
    startField: 'revisionCompleteDate',
    fallbackStartField: 'designCompleteDate',
    endField: 'handoverDate',
    milestoneIds: ['procurementStart', 'siteHandover'],
  },
  {
    id: 'construction',
    name: 'Construction',
    startField: 'handoverDate',
    endField: 'openingDate',
    milestoneIds: ['constructionStart', 'storeReady'],
  },
  {
    id: 'handover',
    name: 'Styling / Handover',
    startField: 'handoverDate',
    endField: 'openingDate',
    milestoneIds: ['opening'],
  },
];

export function getTimelinePhases(project, timeline) {
  return timelinePhaseDefinitions.map((phase) => {
    const startDate = getProjectPhaseDate(project, phase.startField, phase.fallbackStartField);
    const endDate = getProjectPhaseDate(project, phase.endField, phase.fallbackEndField);
    const duration = startDate || endDate
      ? calculatePhaseDays(startDate, endDate)
      : getLegacyPhaseDuration(phase.id, project, timeline);

    return {
      ...phase,
      duration,
      endDate,
      range: formatPhaseRange(startDate, endDate),
      startDate,
    };
  });
}

export function formatPhaseRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'TBD';
  }

  return `${startDate ? formatDate(startDate) : 'TBD'} - ${endDate ? formatDate(endDate) : 'TBD'}`;
}

export function getProjectTimelineDateRange(project = {}) {
  const dates = [
    project.startDate,
    project.designCompleteDate,
    project.clientReviewDate,
    project.revisionCompleteDate,
    project.handoverDate,
    project.openingDate,
    ...normalizeCriticalPath(project).map((milestone) => milestone.targetDate),
  ]
    .map(parseTimelineDate)
    .filter(Boolean)
    .sort((left, right) => left - right);

  return {
    end: dates[dates.length - 1] || null,
    start: dates[0] || null,
  };
}

export function getProjectPhaseDate(project = {}, field, fallbackField = '') {
  return project[field] || (fallbackField ? project[fallbackField] : '') || '';
}

export function parseTimelineDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculatePhaseDays(startDate, endDate) {
  const start = parseTimelineDate(startDate);
  const end = parseTimelineDate(endDate);
  if (!start && !end) return 0;
  if (!start || !end) return 1;
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) || 1);
}

export function analyzeTimelineRealism(phases = []) {
  const phaseById = Object.fromEntries(phases.map((phase) => [phase.id, phase]));
  const procurementDays = Number(phaseById.procurement?.duration) || 0;
  const constructionDays = Number(phaseById.construction?.duration) || 0;
  const handoverDays = Number(phaseById.handover?.duration) || 0;
  const designDays = Number(phaseById.design?.duration) || 0;
  const clientReviewDays = Number(phaseById.clientReview?.duration) || 0;
  const revisionDays = Number(phaseById.revision?.duration) || 0;

  const warnings = [];
  let severity = 0;

  if (procurementDays > 0 && constructionDays > 0 && procurementDays > constructionDays * 1.25) {
    warnings.push('Procurement is longer than construction. Confirm lead times and site sequencing.');
    severity += 1;
  }

  if (constructionDays > 0 && handoverDays > 0 && constructionDays < handoverDays) {
    warnings.push('Construction is shorter than styling/handover. Re-check practical build duration.');
    severity += 1;
  }

  if (constructionDays > 0 && constructionDays < 10) {
    warnings.push('Construction duration looks very short for a built project.');
    severity += 2;
  }

  if (designDays > 0 && (clientReviewDays + revisionDays) > designDays * 1.5) {
    warnings.push('Client review and revision time outweigh core design duration.');
    severity += 1;
  }

  return {
    severity,
    warnings,
  };
}

function getLegacyPhaseDuration(phaseId, project, timeline) {
  if (phaseId === 'design') return timeline.designDays;
  if (phaseId === 'construction') return timeline.constructionDays;
  if (phaseId === 'handover') return project.openingDate ? Math.max(1, timeline.handoverToOpeningDays) : 0;
  return 0;
}
