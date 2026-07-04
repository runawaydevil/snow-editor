import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireEditLock,
  ApiError,
  refreshEditLock,
  releaseEditLock,
} from '../lib/api.js';
import { getOrCreateClientId } from '../lib/clientId.js';

const REFRESH_INTERVAL_MS = 30 * 1000;

export function useEditLock(editToken, enabled = true) {
  const [lockState, setLockState] = useState({
    status: 'idle',
    lockToken: null,
    lockExpiresAt: null,
    blockedExpiresAt: null,
  });
  const clientIdRef = useRef(getOrCreateClientId());
  const lockTokenRef = useRef(null);

  const acquire = useCallback(async () => {
    if (!editToken || !enabled) return;
    setLockState((s) => ({ ...s, status: 'acquiring' }));

    try {
      const result = await acquireEditLock(editToken, clientIdRef.current);
      lockTokenRef.current = result.lockToken;
      setLockState({
        status: 'held',
        lockToken: result.lockToken,
        lockExpiresAt: result.expiresAt,
        blockedExpiresAt: null,
      });
      return { locked: true, lockToken: result.lockToken };
    } catch (error) {
      if (error instanceof ApiError && error.status === 423) {
        setLockState({
          status: 'blocked',
          lockToken: null,
          lockExpiresAt: null,
          blockedExpiresAt: error.payload?.lockExpiresAt ?? null,
        });
        return { locked: false, lockExpiresAt: error.payload?.lockExpiresAt };
      }
      setLockState({
        status: 'error',
        lockToken: null,
        lockExpiresAt: null,
        blockedExpiresAt: null,
      });
      throw error;
    }
  }, [editToken, enabled]);

  const refresh = useCallback(async () => {
    if (!editToken || !lockTokenRef.current) return false;
    try {
      const result = await refreshEditLock(
        editToken,
        clientIdRef.current,
        lockTokenRef.current,
      );
      lockTokenRef.current = result.lockToken;
      setLockState((s) => ({
        ...s,
        status: 'held',
        lockExpiresAt: result.expiresAt,
      }));
      return true;
    } catch {
      lockTokenRef.current = null;
      setLockState({
        status: 'lost',
        lockToken: null,
        lockExpiresAt: null,
        blockedExpiresAt: null,
      });
      return false;
    }
  }, [editToken]);

  const release = useCallback(async () => {
    if (!editToken || !lockTokenRef.current) return;
    const token = lockTokenRef.current;
    lockTokenRef.current = null;
    try {
      await releaseEditLock(editToken, clientIdRef.current, token);
    } catch {
      /* best effort */
    }
    setLockState({
      status: 'released',
      lockToken: null,
      lockExpiresAt: null,
      blockedExpiresAt: null,
    });
  }, [editToken]);

  useEffect(() => {
    if (!enabled || lockState.status !== 'held' || !editToken) return;

    const interval = window.setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, editToken, lockState.status, refresh]);

  useEffect(() => {
    if (!enabled || !editToken) return;

    // pagehide is far more reliable than beforeunload (which mobile browsers
    // often skip and which disables the back/forward cache).
    const onPageHide = () => {
      if (!lockTokenRef.current) return;
      const body = JSON.stringify({
        clientId: clientIdRef.current,
        lockToken: lockTokenRef.current,
      });
      const url = `${import.meta.env.VITE_API_BASE ?? ''}/api/documents/edit/${encodeURIComponent(editToken)}/lock`;
      fetch(url, {
        method: 'DELETE',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
      lockTokenRef.current = null;
    };

    // Restored from the back/forward cache: the lock was released on the way
    // out, so grab it again to keep editing seamless.
    const onPageShow = (event) => {
      if (event.persisted && !lockTokenRef.current) {
        acquire().catch(() => {});
      }
    };

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [enabled, editToken, acquire]);

  return {
    clientId: clientIdRef.current,
    lockState,
    acquire,
    refresh,
    release,
    hasLock: lockState.status === 'held' && !!lockTokenRef.current,
    lockToken: lockTokenRef.current,
  };
}
