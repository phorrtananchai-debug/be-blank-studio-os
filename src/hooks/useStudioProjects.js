import { useProjectsSubscription } from './useProjectsSubscription.js';

export function useStudioProjects(user) {
  return useProjectsSubscription({ enabled: Boolean(user) });
}
