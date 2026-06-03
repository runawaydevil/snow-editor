import { ICON_PROPS } from './iconProps.js';

export default function ClearIcon({ className }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M16.75 5.25 8.5 13.5l-2.75 2.75 4.25 4.25 8.25-8.25 2.75-2.75-4.25-4.25z" />
      <path d="M5.5 19.25h13.25" />
    </svg>
  );
}
