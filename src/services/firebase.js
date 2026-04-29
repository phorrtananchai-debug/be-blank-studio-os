import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const allowedStudioEmail = import.meta.env.VITE_ALLOWED_STUDIO_EMAIL;

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

const app = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

if (auth) {
  setPersistence(auth, browserLocalPersistence);
}

export function isAllowedUser(user) {
  return Boolean(user?.email && allowedStudioEmail && user.email.toLowerCase() === allowedStudioEmail.toLowerCase());
}

function getFirebaseAuthMessage(error) {
  const code = error?.code || '';

  if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key') {
    return 'Firebase sign-in failed: the API key is not valid. Check VITE_FIREBASE_API_KEY in .env.local and restart npm run dev.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Firebase sign-in failed: this domain is not authorized. Add localhost and 127.0.0.1 in Firebase Authentication > Settings > Authorized domains.';
  }

  if (code === 'auth/popup-blocked') {
    return 'Firebase sign-in popup was blocked. Allow popups for this local app and try again.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Firebase sign-in was cancelled before it completed.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Firebase sign-in failed: Google sign-in is not enabled in Firebase Authentication.';
  }

  return error?.message || 'Firebase sign-in failed. Check your Firebase environment variables and try again.';
}

export function onStudioAuthChange(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function signInToStudio() {
  if (!auth) {
    throw new Error('Firebase is not configured. Fill .env.local with VITE_FIREBASE_* values and restart npm run dev.');
  }

  let result;

  try {
    result = await signInWithPopup(auth, googleProvider);
  } catch (error) {
    throw new Error(getFirebaseAuthMessage(error));
  }

  if (!isAllowedUser(result.user)) {
    await signOut(auth);
    throw new Error(`This Google account is not allowed. Sign in with ${allowedStudioEmail}.`);
  }

  return result.user;
}

export async function signOutOfStudio() {
  if (auth) {
    await signOut(auth);
  }
}

function withWriteMetadata(data) {
  return {
    ...data,
    updatedAt: serverTimestamp(),
  };
}

function fromSnapshot(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

export async function getCollectionItems(collectionName) {
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  const snapshot = await getDocs(query(collection(db, collectionName), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(fromSnapshot);
}

export function subscribeToCollection(collectionName, callback, onError) {
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  return onSnapshot(
    query(collection(db, collectionName), orderBy('updatedAt', 'desc')),
    (snapshot) => callback(snapshot.docs.map(fromSnapshot)),
    onError,
  );
}

export async function addCollectionItem(collectionName, item) {
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  const itemId = item.id;
  const payload = {
    ...withWriteMetadata(item),
    createdAt: serverTimestamp(),
  };

  if (itemId) {
    await setDoc(doc(db, collectionName, itemId), payload, { merge: true });
    return { ...item, id: itemId };
  }

  const ref = await addDoc(collection(db, collectionName), payload);
  return { ...item, id: ref.id };
}

export async function updateCollectionItem(collectionName, id, updates) {
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  await updateDoc(doc(db, collectionName, id), withWriteMetadata(updates));
  return { id, ...updates };
}

export async function deleteCollectionItem(collectionName, id) {
  if (!db) {
    throw new Error('Firebase is not configured');
  }

  await deleteDoc(doc(db, collectionName, id));
}
