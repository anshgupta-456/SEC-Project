import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';

// In development the frontend calls /api/<service>/... and Vite forwards it:
//  - by default to the three Flask services started by backend/apprunner.py
//  - or, if VITE_DEV_BACKEND_URL is set (e.g. http://127.0.0.1:8000), to the
//    single combined backend (backend/wsgi.py) unchanged.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const combined = env.VITE_DEV_BACKEND_URL;
  const service = (prefix, target) => ({
    [`/api/${prefix}`]: { target, changeOrigin: true, rewrite: (path) => path.replace(new RegExp(`^/api/${prefix}`), '') },
  });
  const proxy = combined
    ? { '/api': { target: combined, changeOrigin: true } }
    : {
        ...service('user', env.VITE_DEV_USER_URL || 'http://127.0.0.1:5000'),
        ...service('grievance', env.VITE_DEV_GRIEVANCE_URL || 'http://127.0.0.1:5001'),
        ...service('admin', env.VITE_DEV_ADMIN_URL || 'http://127.0.0.1:5002'),
      };

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
