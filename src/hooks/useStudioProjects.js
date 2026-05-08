import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../services/firebase.js';
import { subscribeToProjects } from '../services/firebaseProjects.js';

export function useStudioProjects(user) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) {
      setProjects([]);
      setIsLoading(false);
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
        setError('Could not read Firestore projects. Check Firebase rules and connection.');
        setIsLoading(false);
        console.error(err);
      }
    );
  }, [user]);

  return { projects, isLoading, error };
}
