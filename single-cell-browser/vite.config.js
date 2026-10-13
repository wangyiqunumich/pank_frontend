import { notices } from './notices.js';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({ base: './', plugins: [vue(), notices()], resolve: { alias: {
  '@/utils/eventBus': fileURLToPath(new URL('./eventBus.js', import.meta.url)),
  '@/components/researchPortal/singleCellBrowser': fileURLToPath(new URL('./vendor', import.meta.url)),
}}, build: { outDir: '../public/scbrowser', emptyOutDir: true } });
