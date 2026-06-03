import { ICON_PROPS } from './iconProps.js';

export default function DownloadIcon({ className }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 3.5v10.25" />
      <path d="M8.25 10 12 13.75 15.75 10" />
      <path d="M5.5 17.75h13" />
      <path d="M7.5 20.25h9" />
    </svg>
  );
}
