/** Declarative object-owned components. No neighbor lookup or SQL discovery. */
export function componentViews(card, schema) {
  const owned=new Set((card.tables || []).map(t=>t.id));
  if (card.component_views) return card.component_views.filter(c=>c.table_ids.some(id=>owned.has(id)))
    .map(c=>({...c,table_ids:c.table_ids.filter(id=>owned.has(id))}));
  // Compatibility with immutable API responses; no new registration uses detail_view.
  const legacy=schema.detail_views?.[card.detail_view];
  return legacy ? [{id:'expression',renderer:'condition_tables',title:legacy.title,
    table_ids:(card.tables || []).map(t=>t.id),view:legacy,legacy:true}] : [];
}
export function conditionGroups(component,card) {
  if (component.legacy) return component.view.groups;
  const owned=new Set(component.table_ids);
  return component.view.groups.map(group=>({...group,presets:group.presets.filter(p=>owned.has(p.table_id))}))
    .filter(group=>group.presets.length);
}
export function contextFilters(component,card) {
  const spec=component.view.context_filters || (component.legacy ? {cell_type_id:{endpoint_type:'Cell'}} : {});
  const filters={};
  for (const [key,selector] of Object.entries(spec)) {
    const refs=(card.endpoint_refs || card.endpoints?.map(e=>e.ref) || []).filter(r=>r.type_id===selector.endpoint_type);
    const value=component.context_values?.[key] ?? (refs.length===1 ? refs[0].id : undefined);
    if(value===undefined) return null; // missing/ambiguous required context never broadens a query
    filters[key]=value;
  }
  return filters;
}
