// All display decisions are declared in viewer.schema.json. Stored records,
// typed references, exact lookup keys, URLs and cursors remain unchanged.
const matches = (pattern,value) => new RegExp(pattern).test(String(value));
export const displayText = (value,policy={}) => typeof value === 'string' && policy.replace_underscores ? value.replace(/_/g,' ') : value;
export function publicId(value,policy={},key='id') {
  if (!policy.version) return value;
  if (value === null || value === undefined || value === '') return undefined;
  let result=String(value);
  for (const alias of policy.public_id_aliases || []) result=result.replace(new RegExp(alias.pattern),alias.replacement);
  if ((policy.internal_value_patterns || []).some(pattern=>matches(pattern,result))) return undefined;
  if ((policy.public_field_names || []).includes(key)) return result;
  return (policy.public_id_patterns || []).some(pattern=>matches(pattern,result)) ? result : undefined;
}
export const identifierField = (key,spec={}) => spec.kind === 'identifier' || /(^|_)id($|_)/.test(key) || key === 'alt_id';
export function visibleField(key,value,policy={},spec={}) {
  if (!policy.version) return true;
  if ((policy.hidden_fields || []).includes(key)) return false;
  if (identifierField(key,spec)) return (Array.isArray(value) ? value : [value]).some(v=>publicId(v,policy,key)!==undefined);
  return typeof value !== 'string' || !(policy.internal_value_patterns || []).some(pattern=>matches(pattern,value));
}
export function displayVersion(value,policy={},profileKey=null) {
  if (value === null || value === undefined || value === '') return value;
  const text=String(value);
  for (const rule of policy.version_rules || []) {
    if (rule.profiles && !rule.profiles.includes(profileKey)) continue;
    if (matches(rule.pattern,text)) return rule.display || text.replace(new RegExp(rule.pattern),rule.template);
  }
  if (policy.version && (/^(?:PanKgraph|PanKbase_|Ensembl_)/.test(text) || /[a-f0-9]{12,}/i.test(text))) return policy.unknown_internal_version;
  return displayText(text,policy);
}
export function displayValue(key,value,policy={},profileKey=null,spec={}) {
  if (/(^|_)version$/.test(key)) return displayVersion(value,policy,profileKey);
  if (Array.isArray(value)) return value.map(v=>displayValue(key,v,policy,profileKey,spec)).filter(v=>v!==undefined);
  for (const alias of policy.value_aliases || []) {
    if (alias.field === key && (!alias.profiles || alias.profiles.includes(profileKey)) && Object.prototype.hasOwnProperty.call(alias.values,value)) return alias.values[value];
  }
  if (typeof value !== 'string' && typeof value !== 'number') return value;
  if (identifierField(key,spec)) return publicId(value,policy,key);
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return value;
  if ((policy.public_id_patterns || []).some(pattern=>matches(pattern,value))) return value;
  return displayText(value,policy);
}
export function presentCard(card,policy={}) {
  if (!card) return card;
  const profileKey=`${card.ref.kind}:${card.ref.type_id}`;
  const spec = (f,key) => {
    const override=policy.profile_field_specs?.[profileKey]?.[key] || {};
    const label=override.label || policy.field_labels?.[key];
    return {...f,...override,label:label || displayText(f.label,policy),short_label:label,
      unit:policy.unit_labels?.[f.unit] || f.unit,
      show_unit:!(policy.omit_unit_annotations || []).includes(f.unit),
      description:override.description || policy.field_descriptions?.[key] || f.description ||
        (/unspecified/.test(f.unit || '') ? 'Source units were not provided; this does not establish a dimensionless measurement.' : undefined)};
  };
  const field = f => ({...spec(f,f.key),value:displayValue(f.key,f.value,policy,profileKey,f)});
  const visible = f => visibleField(f.key,f.value,policy,{...card.field_specs?.[f.key],...f});
  const ownTitle=card.title === card.ref.id ? publicId(card.ref.id,policy) || card.subtitle || card.ref.type_id : card.title;
  return {...card,title:displayText(ownTitle,policy),note:displayText(card.note,policy),
    field_specs:Object.fromEntries(Object.entries(card.field_specs || {}).map(([key,f])=>[key,spec(f,key)])),
    public_relationship_id:card.ref.kind === 'edge' ? publicId(card.ref.id,policy) : undefined,
    sections:card.sections.map(s=>({...s,title:displayText(s.title,policy),fields:s.fields.filter(visible).map(field)})).filter(s=>s.fields.length),
    fields:card.fields?.filter(visible).map(field),
    // Keep exact lookup context even when an endpoint has no public display ID.
    endpoint_refs:card.endpoints?.map(e=>e.ref),
    endpoints:card.endpoints?.map((e,i)=>({...e,role:i ? 'Target' : 'Source',display_id:publicId(e.ref.id,policy)})).filter(e=>e.display_id!==undefined),
    raw_provenance:card.provenance,
    provenance:Object.fromEntries(Object.entries(card.provenance).map(([key,value])=>[key,displayValue(key,value,policy,profileKey)])),
    tables:card.tables.map(t=>({...t,field_specs:Object.fromEntries(Object.entries(t.field_specs || {}).map(([key,f])=>[key,spec(f,key)])),columns:t.columns.filter(k=>!(policy.hidden_fields || []).includes(k)),filters:t.filters.filter(k=>!(policy.hidden_fields || []).includes(k))})),
  };
}
