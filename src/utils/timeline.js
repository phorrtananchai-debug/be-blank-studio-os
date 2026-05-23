import { formatDate } from './dashboard.js';

export function getTimelinePhases(project, timeline) {
  const designDays = timeline.designDays;
  const constructionDays = timeline.constructionDays;
  const handoverToOpeningDays = timeline.handoverToOpeningDays;

  // Cinematic / Extended phases as per PR 2
  const phases = [
    {
      name: 'Design',
      duration: Math.ceil(designDays * 0.6) || 0,
      range: 'Initial concept & spatial story',
    },
    {
      name: 'Client Review',
      duration: Math.ceil(designDays * 0.2) || 0,
      range: 'Feedback loops & alignment',
    },
    {
      name: 'Revision',
      duration: Math.ceil(designDays * 0.2) || 0,
      range: 'Finalizing architectural intent',
    },
    {
      name: 'Procurement',
      duration: Math.ceil(constructionDays * 0.3) || 0,
      range: 'Material & FF&E coordination',
    },
    {
      name: 'Construction',
      duration: Math.ceil(constructionDays * 0.6) || 0,
      range: 'On-site execution & management',
    },
    {
      name: 'Styling / Handover',
      duration: Math.ceil(constructionDays * 0.1) + handoverToOpeningDays || 0,
      range: 'Final details & slow arrival',
    }
  ];

  return phases;
}

export function formatPhaseRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return 'TBD';
  }

  return `${startDate ? formatDate(startDate) : 'TBD'} — ${endDate ? formatDate(endDate) : 'TBD'}`;
}
