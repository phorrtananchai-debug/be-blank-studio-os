const DEFAULT_APPROVAL_STATE = 'proposed';
const DEFAULT_VISIBILITY = 'internal';

export const materialApprovalStates = [
  'proposed',
  'waiting_review',
  'approved',
  'rejected',
  'revised',
];

export const materialVisibilityOptions = ['internal', 'client_visible'];

function compact(value) {
  return String(value || '').trim();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeImageEntry(image) {
  if (!image) return null;
  if (typeof image === 'string') {
    const url = compact(image);
    return url ? { url } : null;
  }

  const url = compact(image.url || image.fullUrl || image.mediumUrl || image.thumbnailUrl);
  if (!url) return null;

  return {
    alt: compact(image.alt),
    caption: compact(image.caption),
    fullUrl: compact(image.fullUrl),
    mediumUrl: compact(image.mediumUrl),
    thumbnailUrl: compact(image.thumbnailUrl),
    url,
  };
}

function normalizeImageList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeImageEntry(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|,/)
      .map((item) => normalizeImageEntry(item))
      .filter(Boolean);
  }

  return [];
}

function normalizeAlternatives(value) {
  if (Array.isArray(value)) {
    return value.map((item) => compact(item)).filter(Boolean);
  }

  return compact(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createMaterialApprovalDraft() {
  return {
    id: makeId('material'),
    name: '',
    category: '',
    roomArea: '',
    supplier: '',
    leadTime: '',
    approvalState: DEFAULT_APPROVAL_STATE,
    notes: '',
    alternatives: [],
    images: [],
    visibility: DEFAULT_VISIBILITY,
  };
}

export function normalizeMaterialApproval(input = {}, index = 0) {
  const approvalState = compact(input.approvalState || input.status).toLowerCase();
  const visibility = compact(input.visibility).toLowerCase();

  return {
    id: compact(input.id) || makeId(`material-${index}`),
    name: compact(input.name || input.label || input.title),
    category: compact(input.category || input.type),
    roomArea: compact(input.roomArea || input.area || input.room),
    supplier: compact(input.supplier),
    leadTime: compact(input.leadTime || input.leadtime),
    approvalState: materialApprovalStates.includes(approvalState) ? approvalState : DEFAULT_APPROVAL_STATE,
    notes: compact(input.notes),
    clientNotes: compact(input.clientNotes),
    publicNotes: compact(input.publicNotes),
    alternatives: normalizeAlternatives(input.alternatives),
    images: normalizeImageList(input.images || input.image || input.coverImage),
    visibility: materialVisibilityOptions.includes(visibility) ? visibility : DEFAULT_VISIBILITY,
  };
}

export function normalizeMaterialApprovals(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeMaterialApproval(item, index));
}

export function serializeMaterialApproval(material = {}) {
  return {
    id: compact(material.id) || makeId('material'),
    name: compact(material.name),
    category: compact(material.category),
    roomArea: compact(material.roomArea),
    supplier: compact(material.supplier),
    leadTime: compact(material.leadTime),
    approvalState: materialApprovalStates.includes(material.approvalState) ? material.approvalState : DEFAULT_APPROVAL_STATE,
    notes: compact(material.notes),
    clientNotes: compact(material.clientNotes),
    publicNotes: compact(material.publicNotes),
    alternatives: normalizeAlternatives(material.alternatives),
    images: normalizeImageList(material.images),
    visibility: materialVisibilityOptions.includes(material.visibility) ? material.visibility : DEFAULT_VISIBILITY,
  };
}

export function serializeMaterialApprovals(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => serializeMaterialApproval(item));
}
