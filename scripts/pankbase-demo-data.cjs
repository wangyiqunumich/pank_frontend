// UI acceptance fixture only: typed routing, never claimed as retrieved evidence.
const base=require('./scbrowser-cftr-demo-data.cjs');
const result=structuredClone(base.result);
result.combined_query_result.nodes[0]['~properties']={...result.combined_query_result.nodes[0]['~properties'],chromosome:'7',start_loc:117480025,end_loc:117668665,genome_build:'GRCh38',coordinate_system:'0-based-half-open'};
result.combined_query_result.nodes.push({'~id':'fixture-donor','~labels':['Donor'],'~properties':{name:'Navigation fixture donor'}});
result.combined_query_result.edges.push({'~id':'fixture-de','~start':'ENSG00000001626','~end':'CL_0002079','~type':'T1D_DEG_IN','~properties':{cell_type_label:'Beta',data_source:'Navigation fixture only'}});
result.result_page_state={main_visual:'graph_viewer'};
result.answer='**PanKbase integration navigation fixture.**\n\nGraph nodes, relationships and region here are test inputs, not retrieved biological evidence. Module data is loaded separately from its named public source. A related resource does not establish a matching cohort.';
module.exports={run:{...base.run,question:'PanKbase module navigation acceptance'},result};
