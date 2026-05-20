const millisecondsPerDay = 1000 * 60 * 60 * 24;

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const difference = Math.round((end - start) / millisecondsPerDay);
  return Number.isFinite(difference) && difference > 0 ? difference : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function calculateProjectFinancials(project) {
  const areaSqm = toNumber(project.areaSqm);
  const ratePerSqm = toNumber(project.ratePerSqm);
  const automaticProjectValue = areaSqm * ratePerSqm;
  const useManualProjectValue = Boolean(project.useManualProjectValue);
  const projectValue = useManualProjectValue ? toNumber(project.projectValue) : automaticProjectValue;
  const timeCost = toNumber(project.hoursWorked) * toNumber(project.hourlyRate);
  const totalCost =
    toNumber(project.designCost) +
    toNumber(project.perspectiveCost) +
    toNumber(project.workingDrawingCost) +
    toNumber(project.revisionCost) +
    toNumber(project.transportCost) +
    toNumber(project.siteVisitCost) +
    toNumber(project.miscCost) +
    timeCost;
  const profit = projectValue - totalCost;
  const marginPercent = projectValue ? Math.round((profit / projectValue) * 100) : 0;
  const profitStatus = profit < 0 ? 'loss' : marginPercent < 15 ? 'watch' : 'healthy';

  return {
    areaSqm,
    ratePerSqm,
    automaticProjectValue,
    projectValue,
    timeCost,
    totalCost,
    profit,
    marginPercent,
    profitStatus,
  };
}

export function formatTHB(value) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function calculateTimeline(project) {
  const actualCost = Number(project.actualCost) || 0;
  const totalBudget = Number(project.totalBudget) || 0;
  const designDays = daysBetween(project.startDate, project.designCompleteDate);
  const constructionDays = daysBetween(project.designCompleteDate, project.handoverDate);
  const handoverToOpeningDays = daysBetween(project.handoverDate, project.openingDate);
  const isRisky = constructionDays > 0 && constructionDays < 30;
  const today = new Date().toISOString().slice(0, 10);
  const totalProjectDays = daysBetween(project.startDate, project.openingDate);
  const totalDeliveryDays = daysBetween(project.startDate, project.handoverDate);
  const elapsedDeliveryDays = daysBetween(project.startDate, today);
  const daysLeftToHandover = daysBetween(today, project.handoverDate);
  const daysRemainingToOpening = daysBetween(today, project.openingDate);
  const progressBaseDays = totalProjectDays || totalDeliveryDays;
  const progressPercent = progressBaseDays ? clamp(Math.round((elapsedDeliveryDays / progressBaseDays) * 100), 0, 100) : 0;
  const isComplete = project.status === 'open';
  const effectiveProgress = isComplete ? 100 : progressPercent;
  const riskLevel = isRisky ? 'High' : daysRemainingToOpening > 0 && daysRemainingToOpening < 14 ? 'Medium' : 'Low';
  const hasOpeningDate = Boolean(project.openingDate);
  const deliveryPressure = isComplete
    ? 'safe'
    : !hasOpeningDate
      ? 'tight'
      : riskLevel === 'High' || daysRemainingToOpening <= 7 || effectiveProgress >= 92
        ? 'critical'
        : riskLevel === 'Medium' || daysRemainingToOpening <= 21 || effectiveProgress >= 78
          ? 'tight'
          : 'safe';

  return {
    designDays,
    constructionDays,
    handoverToOpeningDays,
    totalProjectDays,
    daysLeftToHandover: isComplete ? 0 : daysLeftToHandover,
    daysRemainingToOpening: isComplete ? 0 : daysRemainingToOpening,
    progressPercent: effectiveProgress,
    budgetUsedPercent: totalBudget ? clamp(Math.round((actualCost / totalBudget) * 100), 0, 999) : 0,
    riskLevel,
    deliveryPressure,
    riskClass: riskLevel === 'High'
      ? 'border-red-700/20 bg-red-100/50 text-red-800'
      : riskLevel === 'Medium'
        ? 'border-amber-700/20 bg-amber-100/50 text-amber-800'
        : 'border-emerald-700/20 bg-emerald-100/50 text-emerald-800',
    riskBarClass: riskLevel === 'High'
      ? 'bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.14)]'
      : riskLevel === 'Medium'
        ? 'bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.12)]'
        : 'bg-studio-orange shadow-[0_0_16px_rgba(255,136,0,0.14)]',
    riskTextClass: riskLevel === 'High' ? 'text-red-700' : riskLevel === 'Medium' ? 'text-amber-700' : 'text-emerald-700',
  };
}

export function countByStatus(items, statuses) {
  return statuses.reduce((counts, status) => {
    counts[status] = items.filter((item) => item.status === status).length;
    return counts;
  }, {});
}

export function createProject() {
  return {
    id: createId('project'),
    name: 'Untitled Project',
    client: '',
    location: '',
    status: 'concept',
    owner: '',
    startDate: '',
    designCompleteDate: '',
    handoverDate: '',
    openingDate: '',
    notes: '',
    blockers: '',
    nextAction: '',
    areaSqm: '',
    ratePerSqm: '',
    projectValue: '',
    targetCost: '',
    useManualProjectValue: false,
    designCost: '',
    perspectiveCost: '',
    workingDrawingCost: '',
    revisionCost: '',
    transportCost: '',
    siteVisitCost: '',
    miscCost: '',
    hoursWorked: '',
    hourlyRate: '',
    totalBudget: '',
    estimatedCost: '',
    actualCost: '',
    drawingLink: '',
    drawingVersion: '',
    drawingStatus: 'draft',
    siteLogs: [],
    // Narrative Layer
    mood: '',
    currentFocus: '',
    timelineEnergy: 'steady',
    phaseNotes: '',
    inspirationCount: 0,
    atmosphericDescriptors: '',
  };
}

export function createContentItem() {
  return {
    id: createId('content'),
    title: 'Untitled Post',
    platform: 'Instagram',
    captionTH: '',
    captionEN: '',
    status: 'idea',
  };
}

export function createPortfolioItem(overrides = {}) {
  return {
    id: createId('portfolio'),
    title: 'Untitled Project',
    subtitle: '',
    client: '',
    location: '',
    year: '',
    category: '',
    areaSqm: '',
    imageUrl: '',
    galleryUrls: '',
    description: '',
    concept: '',
    credits: '',
    tags: '',
    x: '',
    y: '',
    width: '',
    height: '',
    zIndex: '',
    galleryImages: [],
    coverImage: null,
    ...overrides,
  };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCalendarDate(date) {
  return date.replaceAll('-', '');
}

function addOneDay(date) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  return nextDate.toISOString().slice(0, 10);
}

function sanitizeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'calendar-event';
}

function escapeIcsText(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');
}

export function createCalendarEvent(project, date, label) {
  const title = `${project.name || 'Project'} - ${label}`;
  const description = [
    project.client ? `Client: ${project.client}` : '',
    project.location ? `Location: ${project.location}` : '',
    project.notes ? `Notes: ${project.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title,
    description,
    location: project.location || '',
    startDate: date,
    endDate: addOneDay(date),
  };
}

export function createGoogleCalendarUrl(project, date, label) {
  const event = createCalendarEvent(project, date, label);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatCalendarDate(event.startDate)}/${formatCalendarDate(event.endDate)}`,
    details: event.description,
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsCalendarEvent(project, date, label) {
  const event = createCalendarEvent(project, date, label);
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Be Blank Studio OS//Project Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@be-blank-studio-os`,
    `DTSTAMP:${timestamp}Z`,
    `DTSTART;VALUE=DATE:${formatCalendarDate(event.startDate)}`,
    `DTEND;VALUE=DATE:${formatCalendarDate(event.endDate)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(event.title)}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatDate(date) {
  if (!date) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short' }).format(new Date(date));
}
