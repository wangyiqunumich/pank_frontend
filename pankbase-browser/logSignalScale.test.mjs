import test from 'node:test';
import assert from 'node:assert/strict';
import { atacLogScales } from './vendor/genome/logSignalScale.mjs';

test('ATAC bars and raw-unit ticks use the same zero-safe logarithmic positions', () => {
  const {axisScale, valueToY} = atacLogScales(5, 80);
  for (const signal of [0, 0.1, 0.5, 1, 3, 5]) {
    const position = 80 - 78 * Math.log2(1 + signal) / Math.log2(6);
    assert.ok(Math.abs(valueToY(signal) - position) < 1e-10);
    assert.equal(axisScale(signal), valueToY(signal));
  }
  assert.equal(valueToY(10), valueToY(5));
});
