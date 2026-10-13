// Explicit navigation fixtures only; no production graph or analysis statistics.
const runId = '11111111-1111-4111-8111-111111111111';
const resultId = '22222222-2222-4222-8222-222222222222';
const nodes = [
  { '~id':'ENSG00000254647', '~labels':['Gene'], '~properties':{gene_symbol:'INS',name:'INS'} },
  { '~id':'beta', '~labels':['Cell_type'], '~properties':{name:'Beta',cell_type:'Beta'} },
  { '~id':'ductal', '~labels':['Cell_type'], '~properties':{name:'Ductal',cell_type:'Ductal'} },
];
const edge = (id, cell, extras = {}) => ({ '~id':id, '~type':'gene_detected_in', '~start':'ENSG00000254647', '~end':cell.toLowerCase(), '~properties':{gene_symbol:'INS',cell_type:cell,data_version:'Navigation demo fixture',...extras} });
module.exports = {
 run: {run_id:runId,session_id:'scbrowser-local-demo',status:'completed',plan:{original_question:'Explore the single-cell browser navigation demo',steps:[{}]},graph_complete:true,question:'Try the expression card and scBrowser',evidence:{graph_version:'navigation-demo-fixture'}},
 result: {result_id:resultId,status:'ready',combined_query_result:{nodes,edges:[edge('edge-1','Beta'),edge('edge-2','Ductal')]},xy_json:{ENSG00000254647:{x:0,y:0},beta:{x:200,y:100},ductal:{x:100,y:200}},resources_tabs:{},answer:'**Local navigation demo — example graph, real atlas browser.**\n\nThe resource card appears automatically. Use its left/right arrows, then click **Open in scBrowser**. Try minimizing the card and switching between the graph and scBrowser.\n\nThe graph relationships are navigation fixtures, not production biological evidence. scBrowser loads real public PanKbase v3.4 data. First atlas loading may take a little time.'}
};
