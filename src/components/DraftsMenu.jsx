import { useCallback, useEffect, useRef, useState } from 'react';
import { STR, formatVersionDate } from '../lib/strings.js';
import IconButton from './IconButton.jsx';
import { DraftsIcon } from './icons/index.js';

export default function DraftsMenu({
  currentDraftId,
  onListDrafts,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraft,
}) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const rootRef = useRef(null);

  const refresh = useCallback(() => {
    setDrafts(onListDrafts());
  }, [onListDrafts]);

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (!was) refresh();
      return !was;
    });
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSelect = (id) => {
    setOpen(false);
    if (id !== currentDraftId) onSelectDraft(id);
  };

  const handleCreate = () => {
    setOpen(false);
    onCreateDraft();
  };

  const handleDelete = (event, draft) => {
    event.stopPropagation();
    const confirmed = window.confirm(
      STR.DELETE_DRAFT_CONFIRM(draft.title || STR.UNTITLED_DOCUMENT),
    );
    if (!confirmed) return;
    onDeleteDraft(draft.id);
    refresh();
  };

  return (
    <div className="drafts-menu" ref={rootRef}>
      <IconButton
        icon={<DraftsIcon />}
        label={STR.DRAFTS}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
      />
      {open && (
        <div className="drafts-menu__popover" role="menu" aria-label={STR.DRAFTS}>
          <button
            type="button"
            className="drafts-menu__new"
            role="menuitem"
            onClick={handleCreate}
          >
            + {STR.NEW_DRAFT}
          </button>
          <ul className="drafts-menu__list">
            {drafts.map((draft) => (
              <li key={draft.id} className="drafts-menu__item">
                <button
                  type="button"
                  role="menuitem"
                  className={`drafts-menu__entry${draft.id === currentDraftId ? ' is-current' : ''}`}
                  onClick={() => handleSelect(draft.id)}
                >
                  <span className="drafts-menu__entry-title">
                    {draft.title || STR.UNTITLED_DOCUMENT}
                  </span>
                  <span className="drafts-menu__entry-meta">
                    {draft.mode === 'org' ? 'Org' : 'Markdown'} ·{' '}
                    {formatVersionDate(draft.updatedAt)}
                  </span>
                </button>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    className="drafts-menu__delete"
                    aria-label={`${STR.DELETE_DRAFT}: ${draft.title || STR.UNTITLED_DOCUMENT}`}
                    title={STR.DELETE_DRAFT}
                    onClick={(event) => handleDelete(event, draft)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
