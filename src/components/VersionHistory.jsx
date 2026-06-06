import { useCallback, useEffect, useState } from 'react';
import {
  fetchDocumentVersions,
  friendlyErrorMessage,
  restoreDocumentVersion,
} from '../lib/api.js';
import { STR, formatVersionDate } from '../lib/strings.js';

export default function VersionHistory({
  editToken,
  clientId,
  lockToken,
  onRestored,
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState('');
  const [error, setError] = useState('');

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDocumentVersions(editToken, { clientId, lockToken });
      setVersions(data.versions ?? []);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [editToken, clientId, lockToken]);

  useEffect(() => {
    if (!open) return;
    loadVersions();
  }, [open, loadVersions]);

  const handleRestore = async (versionId) => {
    const confirmed = window.confirm(STR.VERSION_RESTORE_CONFIRM);
    if (!confirmed) return;

    setRestoringId(versionId);
    setError('');
    try {
      const data = await restoreDocumentVersion(editToken, versionId, {
        clientId,
        lockToken,
      });
      onRestored(data);
      await loadVersions();
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setRestoringId('');
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen(true)}
      >
        {STR.VERSION_HISTORY}
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="modal share-panel version-panel"
            role="dialog"
            aria-labelledby="version-history-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="version-history-title" className="modal__title">
              {STR.VERSION_HISTORY}
            </h2>

            {loading && <p className="version-panel__status">{STR.VERSION_LOADING}</p>}

            {!loading && versions.length === 0 && (
              <p className="version-panel__status">{STR.VERSION_EMPTY}</p>
            )}

            {!loading && versions.length > 0 && (
              <ul className="version-list">
                {versions.map((version) => (
                  <li key={version.id} className="version-list__item">
                    <span className="version-list__date">
                      {formatVersionDate(version.createdAt)}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost version-list__restore"
                      disabled={restoringId === version.id}
                      onClick={() => handleRestore(version.id)}
                    >
                      {restoringId === version.id
                        ? STR.VERSION_RESTORING
                        : STR.VERSION_RESTORE}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p className="share-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal__actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                {STR.CLOSE}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
