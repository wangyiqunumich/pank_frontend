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
// Presentation only. Exact values remain in evidence_properties and row title hints.
export const HIDDEN_PROCESSING_FIELDS = new Set(['expression_support_match', 'expression_support_rule']);
const EXACT_NUMBERS = /(^id$|_id$|^start_loc$|^end_loc$|^source_row$|^rank_|_rank$|^total_cells$|^nsnp$|^n_snp$|^size$|credible_set_size)/;
export function displayNumber(value, key = '') {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0 || EXACT_NUMBERS.test(key)) return String(value);
  const absolute = Math.abs(value);
  if (absolute < 0.001 || absolute >= 10000) {
    const [mantissa, exponent] = value.toExponential(2).split('e');
    const superscript = {'-':'⁻','+':'','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
    return `${Number(mantissa)} × 10${String(Number(exponent)).split('').map(c => superscript[c]).join('')}`;
  }
  const rounded = Number(value.toPrecision(4));
  // Do not turn a probability just below/above one into an exact one.
  return rounded === 1 && value !== 1 ? String(value) : String(rounded);
}
export function displayWords(value) {
  return String(value).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\+/g, '+ ').replace(/\s+/g, ' ').trim();
}
const PRIMARY = ['id','name','data_modality','anatomical_structure','t1d_stage','derived_diabetes_status',
  'gene_symbol','cell_type_label','cell_type','tissue_name','condition','comparison','log2_fold_change',
  'padj','adjusted_p_value','pvalue','p_value','pval','nominal_p','pip','pp_h4_abf','nes','es',
  'rank_in_cell_type','median_pct_cells_expressing','median_donor_log_cpm','total_cells',
  'go_evidence_code','evidence','effect_direction','expression_call'];
const SOURCE_PRIMARY = new Set(['data_source','data_source_url','data_version']);
export function fieldText(key, value) {
  if (key === 'go_evidence_code') {
    const expand = code => GO_CODES[code] ? `${code} — ${GO_CODES[code]}` : recordedText(code);
    return Array.isArray(value) ? value.map(expand).join('; ') : expand(value);
  }
  if (typeof value === 'number') return displayNumber(value, key);
  if (Array.isArray(value)) return value.length ? value.map(item => fieldText(key, item)).join('; ') : 'Empty list (recorded)';
  if (typeof value !== 'string') return recordedText(value);
  if (/^https?:\/\//i.test(value)) return value;
  if (key === 'data_source' && value === 'NCBO') return 'National Center for Biomedical Ontology (NCBO)';
  if (key === 'gene_mapping_source' && value.endsWith('.csv')) return 'Gene identifier mapping file (CSV)';
  if (key === 'expression_source_file' && value === 'all_donors_per_celltype_logCPM.csv') return 'Expression across donors and cell types (logCPM, CSV)';
  if (key === 'deg_source_file' && /_deseq\.tsv$/i.test(value)) return `${displayWords(value.replace(/_deseq\.tsv$/i, ''))} (DESeq, TSV)`;
  if (key === 'data_version' && value === '4_29_25') return '29 Apr 2025';
  if (key === 'comparison' && value === 'one_vs_rest') return 'This cell type versus all other cell types';
  if (key === 'condition' && value === 'ND') return 'Non-diabetic (ND)';
  return displayWords(value);
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
  const values = { ...data, __card_title: displayWords(recordedText(title)) };
  const schema = [['Title', '__card_title']];
  if (isEdge) {
    values.__from = displayWords(data.source_name || data.source); values.__to = displayWords(data.target_name || data.target);
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
  Object.keys(raw).sort((a,b) => ((PRIMARY.indexOf(a) < 0 ? 999 : PRIMARY.indexOf(a)) - (PRIMARY.indexOf(b) < 0 ? 999 : PRIMARY.indexOf(b))) || a.localeCompare(b)).forEach((key, index) => {
    if (key === 'description' || HIDDEN_PROCESSING_FIELDS.has(key)) return;
    const def = fieldDefinition(key), slot = `__field_${index}`;
    values[slot] = fieldText(key, raw[key]);
    const section = SOURCE_PRIMARY.has(key) ? 'Sources' : PRIMARY.includes(key) && (groups.get('Key evidence')?.length || 0) < 12 ? 'Key evidence' : 'Additional details';
    if (!groups.has(section)) groups.set(section, []);
    const url = typeof raw[key] === 'string' && /^https?:\/\/\S+$/i.test(raw[key]);
    groups.get(section).push([def.label, slot, url ? 'link' : 'recorded', key]);
    if (def.help) help.add(def.help);
  });
  schema.push(...['Key evidence','Sources','Additional details'].filter(section => groups.has(section)).map(section => [section, groups.get(section), section === 'Additional details' ? 'collapsed' : undefined]));
  values.__source_summary = typeof raw.data_source === 'string' && /^https?:/.test(raw.data_source) ? 'Linked source (above)' : fieldText('data_source', raw.data_source);
  schema.push(['Footer', [['Data source', '__source_summary']]]);
  if (isProvenance) help.add('This is a metadata definition record, not a donor.');
  if (help.size) { values.__help = [...help].join(' '); schema.push(['How to read this evidence', '__help', 'collapsed']); }
  return {data: values, schema, rawProperties: raw};
}
