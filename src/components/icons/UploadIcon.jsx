import { ICON_PROPS } from './iconProps.js';

export default function UploadIcon({ className }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M12 20.5V10.25" />
      <path d="M8.25 13.75 12 10 15.75 13.75" />
      <path d="M5.5 6.25h13" />
      <path d="M7.5 3.75h9" />
    </svg>
  );
}
