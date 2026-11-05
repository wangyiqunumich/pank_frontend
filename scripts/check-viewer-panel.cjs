const fs=require('fs'),assert=require('assert');
const s=JSON.parse(fs.readFileSync(process.argv[2]||'config/graph-viewer/PanKgraph_1104.graph-viewer.schema.json'));
const p=s.panel_presentation;
for(const key of ['header','footer','surface','layout','expanded_layout','context','record_designs','compact_summaries','components','tables','source_navigation'])assert(p[key],key);
for(const [key,profile] of Object.entries(s.profiles))assert(profile.compact_fields || profile.compact_order || profile.sections || profile.expanded_order,`No field configuration: ${key}`);
for(const name of ['graph_viewer_panel_schema','information_panel_schema'])assert.deepStrictEqual(JSON.parse(fs.readFileSync(`src/schema/${name}.json`)),p);
assert.deepStrictEqual(JSON.parse(fs.readFileSync('src/schema/card_layout_schema.json')),p.layout);
for(const src of s.table_downloads.sources)assert(!/amazonaws|\.gz(?:$|\?)|\/mysql\//.test(src.href),src.id);
console.log(`${Object.keys(s.profiles).length} profiles; panel projections and source pages verified`);
