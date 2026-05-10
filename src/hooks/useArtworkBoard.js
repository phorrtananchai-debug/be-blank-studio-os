import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToCollection,
  addCollectionItem,
  updateCollectionItem,
  deleteCollectionItem,
  uploadFile
} from '../services/firebase.js';

export function useArtworkBoard(projectId, user) {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionName = `artwork_board_${projectId}`;

  useEffect(() => {
    if (!projectId || !user) return;

    setLoading(true);
    const unsubscribe = subscribeToCollection(
      collectionName,
      (items) => {
        setElements(items);
        setLoading(false);
      },
      (err) => {
        console.error('Artwork Board Subscription Error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId, user, collectionName]);

  const addElement = useCallback(async (element) => {
    try {
      return await addCollectionItem(collectionName, {
        ...element,
        projectId,
        zIndex: elements.length + 1,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to add element:', err);
      throw err;
    }
  }, [projectId, elements.length, collectionName]);

  const updateElement = useCallback(async (id, updates) => {
    try {
      await updateCollectionItem(collectionName, id, updates);
    } catch (err) {
      console.error('Failed to update element:', err);
      throw err;
    }
  }, [collectionName]);

  const deleteElement = useCallback(async (id) => {
    try {
      await deleteCollectionItem(collectionName, id);
    } catch (err) {
      console.error('Failed to delete element:', err);
      throw err;
    }
  }, [collectionName]);

  const uploadImage = useCallback(async (file) => {
    const path = `artwork/${projectId}/${Date.now()}_${file.name}`;
    return await uploadFile(path, file);
  }, [projectId]);

  return {
    elements,
    loading,
    error,
    addElement,
    updateElement,
    deleteElement,
    uploadImage
  };
}
