import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    viteCompression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer/',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 3000,
    // Remove proxy for mainnet testing. Ensure frontend uses VITE_HOST for API calls.
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Removed external @dfinity/agent - needs to be bundled for browser
    },
  },
});
