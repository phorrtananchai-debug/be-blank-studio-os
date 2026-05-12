import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

const firebaseConfigSource = isFirebaseConfigured() ? 'env' : 'missing-env';

export const allowedStudioEmail = String(import.meta.env.VITE_ALLOWED_STUDIO_EMAIL || '').trim();

export function getFirebaseDebugInfo() {
  return {
    configSource: firebaseConfigSource,
    apiKeyExists: Boolean(firebaseConfig.apiKey),
    apiKeySuffix: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(-6) : '',
    projectId: firebaseConfig.projectId || '',
    authDomain: firebaseConfig.authDomain || '',
    appIdExists: Boolean(firebaseConfig.appId),
    storageBucket: firebaseConfig.storageBucket || '',
  };
}

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

if (isFirebaseConfigured()) {
  console.info('Firebase config source:', firebaseConfigSource);
  console.info('Firebase apiKeySuffix:', firebaseConfig.apiKey.slice(-6));
  console.info('Firebase projectId:', firebaseConfig.projectId);
}

const app = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

if (auth) {
  setPersistence(auth, browserLocalPersistence);
}

export function isAllowedUser(user) {
  if (import.meta.env.DEV) {
    return true;
  }

  return Boolean(user?.email && allowedStudioEmail && user.email.trim().toLowerCase() === allowedStudioEmail.toLowerCase());
}

function getFirebaseAuthMessage(error) {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key') {
    return 'Firebase sign-in failed: the API key is not valid. Check VITE_FIREBASE_API_KEY in Vercel Environment Variables, then redeploy.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Firebase sign-in failed: this domain is not authorized. Add be-blank-studio-os.vercel.app in Firebase Authentication > Settings > Authorized domains.';
  }

  if (message.toLowerCase().includes('requested action is invalid')) {
    return 'Firebase sign-in popup failed: the auth handler rejected the request. Check Vercel Firebase env values and add be-blank-studio-os.vercel.app to Firebase Authorized domains.';
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

  return message || 'Firebase sign-in popup failed. Check Firebase environment variables and try again.';
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
    if (!allowedStudioEmail) {
      throw new Error('VITE_ALLOWED_STUDIO_EMAIL is missing. Add the studio Google email to the environment and restart the app.');
    }
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

export async function uploadFile(path, file) {
  if (!storage) {
    throw new Error('Firebase Storage is not configured');
  }

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
