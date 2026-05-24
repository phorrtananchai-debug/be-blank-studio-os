const defaultVisitStatus = 'open';
const defaultIssueStatus = 'open';
const defaultVisibility = 'internal';

export const siteVisitStatuses = ['open', 'in_progress', 'resolved', 'deferred'];
export const siteVisibilityOptions = ['internal', 'client_visible'];

function compact(value) {
  return String(value || '').trim();
}

function normalizeStatus(value, options, fallback) {
  const normalized = compact(value).toLowerCase();
  return options.includes(normalized) ? normalized : fallback;
}

export function createSiteIssueDraft(input = {}) {
  return {
    id: input.id || createLocalId('issue'),
    linkedMilestone: compact(input.linkedMilestone),
    notes: compact(input.notes || input.detail),
    assignedTo: compact(input.assignedTo),
    deadline: compact(input.deadline),
    status: normalizeStatus(input.status, siteVisitStatuses, defaultIssueStatus),
    title: compact(input.title) || 'Issue',
    visibility: normalizeStatus(input.visibility, siteVisibilityOptions, defaultVisibility),
    legacyText: compact(input.legacyText),
  };
}

export function createSiteVisitDraft(input = {}) {
  return {
    id: input.id || createLocalId('visit'),
    title: compact(input.title) || 'Site Visit',
    date: compact(input.date) || new Date().toISOString().slice(0, 10),
    attendees: compact(input.attendees),
    contractor: compact(input.contractor),
    notes: compact(input.notes),
    photos: normalizePhotoList(input.photos || input.imageLink || ''),
    issues: normalizeSiteIssues(input.issues),
    status: normalizeStatus(input.status, siteVisitStatuses, defaultVisitStatus),
    assignedTo: compact(input.assignedTo),
    deadline: compact(input.deadline),
    visibility: normalizeStatus(input.visibility, siteVisibilityOptions, defaultVisibility),
    imageLink: compact(input.imageLink),
    legacyIssuesText: compact(input.legacyIssuesText),
  };
}

export function normalizeSiteIssues(value) {
  if (Array.isArray(value)) {
    return value.map((issue) => createSiteIssueDraft(issue));
  }

  const legacyText = compact(value);
  if (!legacyText) return [];

  return [
    createSiteIssueDraft({
      legacyText,
      notes: legacyText,
      title: 'Legacy issue',
      visibility: defaultVisibility,
    }),
  ];
}

export function normalizePhotoList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => compact(item)).filter(Boolean);
  }

  return compact(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSiteVisit(entry = {}) {
  const normalized = createSiteVisitDraft({
    ...entry,
    issues: Array.isArray(entry.issues) ? entry.issues : entry.issues || '',
    legacyIssuesText: typeof entry.issues === 'string' ? entry.issues : entry.legacyIssuesText,
  });

  return {
    ...normalized,
    issues: normalized.issues.map((issue) => ({
      ...issue,
      notes: compact(issue.notes) || compact(issue.legacyText),
      title: compact(issue.title) || 'Issue',
    })),
  };
}

export function normalizeSiteVisits(siteLogs = []) {
  return Array.isArray(siteLogs) ? siteLogs.map((entry) => normalizeSiteVisit(entry)) : [];
}

export function serializeSiteVisit(visit = {}) {
  const issues = Array.isArray(visit.issues)
    ? visit.issues.map((issue) => ({
      id: issue.id,
      title: issue.title || 'Issue',
      notes: issue.notes || issue.legacyText || '',
      status: normalizeStatus(issue.status, siteVisitStatuses, defaultIssueStatus),
      assignedTo: issue.assignedTo || '',
      deadline: issue.deadline || '',
      linkedMilestone: issue.linkedMilestone || '',
      visibility: normalizeStatus(issue.visibility, siteVisibilityOptions, defaultVisibility),
      legacyText: issue.legacyText || '',
    }))
    : [];

  return {
    id: visit.id || createLocalId('visit'),
    title: visit.title || 'Site Visit',
    date: visit.date || '',
    attendees: visit.attendees || '',
    contractor: visit.contractor || '',
    notes: visit.notes || '',
    photos: normalizePhotoList(visit.photos),
    issues,
    status: normalizeStatus(visit.status, siteVisitStatuses, defaultVisitStatus),
    assignedTo: visit.assignedTo || '',
    deadline: visit.deadline || '',
    visibility: normalizeStatus(visit.visibility, siteVisibilityOptions, defaultVisibility),
    imageLink: visit.imageLink || normalizePhotoList(visit.photos)[0] || '',
    legacyIssuesText: visit.legacyIssuesText || '',
  };
}

export function serializeSiteVisits(visits = []) {
  return Array.isArray(visits) ? visits.map((visit) => serializeSiteVisit(visit)) : [];
}

function createLocalId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}
