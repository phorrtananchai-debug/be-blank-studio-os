import { useEffect, useState } from 'react';
import { readCollection, writeCollection } from '../services/storage.js';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      return readCollection(key, initialValue);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    writeCollection(key, value);
  }, [key, value]);

  return [value, setValue];
}
