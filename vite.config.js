import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { previewServerOptions, resolveAllowedHosts } from './vite.shared.js';

export default defineConfig(({ mode }) => {
  const allowedHosts = resolveAllowedHosts(mode);

  return {
    plugins: [react()],
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
    },
    preview: {
      ...previewServerOptions,
      allowedHosts,
    },
  };
});
