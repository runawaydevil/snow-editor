import { defineConfig } from 'vite';
import { previewServerOptions, resolveAllowedHosts } from './vite.shared.js';

export default defineConfig(({ mode }) => ({
  preview: {
    ...previewServerOptions,
    allowedHosts: resolveAllowedHosts(mode),
  },
}));
