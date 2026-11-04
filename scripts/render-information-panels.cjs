#!/usr/bin/env node
// Reuse the application's real Information Panel, not a separate mock renderer.
const path=require('path');
const {spawnSync}=require('child_process');
const [records,output,schema]=process.argv.slice(2);
if(!records || !output){console.error('Usage: node scripts/render-information-panels.cjs real-records.json output-directory [viewer-schema.json]');process.exit(2);}
const result=spawnSync(process.execPath,[require.resolve('react-scripts/bin/react-scripts'),'test','--watchAll=false','--runInBand','--runTestsByPath','src/vnext/informationPanelPreview.export.test.js'],{cwd:path.resolve(__dirname,'..'),stdio:'inherit',env:{...process.env,CI:'true',PANK_PANEL_RECORDS:path.resolve(records),PANK_PANEL_OUTPUT:path.resolve(output),...(schema ? {PANK_PANEL_SCHEMA:path.resolve(schema)} : {})}});
process.exit(result.status ?? 1);
