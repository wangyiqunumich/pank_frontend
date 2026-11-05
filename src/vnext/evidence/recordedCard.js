// Present only this graph object's saved annotations through the regular panel.
// SQL ownership/components are added only by the exact-object inspection API.
export function recordedCard(data,ref,schema) {
  const raw=data?.evidence_properties;
  const profile=schema?.profiles?.[`${ref?.kind}:${ref?.type_id}`];
  if(!raw || !profile || (raw.id && raw.id!==ref.id)) return null;
  const field_specs=schema.display_policy?.profile_field_specs?.[`${ref.kind}:${ref.type_id}`] || {};
  const fields=Object.entries(raw).map(([key,value])=>({key,label:key.replace(/_/g,' '),...field_specs[key],value}));
  const byKey=new Map(fields.map(f=>[f.key,f]));
  const sections=(profile.compact || []).map(section=>({...section,fields:section.fields.filter(f=>byKey.has(f.key)).map(f=>({...byKey.get(f.key),...f,value:raw[f.key]}))}));
  const provenance=Object.fromEntries((schema.provenance_fields || []).filter(key=>Object.hasOwn(raw,key)).map(key=>[key,raw[key]]));
  return {ref,release_id:schema.release_id,title:raw[profile.title_field] || profile.title || data.label || ref.id,
    subtitle:profile.title,profile_id:profile.id,widget:profile.widget,sections,fields,field_specs,provenance,
    tables:[],component_views:[],note:profile.note || ''};
}
