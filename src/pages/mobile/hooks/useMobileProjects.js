import { useProjectsSubscription } from '../../../hooks/useProjectsSubscription.js';

export function useMobileProjects(user) {
  const { projects } = useProjectsSubscription({ enabled: Boolean(user) });
  return projects;
}
