import { useCallback, useRef, useState } from 'react';

export function useToastMessage(defaultDuration = 3200) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const clearToast = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message, tone = 'success', duration = defaultDuration) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setToast({ message, tone });
    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, duration);
  }, [defaultDuration]);

  return { clearToast, showToast, toast };
}
