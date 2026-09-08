import catalog from '../schema/recorded_fields.json';

export const fieldDefinition = (key) => catalog.fields[key] || {
  label: String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
  section: 'Additional recorded details', format: 'recorded',
};
export const recordedText = (value) => {
  if (value === undefined || value === null || value === '') return 'Not recorded';
  if (Array.isArray(value)) return value.length ? value.map(recordedText).join('; ') : 'Empty list (recorded)';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes (true)' : 'No (false)';
  return String(value); // Never round a measurement or rewrite an identifier.
};
const GO_CODES = { IBA: 'Inferred from Biological aspect of Ancestor', IBD: 'Inferred from Biological aspect of Descendant',
  IDA: 'Inferred from Direct Assay', IPI: 'Inferred from Physical Interaction', IMP: 'Inferred from Mutant Phenotype',
  IGI: 'Inferred from Genetic Interaction', IEP: 'Inferred from Expression Pattern', EXP: 'Inferred from Experiment',
  TAS: 'Traceable Author Statement', NAS: 'Non-traceable Author Statement', IEA: 'Inferred from Electronic Annotation',
  IC: 'Inferred by Curator', ND: 'No biological Data available', ISS: 'Inferred from Sequence or structural Similarity',
  ISO: 'Inferred from Sequence Orthology', ISA: 'Inferred from Sequence Alignment', ISM: 'Inferred from Sequence Model',
  IGC: 'Inferred from Genomic Context', RCA: 'Inferred from Reviewed Computational Analysis',
  IKR: 'Inferred from Key Residues', IRD: 'Inferred from Rapid Divergence', HTP: 'Inferred from High Throughput Experiment',
  HDA: 'Inferred from High Throughput Direct Assay', HMP: 'Inferred from High Throughput Mutant Phenotype',
  HGI: 'Inferred from High Throughput Genetic Interaction', HEP: 'Inferred from High Throughput Expression Pattern' };
export function fieldText(key, value) {
  if (key === 'go_evidence_code') {
    const expand = code => GO_CODES[code] ? `${code} — ${GO_CODES[code]}` : recordedText(code);
    return Array.isArray(value) ? value.map(expand).join('; ') : expand(value);
  }
  return recordedText(value);
}
const TYPES = {
  GENE_DETECTED_IN: 'Gene detected in cell type', GENE_ENRICHED_IN: 'Gene enriched in cell type',
  T1D_DEG_IN: 'Gene expression difference in type 1 diabetes', GENE_ACTIVITY_SCORE_IN: 'Chromatin-based gene activity',
  SIGNAL_COLOC_WITH: 'Shared genetic-signal evidence', PART_OF_QTL_SIGNAL: 'Variant in a molecular-trait signal (QTL)',
  PART_OF_GWAS_SIGNAL: 'Variant in a genome-wide association signal', ASSOCIATED_WITH_GO: 'Gene function annotation (GO)',
  FGSEA_ENRICHED_IN: 'Gene-set enrichment', EFFECTOR_GENE_OF: 'Candidate effector gene evidence',
  MARKER_GENE_OF: 'Cell-type marker annotation', OCR_PEAK_IN: 'Open chromatin region in cell type',
};
const kindText = value => TYPES[String(value).toUpperCase()] || fieldDefinition(value || 'Record').label;

// Build cards from actual evidence properties, not assumptions about which fields exist.
// Synthetic keys prevent record fields named id/source/type from replacing renderer identity.
export function recordedInfocardModel(data, isEdge) {
  const raw = data.evidence_properties || {};
  const isProvenance = data.raw_labels?.includes('provenance');
  const title = isEdge ? kindText(data.raw_type || data.type) : isProvenance ? 'Metadata definition record'
    : data.sample_title || raw.name || raw.hgnc_symbol || raw.id || data.label || data.id;
  const values = { ...data, __card_title: recordedText(title) };
  const schema = [['Title', '__card_title']];
  if (isEdge) {
    values.__from = data.source_name || data.source; values.__to = data.target_name || data.target;
    schema.push(['Relationship', [['From', '__from'], ['To', '__to']]]);
  }
  if (data.sample_title) {
    values.__donors = data.sample_donors;
    schema.push(['Linked records', [['Linked donor', '__donors']]]);
  }
  if (raw.description !== undefined) {
    values.__description = recordedText(raw.description); schema.push(['Description', '__description']);
  }
  const groups = new Map(); const help = new Set();
  Object.keys(raw).sort((a,b) => (a === 'id' ? -1 : b === 'id' ? 1 : a.localeCompare(b))).forEach((key, index) => {
    if (key === 'description') return;
    const def = fieldDefinition(key), slot = `__field_${index}`;
    values[slot] = fieldText(key, raw[key]);
    const section = ['id', 'name', 'synonyms', 'data_modality', 'anatomical_structure'].includes(key) ? 'Identity' : def.section;
    if (!groups.has(section)) groups.set(section, []);
    const url = typeof raw[key] === 'string' && /^https?:\/\/\S+$/i.test(raw[key]);
    groups.get(section).push([def.label, slot, url ? 'link' : 'recorded', key]);
    if (def.help) help.add(def.help);
  });
  schema.push(...groups.entries());
  values.__source_summary = typeof raw.data_source === 'string' && /^https?:/.test(raw.data_source) ? 'Linked source (above)' : recordedText(raw.data_source);
  schema.push(['Footer', [['Data source', '__source_summary']]]);
  if (isProvenance) help.add('This is a metadata definition record, not a donor.');
  if (help.size) { values.__help = [...help].join(' '); schema.push(['How to read this evidence', '__help']); }
  return {data: values, schema, rawProperties: raw};
}
