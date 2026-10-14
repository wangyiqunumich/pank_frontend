// Navigation fixture from the public CFTR example. AWS plot uses its actual source data.
const base = require('./scbrowser-cftr-demo-data.cjs');
const credible = 'ENSG00000001626__CFTR__chr7:117542108:117559464:clu_25847:ENSG00000001626.14__credibleSet1';
const graph = { nodes: [
  { '~id': 'rs2402203', '~labels': ['sequence_variant'], '~properties': { name: 'rs2402203' } },
  { '~id': 'ENSG00000001626', '~labels': ['coding_elements', 'gene'], '~properties': { name: 'CFTR', HGNC_symbol: 'CFTR' } },
], edges: [{ '~id': 'qtl-fixture', '~type': 'PART_OF_QTL_SIGNAL', '~start': 'rs2402203', '~end': 'ENSG00000001626', '~properties': { data_source: 'splicing; GTEx', credible_set: credible, tissue_name: 'Pancreas' } }] };
module.exports = { run: { ...base.run, question: 'CFTR regional fine-mapping viewer acceptance', graph_answer: 'Navigation fixture using the actual production AWS plot for the public CFTR credible set.', evidence: { ...base.run.evidence, nodes: graph.nodes, edges: graph.edges } }, result: { ...base.result, question: 'CFTR regional fine-mapping viewer acceptance', answer: 'Navigation fixture using the actual production AWS plot for the public CFTR credible set.', combined_query_result: graph, core_nodes: graph.nodes.map(node => node['~id']), resources: {}, resources_tabs: {}, result_page_state: { main_visual: 'qtl_fine_mapping' } } };
