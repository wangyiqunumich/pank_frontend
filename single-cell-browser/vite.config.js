import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { notices } from './notices.js';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({ base: './', plugins: [vue(), notices(), { name: 'scbrowser-embed', writeBundle(options) { const directory = options.dir; writeFileSync(resolve(directory, 'embed.json'), JSON.stringify({ version: 1, html: readFileSync(resolve(directory, 'index.html'), 'utf8') })); } }], resolve: { alias: {
  '@/utils/eventBus': fileURLToPath(new URL('./eventBus.js', import.meta.url)),
  '@/components/researchPortal/singleCellBrowser': fileURLToPath(new URL('./vendor', import.meta.url)),
}}, build: { outDir: '../public/scbrowser', emptyOutDir: true } });
