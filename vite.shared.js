import { loadEnv } from 'vite';

export function parseAllowedHosts(value) {
  if (!value || value.trim() === '') {
    return ['localhost', '127.0.0.1'];
  }
  if (value.trim() === '*') {
    return true;
  }
  return value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);
}

export function resolveAllowedHosts(mode) {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  return parseAllowedHosts(process.env.ALLOWED_HOSTS ?? fileEnv.ALLOWED_HOSTS);
}

export const previewServerOptions = {
  host: '0.0.0.0',
  port: 41737,
};
