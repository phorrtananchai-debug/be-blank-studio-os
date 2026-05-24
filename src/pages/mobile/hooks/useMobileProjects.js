import { useProjectsSubscription } from '../../../hooks/useProjectsSubscription.js';
import { isFirebaseConfigured, updateCollectionItem } from '../../../services/firebase.js';

export function useMobileProjects(user) {
  const { projects } = useProjectsSubscription({ enabled: Boolean(user) });

  const updateProject = async (id, updates) => {
    if (!isFirebaseConfigured() || !id) return false;
    try {
      await updateCollectionItem('projects', id, updates);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  return { projects, updateProject };
}
