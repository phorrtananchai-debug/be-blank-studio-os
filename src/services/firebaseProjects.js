import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  addCollectionItem,
  deleteCollectionItem,
  db,
  updateCollectionItem,
} from './firebase.js';

const projectsCollection = 'projects';

export function subscribeToProjects(callback, onError) {
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  return onSnapshot(
    query(collection(db, projectsCollection), orderBy('updatedAt', 'desc')),
    (snapshot) => {
      callback(
        snapshot.docs.map((documentSnapshot) => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data(),
        })),
      );
    },
    onError,
  );
}

export function createFirebaseProject(project) {
  return addCollectionItem(projectsCollection, project);
}

export const createProject = createFirebaseProject;

export function updateFirebaseProject(id, updates) {
  return updateCollectionItem(projectsCollection, id, updates);
}

export const updateProject = updateFirebaseProject;

export function deleteFirebaseProject(id) {
  return deleteCollectionItem(projectsCollection, id);
}

export const deleteProject = deleteFirebaseProject;
