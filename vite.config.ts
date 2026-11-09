import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import { resolve } from 'node:path';
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: { port: 8899 },
  resolve: { alias: { '@': resolve(__dirname, './src') } },
  build: { outDir: process.env.BUILD_TARGET === 'edge' ? 'dist/edge' : 'dist/chrome' },
});
