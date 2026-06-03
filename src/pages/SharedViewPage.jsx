import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EditorLayout from '../components/EditorLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ApiError, fetchViewDocument, friendlyErrorMessage } from '../lib/api.js';
import { downloadDocument } from '../lib/download.js';
import { STR } from '../lib/strings.js';
import LinkErrorPage from './LinkErrorPage.jsx';

export default function SharedViewPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchViewDocument(token);
        if (!cancelled) setDoc(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="app">
        <p className="page-loading">{STR.LOADING_DOCUMENT}</p>
      </div>
    );
  }

  if (error instanceof ApiError) {
    if (error.status === 410) {
      return (
        <LinkErrorPage
          title={STR.LINK_EXPIRED_TITLE}
          message={STR.LINK_EXPIRED_VIEW}
        />
      );
    }
    if (error.status === 404) {
      return (
        <LinkErrorPage
          title={STR.DOCUMENT_NOT_FOUND_TITLE}
          message={friendlyErrorMessage(error)}
        />
      );
    }
  }

  if (error || !doc) {
    return (
      <LinkErrorPage
        title={STR.LOAD_ERROR_TITLE}
        message={friendlyErrorMessage(error)}
      />
    );
  }

  const saveLabel = doc.mode === 'org' ? STR.DOWNLOAD_ORG : STR.DOWNLOAD_MD;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <div className="app-header-top">
            <h1 className="app-title">{doc.title}</h1>
            <StatusBadge variant="shared">{STR.BADGE_SHARED}</StatusBadge>
            <StatusBadge variant="readonly">{STR.BADGE_READONLY}</StatusBadge>
          </div>
          <p className="app-subtitle">{STR.SHARED_VIEW}</p>
        </div>
        <div className="toolbar">
          <button
            type="button"
            className="btn"
            onClick={() => downloadDocument(doc.content, doc.mode, doc.title)}
          >
            {saveLabel}
          </button>
        </div>
      </header>

      <EditorLayout mode={doc.mode} content={doc.content} previewOnly showEditor={false} />

      <footer className="app-footer">
        <p className="app-meta">{STR.FOOTER_SHARED}</p>
      </footer>
    </div>
  );
}
