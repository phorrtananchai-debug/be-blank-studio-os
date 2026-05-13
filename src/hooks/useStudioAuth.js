import { useEffect, useState } from 'react';
import {
  isAllowedUser,
  isFirebaseConfigured,
  onStudioAuthChange,
  signInToStudio,
  signOutOfStudio,
} from '../services/firebase.js';

export function useStudioAuth() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const mockUser = typeof window !== 'undefined' ? window.localStorage.getItem('studio_mock_user') : null;
    if (mockUser && import.meta.env.DEV) {
      setUser(JSON.parse(mockUser));
      setIsCheckingAuth(false);
      return () => {};
    }

    if (!isFirebaseConfigured()) {
      setAuthMessage('Firebase is not configured.');
      setIsCheckingAuth(false);
      return undefined;
    }

    return onStudioAuthChange((user) => {
      setIsCheckingAuth(false);

      if (!user) {
        setUser(null);
        return;
      }

      if (!isAllowedUser(user)) {
        setUser(null);
        setAuthMessage('This Google account is not allowed.');
        signOutOfStudio();
        return;
      }

      setUser(user);
      setAuthMessage('');
    });
  }, []);

  const signIn = async () => {
    try {
      setAuthMessage('');
      return await signInToStudio();
    } catch (error) {
      const message = error.message?.toLowerCase().includes('not allowed')
        ? 'Access restricted'
        : error.message;
      setAuthMessage(message);
      throw error;
    }
  };

  const signOut = async () => {
    await signOutOfStudio();
    setUser(null);
  };

  return {
    user,
    setUser,
    isCheckingAuth,
    authMessage,
    setAuthMessage,
    signIn,
    signOut,
    isFirebaseConfigured: isFirebaseConfigured(),
  };
}
