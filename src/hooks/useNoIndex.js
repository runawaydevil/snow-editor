import { useEffect } from 'react';

// Shared-document routes must never be indexed even when the site itself
// allows indexing (the URL is the capability token).
export function useNoIndex() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    if (existing) return undefined; // site-wide noindex already active

    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}
