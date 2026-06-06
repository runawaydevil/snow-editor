import { useMemo } from 'react';
import { parseOrgDocument } from '../lib/org/parseDocument.js';
import { STR } from '../lib/strings.js';

export default function OrgOutline({ content, onSelectHeading, collapsed = false }) {
  const { headings } = useMemo(() => parseOrgDocument(content), [content]);

  if (collapsed || headings.length === 0) {
    return null;
  }

  return (
    <aside className="org-outline" aria-label={STR.ORG_OUTLINE}>
      <div className="org-outline__title">{STR.ORG_OUTLINE}</div>
      <ul className="org-outline__list">
        {headings.map((heading) => (
          <li
            key={`${heading.line}-${heading.title}`}
            className="org-outline__item"
            style={{ paddingLeft: `${(heading.level - 1) * 0.65}rem` }}
          >
            <button
              type="button"
              className="org-outline__link"
              onClick={() => onSelectHeading?.(heading.line)}
            >
              {heading.todo && (
                <span className={`org-badge org-${heading.todo.toLowerCase()}`}>
                  {heading.todo}
                </span>
              )}
              {heading.title}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
