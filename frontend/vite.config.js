import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_URL || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/process': { target: backend, changeOrigin: true },
        '/preview': { target: backend, changeOrigin: true },
        '/download': { target: backend, changeOrigin: true },
        '/health': { target: backend, changeOrigin: true },
        '/video': { target: backend, changeOrigin: true },
        '/extracts': { target: backend, changeOrigin: true },
      },
    },
  };
});
