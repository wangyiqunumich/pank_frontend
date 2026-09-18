// Presentation only: graph IDs and recorded assay/tissue values stay intact.
const text = (value) => typeof value === 'string' || typeof value === 'number'
  ? String(value).trim() : '';
export const isSample = (node) => node.display_type === 'Sample node'
  || (node['~labels'] || []).some((label) => ['Sample_node', 'Sample node'].includes(label));

export function samplePresentation(node, graph) {
  if (!isSample(node)) return {};
  const props = node['~properties'] || {};
  const id = text(props.id) || text(node['~id']);
  const assay = text(props.data_modality) || text(props['Data Modality']);
  const tissue = text(props.anatomical_structure);
  const identity = [assay, tissue].filter(Boolean).join(' · ') || 'Sample';
  const donors = new Map();
  for (const edge of graph.edges || []) {
    if (String(edge['~type']).toUpperCase() !== 'HAS_SAMPLE' || edge['~end'] !== node['~id']) continue;
    const donor = (graph.nodes || []).find((n) => n['~id'] === edge['~start']
      && (n['~labels'] || []).some((label) => label.toLowerCase() === 'donor'));
    if (donor) donors.set(donor['~id'], text(donor['~properties']?.id) || text(donor['~id']));
  }
  return {
    sample_title: identity,
    sample_display_label: `${identity} · #${id}`,
    sample_record_id: id,
    sample_assay: assay || 'Not recorded',
    sample_tissue: tissue || 'Not recorded',
    sample_donors: [...donors.values()].sort().join(', ') || 'Not included in this graph',
    sample_note: text(props.note) || 'Not recorded',
    sample_contact: text(props.contact) || 'Not recorded',
    sample_source: text(props.data_source) || 'Not recorded',
    sample_version: text(props.data_version) || 'Not recorded',
  };
}
