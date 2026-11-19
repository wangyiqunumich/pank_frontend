import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const sourceUrl = 'https://api-dev.pankgraph.org/api/pankbase-data/v1/assets/runtime-source/runtime/epgg-local.js';
const sha256 = 'ba683fcce960650c585e987e4e05695372b2ff712197f64e4c763cb90ce51093';

// The hosted 53.6.0 UMD exposes no numeric-track scale extension. Apply
// these narrowly scoped hooks at build time to the verified local-data build.
export async function buildLogRenderer() {
  const source = process.env.PANK_EPGG_SOURCE
    ? await readFile(process.env.PANK_EPGG_SOURCE)
    : await fetch(sourceUrl).then(async response => {
        if (!response.ok) throw new Error('Could not load the pinned genome renderer');
        return Buffer.from(await response.arrayBuffer());
      });
  if (createHash('sha256').update(source).digest('hex') !== sha256) throw new Error('Unexpected genome renderer digest');
  let code = source.toString();
  function replaceOnce(before, after) {
    if (code.split(before).length !== 2) throw new Error('Genome renderer hook does not match the pinned source');
    code = code.replace(before, after);
  }
  replaceOnce('c=n.yMin,o=n.yMax;c>=o&&l.notify',
    'c=n.yMin,o=n.yMax;if(n.atacLogAxis)return window.pankAtacLogScales(o,t);c>=o&&l.notify');
  replaceOnce('r=this.props.axisScale.domain();r.includes',
    'r=this.props.axisScale.atacTicks||this.props.axisScale.domain();r.includes');
  replaceOnce('h.toFixed(2),u="number"!==typeof a',
    '(r.options.atacLogAxis?"Raw signal (bin mean): "+Number(h.toPrecision(6)):h.toFixed(2)),u="number"!==typeof a');
  return code;
}
