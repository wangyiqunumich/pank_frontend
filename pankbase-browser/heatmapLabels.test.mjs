import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHeatmapLabels } from './heatmapLabels.mjs';
test('sample labels retain the exact source vector order and reject mismatches',()=>{
 const rows=[{expression:[1,2]}], meta={dataset:'beta',sample_ids:['sample-B','sample-A']};
 assert.deepEqual(validateHeatmapLabels(meta,rows,'beta'),['sample-B','sample-A']);
 for(const invalid of [{...meta,dataset:'alpha'},{...meta,sample_ids:['only-one']},{...meta,sample_ids:['duplicate','duplicate']}]) assert.throws(()=>validateHeatmapLabels(invalid,rows,'beta'));
});
