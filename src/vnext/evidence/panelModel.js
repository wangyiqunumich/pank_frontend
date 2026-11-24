import {compactSections} from './compactSections';
import {evidenceDisplay, presentCard} from './displayPolicy';
import {conditionGroups, contextFilters} from './evidenceComponents';
import {bundled, panelSchema} from './panelSchema';
import {panelTabs} from './panelTabs';
import {expandedSections, hasExtraRecord, objectSections, recordDesign} from './recordDesign';

const provenanceFields = ['data_source','data_source_url','data_version','license','license_url'];

export function currentPresets(presets, policy = bundled) {
  const {excluded_presets: excluded, superseded_presets: superseded} = policy.expression_display;
  return presets.filter(preset => !excluded.includes(preset.id) && !presets.some(other => other.id === superseded[preset.id]));
}

export function endpointName(card, endpoint) {
  if (endpoint.display_name) return endpoint.display_name;
  const type = endpoint.ref.type_id;
  const keys = type === 'Gene' ? ['HGNC_symbol','gene_name','gene_symbol']
    : ['Cell','anatomical_structure'].includes(type) ? ['cell_type_name','cell_name'] : [];
  if (card.endpoints.filter(item => item.ref.type_id === type).length === 1) {
    for (const key of keys) {
      const value = card.fields.find(field => field.key === key)?.value;
      if (typeof value === 'string' && value) return value;
    }
  }
  return endpoint.display_id || endpoint.ref.id;
}

function relationship(card, panel) {
  const type = card.ref.kind === 'edge' ? card.ref.type_id.split('__')[0] : null;
  const roles = panel.record_view.relationship_roles?.[type];
  const context = panel.expression_display.compact_context?.[card.ref.type_id];
  const value = key => card.fields.find(field => field.key === key)?.value;
  return {
    endpoints: (card.endpoints || []).map((endpoint, index) => {
      const id = endpoint.display_id || endpoint.ref.id;
      const name = endpointName(card, endpoint);
      return {id, name,
        label: roles?.[index] || panel.endpoint_labels?.[endpoint.ref.type_id] || endpoint.role || panel.context.endpoint_fallback_labels[index],
        accession: panel.context.show_public_accessions && name !== id ? id : null,
      };
    }),
    method: value('method') || context?.method,
    data: roles ? null : context?.data || value('description'),
  };
}

function tableDescriptor(source, schema, panel, overrides = {}) {
  const allFields = source.all_fields || schema.tables?.[source.id]?.all_fields || source.columns;
  const columns = (overrides.columns || panel.table_columns[source.id] || source.columns).filter(key => allFields.includes(key) && !(source.id === 'ccc_contexts' && key === 'map_id'));
  const fieldSpecs = {...source.field_specs};
  for (const [key, label] of Object.entries({...panel.field_labels, ...overrides.labels})) {
    fieldSpecs[key] = {...fieldSpecs[key], label, short_label: label, show_unit: false};
  }
  const requestFields = overrides.wholeRow ? allFields : [...new Set([
    ...(source.request_fields || []), ...columns, ...provenanceFields,
    ...(overrides.comparison === 'disease' ? ['reference_condition'] : []),
    ...(source.id === 'credible_members' ? ['credible_set_id','signal_role'] : []),
  ])].filter(key => allFields.includes(key));
  return {...source, ...overrides.options, allFields, columns, field_specs:fieldSpecs, requestFields,
    ...(overrides.comparison ? {comparison:overrides.comparison} : {})};
}

function conditionTables(component, card, schema, panel) {
  const view = component.view;
  const cell = card.endpoints?.find(endpoint => ['Cell','anatomical_structure'].includes(endpoint.ref.type_id));
  const name = cell ? endpointName(card, cell) : 'Selected cell type';
  const entries = [];
  for (const group of conditionGroups(component, card, panel)) {
    for (const preset of currentPresets(group.presets, panel)) {
      const source = card.tables.find(table => table.id === preset.table_id);
      const context = contextFilters({...component, view:{...view, context_filters:preset.context_filters ?? view.context_filters}},card);
      if (!source || !context) continue;
      entries.push({key:`${group.id}:${preset.id}`, table:tableDescriptor(source, schema, panel, {
        columns:preset.columns,
        labels:{...view.field_labels, ...preset.field_labels},
        comparison:preset.comparison,
        wholeRow:preset.request_all_fields || (component.legacy && preset.table_id === 'ruv_condition_summary'),
        options:{
          title:(preset.title || group.title).replace('{cell}',name),
          methodLabel:preset.method_label || preset.method,
          presets:undefined,
          default_filters:Object.fromEntries(Object.entries(preset.default_filters || view.default_filters || {status:'all'})
            .filter(([key]) => component.legacy || source.filters.includes(key))),
          fixed_filters:{...preset.fixed_filters, ...context},
          pipeline_links:preset.pipeline_links,
        },
      })});
    }
  }
  return {entries, emptyMessage:card.evidence_state === 'temporarily_unavailable'
    ? view.unavailable_message || 'These records are temporarily unavailable.' : entries.length ? undefined : view.unlinked_message};
}

function evidenceTables(tab, card, schema, panel) {
  if (tab.component?.renderer === 'condition_tables') return conditionTables(tab.component, card, schema, panel);
  const owned = tab.component ? tab.component.table_ids.map(id => card.tables.find(table => table.id === id)) : [tab.table];
  return {entries:owned.filter(Boolean).map(table => ({key:table.id, table:tableDescriptor(table, schema, panel)}))};
}

// All record types expose the same view and block contract. Special renderers
// receive a block alongside the common context, field and evidence blocks.
export function evidencePanelModel(source, schema) {
  const panel = panelSchema(schema);
  const display = evidenceDisplay(schema, panel, source.ref);
  const card = recordDesign(presentCard(source, display.policy), source, panel);
  const tabs = panelTabs(card, schema);
  const compact = compactSections(card, objectSections(card,panel), panel);
  const details = panel.record_view.detail_blocks;
  const detailBlock = details?.widgets?.[card.widget] || details?.designs?.[card.production_design];
  const context = relationship(card, panel);
  const contextBlocks = context.endpoints.length ? [{kind:'relationship'}] : [];
  const cccTab = tabs.find(tab => tab.visualization === 'ccc_dot_matrix');
  const overview = cccTab ? [{kind:'ccc_summary'}] : [];
  const record = {
    id:'record', title:panel.complete_record.title, layout:'record',
    blocks:[...overview, ...contextBlocks, {kind:'fields', sections:expandedSections(card,panel)},
      ...(detailBlock ? [{kind:detailBlock}] : [])],
  };
  const evidence = tabs.map(tab => ({id:tab.id, title:tab.title, layout:'table', blocks:[...overview, ...contextBlocks,
    ...(tab.visualization ? [{kind:tab.visualization}] : []), {kind:'tables', ...evidenceTables(tab,card,schema,panel)},
  ]}));
  const preferred = tabs.find(tab => tab.visualization && tab.visualization === panel.record_view.preferred_evidence_visualization);
  return {card, panel, display, compact, context, cccTable:cccTab?.table, views:[record,...evidence],
    defaultView:preferred?.id || record.id, canExpand:hasExtraRecord(card,compact,tabs,panel)};
}
