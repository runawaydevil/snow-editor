import { formatLockExpiry, STR } from '../lib/strings.js';

export default function ReadOnlyBanner({ message, lockExpiresAt, variant = 'info' }) {
  const expiry = formatLockExpiry(lockExpiresAt);

  return (
    <div className={`alert-banner alert-banner--${variant}`} role="status">
      <p>{message}</p>
      {expiry && (
        <p className="alert-banner__meta">
          {STR.LOCK_EXPIRES_AT}: {expiry}
        </p>
      )}
    </div>
  );
}
