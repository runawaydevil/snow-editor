import { ICON_PROPS } from './iconProps.js';

export default function ShareIcon({ className }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="18" cy="5" r="2.25" />
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="18" cy="19" r="2.25" />
      <path d="M8.25 10.75 15.5 6.5" />
      <path d="M8.25 13.25 15.5 17.5" />
    </svg>
  );
}
