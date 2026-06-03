import { useState } from 'react';
import { createDocument, friendlyErrorMessage, toAbsoluteUrl } from '../lib/api.js';
import { EXPIRY_OPTIONS, formatExpiryDate, STR } from '../lib/strings.js';

export default function ShareModal({ open, onClose, title, mode, content }) {
  const [docTitle, setDocTitle] = useState(title);
  const [expiresIn, setExpiresIn] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await createDocument({
        title: docTitle,
        mode,
        content,
        expiresIn,
      });
      setResult({
        ...data,
        viewUrlAbs: toAbsoluteUrl(data.viewUrl),
        editUrlAbs: toAbsoluteUrl(data.editUrl),
      });
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (url, key) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setError(STR.COPY_FAILED);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal share-panel"
        role="dialog"
        aria-labelledby="share-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-title" className="modal__title">
          {STR.SHARE_DOCUMENT}
        </h2>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <label className="share-field">
              <span>{STR.TITLE}</span>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                maxLength={200}
              />
            </label>

            <fieldset className="share-field">
              <legend>{STR.LINK_VALIDITY}</legend>
              {EXPIRY_OPTIONS.map((opt) => (
                <label key={opt.value} className="share-radio">
                  <input
                    type="radio"
                    name="expiresIn"
                    value={opt.value}
                    checked={expiresIn === opt.value}
                    onChange={() => setExpiresIn(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>

            {error && (
              <p className="share-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal__actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {STR.CANCEL}
              </button>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? STR.CREATING : STR.CREATE_LINKS}
              </button>
            </div>
          </form>
        ) : (
          <div className="share-result">
            <p className="share-result__expiry">{formatExpiryDate(result.expiresAt)}</p>

            <label className="share-field">
              <span>{STR.VIEW_LINK}</span>
              <div className="share-copy-row">
                <input type="text" readOnly value={result.viewUrlAbs} />
                <button
                  type="button"
                  className="btn"
                  onClick={() => copyLink(result.viewUrlAbs, 'view')}
                >
                  {copied === 'view' ? STR.COPIED : STR.COPY}
                </button>
              </div>
            </label>

            <label className="share-field">
              <span>{STR.EDIT_LINK}</span>
              <div className="share-copy-row">
                <input type="text" readOnly value={result.editUrlAbs} />
                <button
                  type="button"
                  className="btn"
                  onClick={() => copyLink(result.editUrlAbs, 'edit')}
                >
                  {copied === 'edit' ? STR.COPIED : STR.COPY}
                </button>
              </div>
            </label>

            <div className="modal__actions">
              <button type="button" className="btn" onClick={onClose}>
                {STR.CLOSE}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
