import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  previewServerOptions,
  resolveAllowSearchIndexing,
  resolveAllowedHosts,
  robotsSeoPlugin,
} from './vite.shared.js';

export default defineConfig(({ mode }) => {
  const allowedHosts = resolveAllowedHosts(mode);
  const allowSearchIndexing = resolveAllowSearchIndexing(mode);

  return {
    plugins: [react(), robotsSeoPlugin(allowSearchIndexing)],
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/marked') || id.includes('node_modules/dompurify')) {
              return 'vendor-markdown';
            }
          },
        },
      },
    },
    server: {
      ...previewServerOptions,
      allowedHosts,
      proxy: {
        '/api': {
          target: 'http://localhost:41738',
          changeOrigin: true,
        },
      },
    },
    preview: {
      ...previewServerOptions,
      allowedHosts,
      proxy: {
        '/api': {
          target: 'http://localhost:41738',
          changeOrigin: true,
        },
      },
    },
  };
});
