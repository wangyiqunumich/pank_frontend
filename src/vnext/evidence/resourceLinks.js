// Declarative external-record links. IDs and SQL records remain unchanged.
export function resourceLink(row, card, registry = {}) {
  const rule = registry[row.source_name];
  const accession = String(row.alt_id ?? '');
  if (!rule || !new RegExp(rule.pattern).test(accession)) return null;
  const own = Object.fromEntries([...(card.sections || []).flatMap(s => s.fields), ...(card.fields || [])].map(f => [f.key, f.value]));
  if (rule.assembly && own.genome_assembly !== rule.assembly) return null;
  if (rule.assembly_pattern && !new RegExp(rule.assembly_pattern).test(own.genome_assembly || '')) return null;
  const symbol = typeof own.name === 'string' && /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(own.name) ? own.name : '';
  if (rule.token === 'symbol' && !symbol) return null;
  const token = rule.token === 'symbol' ? symbol : accession;
  try {
    const url = new URL(rule.url.replace('{record}', encodeURIComponent(token)));
    if (url.protocol !== 'https:' || url.hostname !== rule.host || url.username || url.password) return null;
    return {href:url.href, database:rule.title, record:token, category:rule.category};
  } catch (_) { return null; }
}
