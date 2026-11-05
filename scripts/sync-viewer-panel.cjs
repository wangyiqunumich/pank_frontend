// Build-only projections. Edit the release's viewer.schema.json, then run this.
const fs=require('fs');const path=require('path');
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/sync-viewer-panel.cjs /path/to/viewer.schema.json');
const schema=JSON.parse(fs.readFileSync(input));const panel=schema.panel_presentation;
if(panel?.version!==3 || !panel.header || !panel.footer || !panel.layout)throw Error('Missing complete panel v3 contract');
const root=path.join(__dirname,'../src/schema');
for(const [name,value] of [['graph_viewer_panel_schema.json',panel],['information_panel_schema.json',panel],['card_layout_schema.json',panel.layout]])fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2)+'\n');
console.log('Generated compatibility projections; release='+schema.release_id);
