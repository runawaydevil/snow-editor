import { ICON_PROPS } from './iconProps.js';

export default function DraftsIcon({ className }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M6 3.75h8.5L19 8.25v12H6z" />
      <path d="M14.5 3.75v4.5H19" />
      <path d="M9 12.5h7" />
      <path d="M9 16h7" />
    </svg>
  );
}
