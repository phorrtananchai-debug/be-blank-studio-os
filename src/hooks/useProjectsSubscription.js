import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../services/firebase.js';
import { subscribeToProjects } from '../services/firebaseProjects.js';
import { initialProjects } from '../data/seed.js';

export function useProjectsSubscription({ enabled = true, onError } = {}) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(enabled && isFirebaseConfigured()));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) {
      setProjects(initialProjects);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    setIsLoading(true);
    return subscribeToProjects(
      (firebaseProjects) => {
        setProjects(firebaseProjects);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(onError?.(err) || 'Could not read Firestore projects. Check Firebase rules and connection.');
        setIsLoading(false);
        console.error(err);
      },
    );
  }, [enabled, onError]);

  return { error, isLoading, projects };
}
