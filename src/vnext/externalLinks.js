// Normalize new source groups and recover legacy labels only from exact saved URLs.
const list = value => Array.isArray(value) ? value : [];
const props = item => item?.properties || item?.['~properties'] || {};
const entity = node => ({ id: String(node?.id || node?.['~id'] || ''), name: String(props(node).name || node?.id || node?.['~id'] || ''), types: list(node?.labels || node?.['~labels']) });
const compare = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
const safe = url => { try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname); } catch { return false; } };
function source(label, url) {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  const domains = [['kegg.jp', 'KEGG'], ['genome.jp', 'KEGG'], ['ensembl.org', 'Ensembl'], ['hpap.pmacs.upenn.edu', 'HPAP data portal']];
  const aliases = { kegg: 'KEGG', ensembl: 'Ensembl', dbsnp: 'dbSNP', hpap: 'HPAP data portal', 'hpap data portal': 'HPAP data portal' };
  if (['local', 'other ontology'].includes(String(label).trim().toLowerCase())) return { source_key: 'other-ontology', display_name: 'Other ontology' };
  const name = domains.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1]
    || (host === 'ncbi.nlm.nih.gov' && new URL(url).pathname.startsWith('/snp/') ? 'dbSNP' : '')
    || aliases[String(label).trim().toLowerCase()];
  return { source_key: name ? name.toLowerCase() : `${String(label || host).toLowerCase()}|${host}`, display_name: name || label || host };
}
export function normalizeExternalLinks(tabs = {}, evidence = {}, projection = {}) {
  const steps = Array.isArray(evidence?.steps) ? evidence.steps : Object.values(evidence?.steps || {});
  const nodes = [...list(evidence?.nodes), ...steps.flatMap(step => list(step?.nodes)), ...list(projection?.nodes)];
  const edges = [...list(evidence?.edges), ...steps.flatMap(step => list(step?.edges)), ...list(projection?.edges)];
  const byId = new Map(nodes.map(node => [entity(node).id, node]));
  const contexts = new Map();
  function record(url, label, entities, provenance) {
    if (!safe(url)) return;
    contexts.set(url, [...(contexts.get(url) || []), { label, entities, provenance }]);
  }
  nodes.forEach(node => {
    const e = entity(node);
    record(props(node).data_source_url, e.name, [e], { kind: 'node', id: e.id, field: 'data_source_url' });
    if (/^ENSG\d{11}(?:\.\d+)?$/.test(e.id)) record(`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(e.id)}`, e.name, [e], { kind: 'node', id: e.id, field: 'registered_identity_route' });
    if (/^rs\d+$/.test(e.id)) record(`https://www.ncbi.nlm.nih.gov/snp/${e.id}`, e.name, [e], { kind: 'node', id: e.id, field: 'registered_identity_route' });
  });
  edges.forEach(edge => {
    const ids = [edge.start_id || edge.source || edge.start || edge['~start'], edge.end_id || edge.target || edge.end || edge['~end']].filter(Boolean).map(String);
    const entities = ids.map(id => byId.has(id) ? entity(byId.get(id)) : { id, name: id, types: [] });
    const relation = edge.type || edge['~type'] || '';
    record(props(edge).data_source_url, [entities.map(e => e.name).join(' → '), relation].filter(Boolean).join(' · '), entities,
      { kind: 'edge', id: String(edge.id || edge['~id'] || ''), field: 'data_source_url', relation });
  });
  const groups = new Map();
  function add(group, item) {
    if (!item || !safe(item.url)) return;
    const identity = source(group.display_name, item.url);
    const key = identity.source_key;
    if (!groups.has(key)) groups.set(key, { ...identity, entries: new Map() });
    const entries = groups.get(key).entries;
    const existing = entries.get(item.url) || { url: item.url, label: '', entities: [], provenance: [] };
    existing.label = existing.label || String(item.label || item.url);
    for (const field of ['entities', 'provenance']) {
      for (const value of list(item[field])) {
        if (!value || typeof value !== 'object') continue;
        if (!existing[field].some(old => JSON.stringify(old) === JSON.stringify(value))) existing[field].push(value);
      }
    }
    entries.set(item.url, existing);
  }
  const structuredUrls = new Set();
  list(tabs.external_link_groups).forEach(group => list(group?.entries).forEach(item => {
    if (item && safe(item.url)) { add(group, item); structuredUrls.add(item.url); }
  }));
  list(tabs.external_links).forEach(link => {
    if (!Array.isArray(link) || !safe(link[2]) || structuredUrls.has(link[2])) return;
    const [name, description, url] = link;
    const matches = contexts.get(url) || [];
    add(source(name, url), { url,
      label: [...new Set(matches.map(match => match.label).filter(Boolean))].join('; ') || description || url,
      entities: matches.flatMap(match => match.entities), provenance: matches.map(match => match.provenance) });
  });
  return [...groups.values()].map(group => ({ ...group, entries: [...group.entries.values()].sort((a, b) => compare(a.label, b.label) || compare(a.url, b.url)) }))
    .sort((a, b) => compare(a.display_name, b.display_name) || compare(a.source_key, b.source_key));
}
