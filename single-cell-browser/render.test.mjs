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
