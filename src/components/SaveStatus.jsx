import { STR } from '../lib/strings.js';

const LABELS = {
  idle: '',
  saving: STR.SAVE_SAVING,
  saved: STR.SAVE_SAVED,
  error: STR.SAVE_ERROR,
  no_permission: STR.SAVE_NO_PERMISSION,
};

export default function SaveStatus({ status }) {
  const label = LABELS[status];
  if (!label) return null;
  return (
    <span className={`save-status save-status--${status}`} role="status">
      {label}
    </span>
  );
}
