const DEFAULT_STATUS = 'draft';
const DEFAULT_VISIBILITY = 'internal';

export const billingMilestoneStatuses = ['draft', 'sent', 'paid', 'overdue'];
export const billingVisibilityOptions = ['internal', 'client_visible'];

function compact(value) {
  return String(value || '').trim();
}

function toAmountString(value) {
  const input = compact(value);
  if (!input) return '';
  const numeric = Number(input.replace(/,/g, ''));
  if (Number.isNaN(numeric)) return '';
  return String(numeric);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createBillingMilestoneDraft() {
  return {
    id: makeId('billing'),
    label: '',
    amount: '',
    dueDate: '',
    status: DEFAULT_STATUS,
    notes: '',
    visibility: DEFAULT_VISIBILITY,
    clientNotes: '',
    publicNotes: '',
  };
}

export function normalizeBillingMilestone(input = {}, index = 0) {
  const status = compact(input.status).toLowerCase();
  const visibility = compact(input.visibility).toLowerCase();

  return {
    id: compact(input.id) || makeId(`billing-${index}`),
    label: compact(input.label || input.title || input.name),
    amount: toAmountString(input.amount),
    dueDate: compact(input.dueDate || input.date),
    status: billingMilestoneStatuses.includes(status) ? status : DEFAULT_STATUS,
    notes: compact(input.notes),
    visibility: billingVisibilityOptions.includes(visibility) ? visibility : DEFAULT_VISIBILITY,
    clientNotes: compact(input.clientNotes),
    publicNotes: compact(input.publicNotes),
  };
}

export function normalizeBillingMilestones(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => normalizeBillingMilestone(item, index));
}

export function serializeBillingMilestone(value = {}) {
  return {
    id: compact(value.id) || makeId('billing'),
    label: compact(value.label),
    amount: toAmountString(value.amount),
    dueDate: compact(value.dueDate),
    status: billingMilestoneStatuses.includes(value.status) ? value.status : DEFAULT_STATUS,
    notes: compact(value.notes),
    visibility: billingVisibilityOptions.includes(value.visibility) ? value.visibility : DEFAULT_VISIBILITY,
    clientNotes: compact(value.clientNotes),
    publicNotes: compact(value.publicNotes),
  };
}

export function serializeBillingMilestones(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => serializeBillingMilestone(item));
}
