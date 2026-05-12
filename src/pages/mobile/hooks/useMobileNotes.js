import { useEffect, useState } from 'react';
import { isFirebaseConfigured, subscribeToCollection } from '../../../services/firebase.js';

const notesCollection = 'notes';

export function useMobileNotes() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined;
    }

    return subscribeToCollection(notesCollection, setNotes, () => setNotes([]));
  }, []);

  return notes;
}
