// Canonical KG-shape regression fixture, not retrieved biological evidence.
const base = require('./scbrowser-demo-data.cjs');
const nodes = [
  { '~id': 'ENSG00000001626', '~labels': ['Gene'], '~properties': { HGNC_symbol: 'CFTR', name: 'CFTR' }, display_type: 'gene' },
  { '~id': 'CL_0002079', '~labels': ['anatomical_structure'], '~properties': { name: 'ductal cell' } },
  { '~id': 'fixture-muc5b', '~labels': ['anatomical_structure'], '~properties': { name: 'pancreatic ductal cell MUC5B+' } },
];
const edges = ['CL_0002079', 'fixture-muc5b'].map((cell, index) => ({ '~id': `cftr-enriched-${index}`, '~start': 'ENSG00000001626', '~end': cell, '~type': 'GENE_ENRICHED_IN', display_type: 'gene_enriched_in', '~properties': { condition: 'ND', data_version: 'Navigation regression fixture' } }));
module.exports = { run: { ...base.run, question: 'CFTR uppercase enrichment navigation regression', plan: { ...base.run.plan, original_question: 'CFTR enrichment navigation regression' } }, result: { ...base.result, combined_query_result: { nodes, edges }, xy_json: { ENSG00000001626: { x: 0, y: 0 }, CL_0002079: { x: 0, y: -150 }, 'fixture-muc5b': { x: 0, y: 150 } }, answer: '**Navigation regression fixture — real CFTR atlas expression.**\n\nThis graph uses the canonical uppercase GENE_ENRICHED_IN format and HGNC_symbol node property. It verifies automatic map integration; it is not a retrieval or statistical analysis.' } };
