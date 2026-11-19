import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildLogRenderer } from './vendor/genome/buildLogRenderer.mjs';
export default defineConfig({ publicDir: false, base: './', plugins: [vue(), {
  name: 'pankbase-embed',
  async generateBundle() {
    this.emitFile({type:'asset', fileName:'epgg-atac-log.js', source:await buildLogRenderer()});
  },
  writeBundle(options) {
    writeFileSync(resolve(options.dir, 'embed.json'), JSON.stringify({ version: 1, html: readFileSync(resolve(options.dir, 'index.html'), 'utf8') }));
    copyFileSync('vendor/LICENSE', resolve(options.dir, 'LICENSE.txt'));
    copyFileSync('vendor/PCA-LICENSE', resolve(options.dir, 'PCA-LICENSE.txt'));
    copyFileSync('vendor/UPSTREAM.json', resolve(options.dir, 'UPSTREAM.json'));
  },
}], build: { outDir: '../public/pankbase-browser', emptyOutDir: true } });
