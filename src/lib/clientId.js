const STORAGE_CLIENT_ID = 'snow_client_id';

export function getOrCreateClientId() {
  try {
    const existing = localStorage.getItem(STORAGE_CLIENT_ID);
    if (existing) return existing;
  } catch {
    /* ignore */
  }

  const id = crypto.randomUUID();
  try {
    localStorage.setItem(STORAGE_CLIENT_ID, id);
  } catch {
    /* ignore */
  }
  return id;
}
