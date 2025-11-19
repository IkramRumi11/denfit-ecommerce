// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Avoid TypeScript complaints about Node globals in this config file.
declare const __dirname: string;
declare var process: any;

// Allow local HTTPS in dev when SSL paths are provided via env vars.
const sslKey = (process as any).env.SSL_KEY_PATH;
const sslCert = (process as any).env.SSL_CERT_PATH;
let httpsConfig: any = false;
if (sslKey && sslCert && fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
  httpsConfig = { key: fs.readFileSync(sslKey), cert: fs.readFileSync(sslCert) };
}

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      // Allow '@/...' imports to resolve to the frontend `src` directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3000, // Frontend runs here
    https: httpsConfig,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      '/api': {
        // Proxy API calls to the running backend. Backend is currently running on 3002 in dev.
        // Adjust to match backend `PORT` in `backend/.env` (default 3002 in this workspace).
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // keep same path
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@headlessui/react',
      'framer-motion',
      'lucide-react',
      'axios',
    ],
    force: true, // Force re-optimization to prevent stale cache issues
  },

  build: {
    outDir: 'dist',
    sourcemap: true, // helpful for debugging
  },
});
