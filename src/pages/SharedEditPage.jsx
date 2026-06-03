import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import EditorLayout from '../components/EditorLayout.jsx';
import ReadOnlyBanner from '../components/ReadOnlyBanner.jsx';
import SaveStatus from '../components/SaveStatus.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useEditLock } from '../hooks/useEditLock.js';
import { useServerAutosave } from '../hooks/useServerAutosave.js';
import {
  ApiError,
  fetchEditDocument,
  friendlyErrorMessage,
} from '../lib/api.js';
import { downloadDocument } from '../lib/download.js';
import { STR } from '../lib/strings.js';
import LinkErrorPage from './LinkErrorPage.jsx';

export default function SharedEditPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState('markdown');
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lockLost, setLockLost] = useState(false);
  const editorRef = useRef(null);

  const { lockState, acquire, release, hasLock, lockToken, clientId } =
    useEditLock(token, !!doc && !loadError);

  const canEdit = hasLock && !lockLost;

  const { saveStatus, saveNow } = useServerAutosave({
    editToken: token,
    clientId,
    lockToken,
    enabled: canEdit,
    title,
    mode,
    content,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchEditDocument(token);
        if (cancelled) return;
        setDoc(data);
        setTitle(data.title);
        setContent(data.content);
        setMode(data.mode);
      } catch (err) {
        if (!cancelled) setLoadError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const lockRequestedRef = useRef(false);

  useEffect(() => {
    lockRequestedRef.current = false;
  }, [token]);

  useEffect(() => {
    if (!doc || loadError || lockRequestedRef.current) return;
    lockRequestedRef.current = true;
    acquire().catch(() => {});
  }, [doc, loadError, acquire]);

  useEffect(() => {
    if (lockState.status === 'lost') {
      setLockLost(true);
    }
    if (saveStatus === 'no_permission') {
      setLockLost(true);
    }
  }, [lockState.status, saveStatus]);

  const handleSaveServer = useCallback(async () => {
    const ok = await saveNow();
    if (!ok) setLockLost(true);
  }, [saveNow]);

  const handleRelease = useCallback(async () => {
    await release();
    setLockLost(true);
  }, [release]);

  const handleDownload = useCallback(() => {
    downloadDocument(content, mode, title);
  }, [content, mode, title]);

  if (loading) {
    return (
      <div className="app">
        <p className="page-loading">{STR.LOADING_DOCUMENT}</p>
      </div>
    );
  }

  if (loadError instanceof ApiError) {
    if (loadError.status === 410) {
      return (
        <LinkErrorPage
          title={STR.LINK_EXPIRED_TITLE}
          message={STR.LINK_EXPIRED_EDIT}
        />
      );
    }
    if (loadError.status === 404) {
      return (
        <LinkErrorPage
          title={STR.DOCUMENT_NOT_FOUND_TITLE}
          message={friendlyErrorMessage(loadError)}
        />
      );
    }
  }

  if (loadError || !doc) {
    return (
      <LinkErrorPage
        title={STR.LOAD_ERROR_TITLE}
        message={friendlyErrorMessage(loadError)}
      />
    );
  }

  const saveLabel = mode === 'org' ? STR.DOWNLOAD_ORG : STR.DOWNLOAD_MD;
  const readOnly =
    !canEdit || lockState.status === 'blocked' || lockState.status === 'acquiring';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <div className="app-header-top">
            <input
              className="doc-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={readOnly}
              aria-label="Document title"
            />
            <StatusBadge variant="shared">{STR.BADGE_SHARED}</StatusBadge>
            {canEdit ? (
              <StatusBadge variant="editing">{STR.BADGE_EDITING}</StatusBadge>
            ) : (
              <StatusBadge variant="readonly">{STR.BADGE_READONLY}</StatusBadge>
            )}
          </div>
          <p className="app-subtitle">
            {canEdit ? STR.SHARED_EDIT : STR.SHARED_VIEW}
          </p>
        </div>
        <div className="toolbar">
          {canEdit && (
            <>
              <button type="button" className="btn" onClick={handleSaveServer}>
                {STR.SAVE_TO_SERVER}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleRelease}>
                {STR.RELEASE_EDIT_LOCK}
              </button>
            </>
          )}
          <button type="button" className="btn" onClick={handleDownload}>
            {saveLabel}
          </button>
          <SaveStatus status={saveStatus} />
        </div>
      </header>

      {lockState.status === 'blocked' && (
        <ReadOnlyBanner
          message={STR.LOCKED_BY_OTHER}
          lockExpiresAt={lockState.blockedExpiresAt}
        />
      )}

      {lockLost && (
        <ReadOnlyBanner variant="warning" message={STR.LOCK_LOST} />
      )}

      <EditorLayout
        mode={mode}
        content={content}
        onContentChange={canEdit ? setContent : undefined}
        readOnly={readOnly}
        editorRef={editorRef}
        showEditor
      />

      <footer className="app-footer">
        <p className="app-meta">{STR.FOOTER_SHARED}</p>
      </footer>
    </div>
  );
}
