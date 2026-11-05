// Display-only migration: accepts an explicit release schema, preserves bindings
// and source data, writes a candidate rather than modifying an input in place.
const fs=require('fs');
const policy=require('../src/schema/information_panel_schema.json');
function update(input,descriptor=input){
 const schema=JSON.parse(JSON.stringify(input));
 schema.display_policy={...schema.display_policy,field_labels:{...schema.display_policy?.field_labels,...policy.field_labels},hidden_fields:[...new Set([...(schema.display_policy?.hidden_fields||[]),...policy.hidden_internal_fields])]};
 for(const [id,columns] of Object.entries(policy.table_columns))if(schema.tables[id])schema.tables[id].columns=columns.filter(k=>(descriptor.tables[id]?.all_fields || schema.tables[id].all_fields || [...schema.tables[id].columns,...Object.keys(schema.tables[id].field_specs||{})]).includes(k));
 for(const component of Object.values(schema.components||{}))for(const group of component.view?.groups||[])for(const preset of group.presets||[]){
  const override=policy.expression_display.presets[preset.id];if(override)Object.assign(preset,override,{description:'',presentation:'source_records'});
 }
 schema.panel_presentation={version:policy.version,complete_record:'two_column_sections',evidence:'source_records',visualization_preview:false};
 return schema;
}
module.exports={update};
if(require.main===module){const [input,output,descriptor]=process.argv.slice(2);if(!input||!output||input===output)throw Error('Supply separate input and candidate output paths');fs.writeFileSync(output,JSON.stringify(update(JSON.parse(fs.readFileSync(input)),descriptor?JSON.parse(fs.readFileSync(descriptor)):undefined),null,2)+'\n');}
