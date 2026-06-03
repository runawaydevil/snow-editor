import fs from 'fs';
import path from 'path';
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

export function resolveAllowSearchIndexing(mode) {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const value = (
    process.env.VITE_ALLOW_SEARCH_INDEXING ?? fileEnv.VITE_ALLOW_SEARCH_INDEXING ?? ''
  )
    .trim()
    .toLowerCase();
  return value === 'true';
}

export function robotsSeoPlugin(allowIndexing) {
  let outDir = 'dist';

  return {
    name: 'snow-robots-seo',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html) {
      if (allowIndexing) return html;
      return html.replace(
        '</head>',
        '    <meta name="robots" content="noindex, nofollow" />\n  </head>',
      );
    },
    closeBundle() {
      const content = allowIndexing
        ? 'User-agent: *\nAllow: /\n'
        : 'User-agent: *\nDisallow: /\n';
      const robotsPath = path.join(outDir, 'robots.txt');
      fs.writeFileSync(robotsPath, content, 'utf8');
      // Keep public/ in sync for the next dev session (Vite serves public/ as-is)
      fs.writeFileSync(path.join('public', 'robots.txt'), content, 'utf8');
    },
  };
}

export const previewServerOptions = {
  host: '0.0.0.0',
  port: 41737,
};
