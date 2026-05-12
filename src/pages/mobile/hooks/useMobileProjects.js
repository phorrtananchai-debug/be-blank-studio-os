import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../../../services/firebase.js';
import { subscribeToProjects } from '../../../services/firebaseProjects.js';

export function useMobileProjects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined;
    }

    return subscribeToProjects(setProjects, () => setProjects([]));
  }, []);

  return projects;
}
