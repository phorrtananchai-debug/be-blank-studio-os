import { calculateTimeline } from './dashboard.js';
import { normalizeBillingMilestones } from './billingMilestones.js';
import { normalizeCriticalPath } from './criticalPath.js';
import { normalizeMaterialApprovals } from './materialApprovals.js';
import { normalizeSiteVisits } from './siteVisits.js';
import { getTimelinePhases } from './timeline.js';

const clientSafeStatuses = {
  concept: 'Concept',
  construction: 'Construction',
  design: 'Design Development',
  handover: 'Handover',
  open: 'Complete',
  review: 'Client Review',
};

function compact(value) {
  return String(value || '').trim();
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => compact(item)).filter(Boolean);
  }

  return compact(value)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeImage(image, fallbackAlt = '') {
  if (!image) return null;
  if (typeof image === 'string') {
    const url = compact(image);
    return url ? { alt: fallbackAlt, caption: '', fullUrl: url, mediumUrl: url, thumbnailUrl: url, url } : null;
  }

  const url = image.url || image.fullUrl || image.mediumUrl || image.thumbnailUrl || '';
  if (!url) return null;

  return {
    alt: image.alt || fallbackAlt,
    caption: image.caption || '',
    fullUrl: image.fullUrl || url,
    mediumUrl: image.mediumUrl || image.fullUrl || url,
    thumbnailUrl: image.thumbnailUrl || image.mediumUrl || image.fullUrl || url,
    url,
  };
}

function getPublicNotes(project = {}) {
  return [
    project.publicNotes,
    project.clientNotes,
    project.presentationNotes,
  ]
    .map(compact)
    .filter(Boolean);
}

function getClientDecisions(project = {}) {
  return [
    ...splitList(project.decisionsNeeded),
    ...splitList(project.clientDecisionsNeeded),
    ...splitList(project.presentationDecisions),
  ];
}

function getClientDocuments(project = {}) {
  const documents = Array.isArray(project.keyDocuments) ? project.keyDocuments : [];
  const normalized = documents
    .map((document) => {
      if (typeof document === 'string') {
        return { label: document, status: '', url: document };
      }

      return {
        label: compact(document.label || document.title || document.name),
        status: compact(document.status),
        url: compact(document.url || document.href || document.link),
      };
    })
    .filter((document) => document.label || document.url);

  if (project.drawingLink) {
    normalized.unshift({
      label: project.drawingVersion ? `Drawing package ${project.drawingVersion}` : 'Drawing package',
      status: project.drawingStatus || '',
      url: project.drawingLink,
    });
  }

  return normalized;
}

function getApprovedMaterials(project = {}) {
  const materials = normalizeMaterialApprovals([
    ...(Array.isArray(project.materialApprovals) ? project.materialApprovals : []),
    ...(Array.isArray(project.ffeApprovals) ? project.ffeApprovals : []),
  ]);

  return materials
    .filter((material) => material.visibility === 'client_visible')
    .filter((material) => ['approved', 'waiting_review'].includes(compact(material.approvalState).toLowerCase()))
    .map((material) => ({
      area: compact(material.roomArea),
      category: compact(material.category),
      image: normalizeImage(material.images?.[0], material.name),
      name: compact(material.name) || 'Material selection',
      notes: compact(material.publicNotes || material.clientNotes),
      supplier: compact(material.supplier),
    }));
}

function getClientGallery(project = {}) {
  const images = [
    normalizeImage(project.coverImage, project.name),
    normalizeImage(project.imageUrl, project.name),
    ...(Array.isArray(project.galleryImages) ? project.galleryImages.map((image) => normalizeImage(image, project.name)) : []),
    ...splitList(project.galleryUrls).map((url) => normalizeImage(url, project.name)),
  ].filter(Boolean);
  const seen = new Set();

  return images.filter((image) => {
    const key = image.fullUrl || image.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getClientVisibleSiteVisits(project = {}) {
  const visits = normalizeSiteVisits(project.siteLogs);
  return visits
    .filter((visit) => visit.visibility === 'client_visible')
    .map((visit) => ({
      date: visit.date || '',
      notes: visit.notes || '',
      photos: visit.photos || [],
      title: visit.title || 'Site Visit',
      visibility: visit.visibility,
      issues: (visit.issues || [])
        .filter((issue) => issue.visibility === 'client_visible')
        .map((issue) => ({
          deadline: issue.deadline || '',
          notes: issue.notes || '',
          status: issue.status || 'open',
          title: issue.title || 'Issue',
        })),
    }));
}

function getClientVisibleBillingMilestones(project = {}) {
  return normalizeBillingMilestones(project.billingMilestones)
    .filter((milestone) => milestone.visibility === 'client_visible')
    .map((milestone) => ({
      amount: milestone.amount || '',
      dueDate: milestone.dueDate || '',
      label: milestone.label || 'Billing milestone',
      notes: compact(milestone.publicNotes || milestone.clientNotes),
      status: milestone.status || 'draft',
    }));
}

export function createClientProjectProjection(project = {}) {
  const timeline = calculateTimeline(project);
  const phases = getTimelinePhases(project, timeline);
  const milestones = normalizeCriticalPath(project).map((milestone) => ({
    id: milestone.id,
    label: milestone.label,
    status: milestone.status === 'DONE' ? 'Complete' : milestone.status === 'ACTIVE' ? 'In Progress' : 'Upcoming',
    targetDate: milestone.targetDate || '',
  }));

  return {
    approvedMaterials: getApprovedMaterials(project),
    areaSqm: project.areaSqm || '',
    billingMilestones: getClientVisibleBillingMilestones(project),
    client: project.client || '',
    decisionsNeeded: getClientDecisions(project),
    documents: getClientDocuments(project),
    gallery: getClientGallery(project),
    location: project.location || '',
    milestones,
    name: project.name || 'Untitled Project',
    overview: compact(project.publicOverview || project.clientOverview || project.presentationOverview || project.description) || 'Project overview will be shared as the studio develops the next presentation issue.',
    progressPercent: timeline.progressPercent,
    publicNotes: getPublicNotes(project),
    siteVisits: getClientVisibleSiteVisits(project),
    status: clientSafeStatuses[String(project.status || '').toLowerCase()] || compact(project.status) || 'In Progress',
    timeline: {
      phases: phases.map((phase) => ({
        duration: phase.duration || 0,
        endDate: phase.endDate || '',
        id: phase.id,
        name: phase.name,
        range: phase.range,
        startDate: phase.startDate || '',
      })),
    },
  };
}
