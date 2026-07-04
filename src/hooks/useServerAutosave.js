import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, updateDocument } from '../lib/api.js';

const AUTOSAVE_DEBOUNCE_MS = 1000;

export function useServerAutosave({
  editToken,
  clientId,
  lockToken,
  enabled,
  title,
  mode,
  content,
}) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const timerRef = useRef(null);
  const lastSavedRef = useRef('');

  const saveNow = useCallback(async () => {
    if (!enabled || !editToken || !clientId || !lockToken) {
      setSaveStatus('no_permission');
      return false;
    }

    const snapshot = JSON.stringify({ title, mode, content });
    if (snapshot === lastSavedRef.current) {
      setSaveStatus('saved');
      return true;
    }

    setSaveStatus('saving');
    try {
      const result = await updateDocument(editToken, {
        clientId,
        lockToken,
        title,
        mode,
        content,
      });
      lastSavedRef.current = snapshot;
      setSaveStatus('saved');
      return result;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 423)) {
        setSaveStatus('no_permission');
      } else {
        setSaveStatus('error');
      }
      return false;
    }
  }, [enabled, editToken, clientId, lockToken, title, mode, content]);

  useEffect(() => {
    if (!enabled) {
      // Not being allowed to save *yet* (lock still being acquired, or viewer
      // without a lock) is not a save failure — keep the status quiet.
      // 'no_permission' is reserved for saves actually refused by the server.
      setSaveStatus('idle');
      return;
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveNow();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timerRef.current);
  }, [enabled, title, mode, content, saveNow]);

  return { saveStatus, saveNow, setSaveStatus };
}
