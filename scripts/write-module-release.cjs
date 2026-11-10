const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const resultPageProfile = require('../src/vnext/schema/resultPageProfile');
const schema = resultPageProfile('result');
fs.writeFileSync('build/result-modules-release.json',JSON.stringify({
  source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  schema_version:schema.schema.version,
  lifecycle:schema.main_visuals.extension_lifecycle.policy,
  modules:schema.main_visuals.default_order.filter(id => {
    const item = schema.main_visuals.items[id];
    return item.extension && item.enabled && !item.hidden;
  }),
  module_api_prefix:'/techdemo/api',
  built_at:new Date().toISOString(),
},null,2)+'\n');
