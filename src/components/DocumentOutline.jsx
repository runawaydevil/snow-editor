import { STR } from '../lib/strings.js';

// Outline shared by Markdown and Org — receives pre-parsed headings.
export default function DocumentOutline({ headings, onSelectHeading }) {
  if (!headings || headings.length === 0) {
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
