import { normalizeExternalLinks } from './externalLinks';
import schema from './schema/result_page_schema.json';

// Pure presentation selection. No requests, model calls, Markdown parsing or DOM work.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : [];
const values = value => object(value) ? Object.values(value) : list(value);
const pending = value => ['pending', 'queued', 'running', 'processing'].includes(value);
const failure = value => ['partial', 'unavailable', 'failed', 'interrupted', 'cancelled'].includes(value);
const token = value => typeof value === 'string' && value.length <= 80 ? value.trim().toLowerCase() : '';
const safeWebUrl = value => typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value);
export const isResultAssetUrl = value => typeof value === 'string' && /^\/(?:pankgraph-vnext\/)?api\/resources\/[a-zA-Z0-9_-]+$/.test(value);
const assetIdentity = value => isResultAssetUrl(value) ? value.replace(/^\/pankgraph-vnext/, '') : '';

function getGraphTypes(evidence, projection) {
  const steps = values(evidence?.steps);
  const edges = [...list(evidence?.edges), ...steps.flatMap(step => list(step?.edges)), ...list(projection?.edges)];
  const types = edges.map(edge => token(edge?.type || edge?.['~type'] || edge?.label));
  // The existing answer router scans the full bounded KG before context sampling.
  types.push(...list(evidence?.answer_profile?.matched_schema?.edges).map(token));
  return new Set(types.filter(Boolean));
}

function sourceLabel(asset, group) {
  const context = object(group?.context) ? group.context : {};
  return [asset.data_source, asset.credible_set,
    ...['tissue_name', 'tissue', 'cell_type', 'condition', 'disease'].map(key => context[key])]
    .filter(value => typeof value === 'string' && value.trim()).filter((value, index, all) => all.indexOf(value) === index).join(' · ');
}

function dataDownloads(result, groups) {
  const definition = schema.ai_summary.insertions.raw_data_download;
  const assets = [...list(result?.resources?.assets), ...list(result?.assets)];
  const links = [];
  const seen = new Set();
  for (const asset of assets) {
    if (!object(asset)) continue;
    const kind = definition.asset_kinds[asset.kind];
    const media = typeof asset.media_type === 'string' ? asset.media_type.split(';')[0].trim() : '';
    if (!kind || !definition.allowed_media_types.includes(media) || !isResultAssetUrl(asset.url)) continue;
    if (asset.status && asset.status !== 'available') continue;
    const group = groups.find(item => item?.asset_id === asset.asset_id || item?.url === asset.url);
    if (group?.status && group.status !== 'available') continue;
    if (seen.has(asset.url)) continue;
    seen.add(asset.url);
    const context = sourceLabel(asset, group);
    links.push({ id: asset.asset_id || asset.url, url: asset.url,
      label: context ? `${kind.label} — ${context}` : kind.label,
      description: [kind.content, asset.download_name].filter(Boolean).join(' · ') });
  }
  return links;
}

function cleanResources(input) {
  const tabs = object(input) ? { ...input } : {};
  tabs.references = object(tabs.references) ? Object.fromEntries(Object.entries(tabs.references).filter(([, ref]) => object(ref))) : {};
  // Sources originate in the backend registry; hints never provide link values.
  tabs.pankbase_links = list(tabs.pankbase_links).filter(item => Array.isArray(item) && safeWebUrl(item[1]));
  tabs.external_links = list(tabs.external_links).filter(item => Array.isArray(item) && safeWebUrl(item[2]));
  return tabs;
}

function independentEmpirical(tabs, groups, functionalUrl) {
  const candidates = [tabs.empirical_evidence, ...list(tabs.empirical_evidence_groups),
    ...groups.map(group => group?.resources_tabs?.empirical_evidence || (failure(group?.status) ? {
      id: group.source_key || group.asset_id,
      status: 'unavailable', title: 'Source evidence unavailable',
      description: `Could not retrieve source material for ${group.data_source || group.credible_set || 'one of the requested sources'}. Available evidence from other sources is preserved.`,
    } : null))].filter(object);
  const seen = new Set();
  return candidates.filter(item => {
    // Only the exact primary functional asset is removed; another source remains.
    if (functionalUrl && assetIdentity(item.image_url) === assetIdentity(functionalUrl)) return false;
    const key = [item.id, item.image_url, item.download_url || item.link, item.data_source, item.credible_set,
      item.title, item.status].filter(Boolean).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(item => ({ ...item,
    image_url: isResultAssetUrl(item.image_url) ? item.image_url : undefined,
    download_url: isResultAssetUrl(item.download_url) ? item.download_url : undefined,
    link: isResultAssetUrl(item.link) ? item.link : undefined,
  }));
}

export function resolveResultPage({ result, run, state, agentKeywords, resourceTabs } = {}) {
  const projection = result?.combined_query_result;
  const evidence = result?.evidence || run?.evidence || run?.preview?.evidence || {};
  const steps = values(evidence.steps);
  const groups = list(result?.resources?.resource_groups || result?.resource_groups);
  const tabs = cleanResources(resourceTabs || result?.resources_tabs);
  tabs.external_link_groups = normalizeExternalLinks(tabs, evidence, projection);
  const states = object(state) ? state : object(result?.result_page_state) ? result.result_page_state : {};
  const explicitKeywords = [...list(agentKeywords), ...list(states.keywords),
    ...list(result?.result_page_keywords), ...list(run?.evidence?.result_page_keywords), ...list(run?.result_page_keywords)].map(token).filter(Boolean);
  const definitions = [schema.ai_summary.insertions, schema.main_visuals.items, schema.supporting_materials.items];
  const knownKeywords = new Set(definitions.flatMap(section => Object.values(section).flatMap(item => item.agent_keywords || [])));
  const keywords = explicitKeywords.filter(value => knownKeywords.has(value));
  const decisions = [...new Set(explicitKeywords.filter(value => !knownKeywords.has(value)))].map(value => ({ component: null, selected: false, by: 'agent_keyword', reason: 'unknown_keyword', keyword: value }));
  const relationTypes = getGraphTypes(evidence, projection);
  const rawLinks = dataDownloads(result, groups);
  const resourceStatus = result?.component_status?.resources;
  const functionalRows = [...list(evidence.rows), ...steps.flatMap(step => list(step?.rows))]
    .some(row => Number.isFinite(row?.time_minutes) && Number.isFinite(row?.mean_response));
  const functionalMetadata = steps.some(step => object(step?.functional_metadata));
  const functionalFilters = object(evidence.functional_filters);
  const functionalImage = tabs.empirical_evidence?.image_url;
  const functionalTyped = result?.visual_material_kind === 'functional_traces' || result?.source?.template_id === 'functional_traces';
  const functionalContext = functionalTyped || (functionalFilters && (functionalRows || functionalMetadata || isResultAssetUrl(functionalImage) || pending(resourceStatus)));
  const projectionExists = list(projection?.nodes).length > 0;
  const noGraphPlan = ['skills', 'skill_only', 'explanation'].includes(run?.plan?.answer_mode)
    || (Array.isArray(run?.plan?.steps) && run.plan.steps.length === 0);
  const graphExpected = projectionExists || (!functionalContext && !noGraphPlan
    && (!result || object(projection) || Boolean(evidence.graph_version) || Boolean(result?.component_status?.graph) || Boolean(run?.plan)));
  const empirical = independentEmpirical(tabs, groups, functionalContext && isResultAssetUrl(functionalImage) ? functionalImage : null);
  const referencesPending = !functionalContext && pending(resourceStatus);
  const empiricalFailure = !functionalContext && failure(resourceStatus);
  if (!empirical.length && empiricalFailure) empirical.push({ status: 'unavailable',
    title: 'Supplementary resources unavailable', description: 'Some source files or plots could not be retrieved. This is a resource-availability limit, not evidence of biological absence.' });
  const facts = {
    downloadable_data_assets: rawLinks.length > 0,
    graph_projection_or_expected: graphExpected,
    functional_context_or_measurements: functionalContext,
    // The existing genome component uses a disabled IGV adapter in this demo.
    genome_runtime_ready: false, verified_genome_tracks: false,
    references_or_pending: Object.keys(tabs.references).length > 0 || referencesPending,
    registered_links: tabs.pankbase_links.length > 0 || tabs.external_link_groups.length > 0,
    empirical_content_or_failure: empirical.length > 0,
  };
  function select(id, definition) {
    const selected = definition.enabled !== false && !definition.hidden && definition.requires.every(name => facts[name] === true);
    const keyword = keywords.find(value => definition.agent_keywords?.includes(value));
    const kg = definition.kg_relation_types?.some(value => relationTypes.has(token(value)));
    decisions.push({ component: id, selected,
      by: keyword ? 'agent_keyword' : kg ? 'kg_rule' : 'state_or_data',
      reason: selected ? 'required_data_available_or_expected' : definition.enabled === false || definition.hidden ? 'hidden_or_disabled' : 'required_data_missing',
      ...(keyword ? { keyword } : {}) });
    return selected;
  }
  const insertions = Object.entries(schema.ai_summary.insertions).filter(([id, definition]) => select(id, definition))
    .map(([id, definition]) => ({ id, title: definition.title, description: definition.description, links: rawLinks }));
  let mainVisuals = schema.main_visuals.default_order.filter(id => select(id, schema.main_visuals.items[id])).map(id => ({
    id, label: schema.main_visuals.items[id].title,
    status: id === 'functional_data' ? (isResultAssetUrl(functionalImage) ? 'available' : pending(resourceStatus) ? 'pending' : 'unavailable')
      : projectionExists ? 'available' : !result || pending(result?.component_status?.graph) ? 'pending' : failure(result?.component_status?.graph) || failure(result?.completeness) ? 'unavailable' : 'empty',
  }));
  const requested = token(states[schema.main_visuals.state_parameter]);
  const fromState = Object.entries(schema.main_visuals.items).find(([, definition]) => definition.state_values.includes(requested))?.[0];
  const fromKeyword = keywords.map(keyword => Object.entries(schema.main_visuals.items).find(([, definition]) => definition.agent_keywords.includes(keyword))?.[0]).find(id => mainVisuals.some(item => item.id === id));
  const preferred = mainVisuals.some(item => item.id === fromState) ? fromState : fromKeyword || (functionalTyped ? 'functional_data' : null);
  if (preferred) mainVisuals = [...mainVisuals.filter(item => item.id === preferred), ...mainVisuals.filter(item => item.id !== preferred)];
  if (requested) decisions.push({ component: fromState || null, selected: mainVisuals.some(item => item.id === fromState), by: 'state_parameter', reason: preferred === fromState ? 'preferred_eligible_view' : 'state_cannot_override_eligibility' });
  const supportingTabs = [];
  const selectedSupporting = new Set();
  for (const id of schema.supporting_materials.order) {
    const definition = schema.supporting_materials.items[id];
    if (!select(id, definition)) continue;
    selectedSupporting.add(id);
    if (definition.groups) Object.entries(definition.groups).forEach(([groupId, group]) => {
      if ((groupId === 'external_links' ? tabs.external_link_groups : tabs[groupId])?.length) supportingTabs.push({ id: groupId, label: group.title });
    });
    else supportingTabs.push({ id: definition.tab_id, label: definition.title });
  }
  if (!selectedSupporting.has('references')) tabs.references = {};
  if (!selectedSupporting.has('links')) { tabs.pankbase_links = []; tabs.external_links = []; tabs.external_link_groups = []; }
  tabs.empirical_evidence = selectedSupporting.has('empirical_evidence') ? empirical[0] : undefined;
  tabs.empirical_evidence_groups = selectedSupporting.has('empirical_evidence') ? empirical : [];
  return { schemaVersion: schema.schema.version,
    summaryTitle: schema.ai_summary.title, mainVisualTitle: schema.main_visuals.title, supportingTitle: schema.supporting_materials.title,
    insertions, mainVisuals, resourceTabs: tabs,
    resourceStatus: functionalContext && !empiricalFailure ? undefined : resourceStatus,
    supportingTabs, decisions };
}
