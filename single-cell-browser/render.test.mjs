import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual Vue component methods with a deterministic frame scheduler.
const source = readFileSync(new URL('./vendor/ResearchUmapPlotGL.vue', import.meta.url), 'utf8')
  .split('<script>')[1].split('</script>')[0]
  .replace(/^import .*;$/gm, '').replace('export default ', 'component = ');
test('map redraws after replacing data while a frame is pending', () => {
  const frames = new Map(); let next = 0; let rendered = 0;
  const sandbox = { Vue: { component: (_, options) => options },
    requestAnimationFrame: callback => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: id => frames.delete(id), clearTimeout,
    mouseTooltip: { hide() {} } };
  vm.runInNewContext(source, sandbox);
  const methods = sandbox.component.methods;
  const map = { ...methods, cleanUpBuffers() {}, renderUMAP() { rendered++; },
    renderQueued: false, sharedGroupAttached: false, gl: null };
  map.requestRender(true);
  map.cleanUp();
  map.requestRender(true);
  assert.equal(frames.size, 1, 'replacement data must schedule a fresh frame');
  for (const callback of frames.values()) callback();
  assert.equal(rendered, 1);
});

import { layoutPreviewLabels } from './previewLabels.mjs';
test('compact labels wrap names, stay inside a narrow canvas and avoid overlap', () => {
  const clusters = ['Alpha', 'Ductal', 'Active Stellate', 'Beta'].map(label => ({label, projection:{x:80,y:70}}));
  const labels = layoutPreviewLabels(clusters, 200, 160, text => text.length * 4, { font_size:8, names:{'Active Stellate':'Active\nStellate'} });
  assert.equal(labels.length,4);
  assert.deepEqual(labels[2].lines,['Active','Stellate']);
  for (const label of labels) {
    assert.ok(label.box.x >= 0 && label.box.x + label.box.w <= 200);
    assert.ok(label.box.y >= 0 && label.box.y + label.box.h <= 160);
  }
  for (let i=0;i<labels.length;i++) for (let j=0;j<i;j++) {
    const a=labels[i].box,b=labels[j].box;
    assert.ok(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.h<=b.y || b.y+b.h<=a.y);
  }
});
