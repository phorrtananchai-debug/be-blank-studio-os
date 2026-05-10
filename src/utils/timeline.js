import { formatDate } from './dashboard.js';

export function getTimelinePhases(project, timeline) {
  return [
    {
      name: 'Design',
      duration: timeline.designDays,
      range: formatPhaseRange(project.startDate, project.designCompleteDate),
    },
    {
      name: 'Construction',
      duration: timeline.constructionDays,
      range: formatPhaseRange(project.designCompleteDate, project.handoverDate),
    },
    {
      name: 'Handover',
      duration: project.handoverDate ? 1 : 0,
      range: project.handoverDate ? formatDate(project.handoverDate) : 'TBD',
    },
    {
      name: 'Training / Setup',
      duration: timeline.handoverToOpeningDays,
      range: formatPhaseRange(project.handoverDate, project.openingDate),
    },
    {
      name: 'Opening',
      duration: project.openingDate ? 1 : 0,
      range: project.openingDate ? formatDate(project.openingDate) : 'TBD',
    },
  ];
}

export function formatPhaseRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'TBD';
  }

  return `${startDate ? formatDate(startDate) : 'TBD'} — ${endDate ? formatDate(endDate) : 'TBD'}`;
}
