import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {captureModules,firstModuleContexts,useResultModules} from './ResultModules';
jest.mock('./PanKbaseModule',()=>({__esModule:true,default:function Module({context,moduleId}){const [value,set]=require('react').useState('initial');return <button data-testid={moduleId} onClick={()=>set('changed')}>{context.geneSymbol}:{value}</button>;}}));
jest.mock('./SingleCellBrowser',()=>({__esModule:true,default:()=>null}));
jest.mock('./QtlBrowser',()=>({__esModule:true,default:()=>null}));
jest.mock('./PanKgraphFunctionalPlot',()=>({__esModule:true,default:()=>null}));
const gene=name=>({'~id':name,'~labels':['gene'],'~properties':{name}});
const result=nodes=>({combined_query_result:{nodes,edges:[]}});
function Harness({payload,scope='one'}){const {tabs}=useResultModules({result:payload,scope,enabled:true,guideEnabled:false,baseTabs:[{id:'graph_viewer',content:<span data-testid="graph">{payload.combined_query_result.nodes.length}</span>}]});return tabs.map(t=><section key={t.id}>{t.content}</section>);}
test('streamed graph adds unseen modules once, preserving mount, original context and user state',()=>{
 const view=render(<Harness payload={result([])}/>);const graph=screen.getByTestId('graph');
 view.rerender(<Harness payload={result([gene('CFTR'),gene('INS')])}/>);
 const genome=screen.getByTestId('genome_browser');fireEvent.click(genome);
 view.rerender(<Harness payload={result([gene('INS'),{'~id':'donor','~labels':['donor']}])}/>);
 expect(screen.getByTestId('genome_browser')).toBe(genome);expect(genome.textContent).toBe('CFTR:changed');
 expect(screen.getByTestId('graph')).toBe(graph);expect(graph.textContent).toBe('2');
 expect(screen.getAllByTestId('pca_explorer')).toHaveLength(1);
 view.rerender(<Harness payload={result([])}/>);expect(screen.getByTestId('genome_browser')).toBe(genome);
 view.rerender(<Harness payload={result([gene('INS')])} scope="two"/>);expect(screen.getByTestId('genome_browser').textContent).toBe('INS:initial');
 expect(screen.queryByTestId('pca_explorer')).toBeNull();
});
test('captured values are owned snapshots and later candidates cannot overwrite them',()=>{
 const contexts=firstModuleContexts(result([gene('CFTR')]));const first=captureModules(null,'one',contexts);
 contexts.genome_browser.geneSymbol='MUTATED';expect(first.entries.genome_browser.geneSymbol).toBe('CFTR');
 expect(captureModules(first,'one',contexts)).toBe(first);
});
test('QTL requires exact source identity and full credible set; first available edge wins',()=>{
 const edge=(id,source)=>({'~id':id,'~type':'part_of_QTL_signal','~properties':{source_id:source,credible_set_id:id}});
 const payload={combined_query_result:{nodes:[],edges:[edge('missing','unknown'),edge('ENSG00000001626__CFTR__1','PKBDS2105PCON'),edge('ENSG00000001626__CFTR__2','PKBDS2105PCON')]}};
 expect(firstModuleContexts(payload).qtl_browser.credibleSet).toBe('ENSG00000001626__CFTR__1');
});
test('late endpoint arrivals activate RNA and DE once; later edges cannot change the captured pair',()=>{
 const edge={'~id':'first','~type':'T1D_DEG_IN','~start':'INS','~end':'beta','~properties':{}};
 const payload={combined_query_result:{nodes:[],edges:[edge]}};
 expect(firstModuleContexts(payload).single_cell_browser).toBeUndefined();
 payload.combined_query_result.nodes=[gene('INS'),{'~id':'beta','~labels':['Cell_type'],'~properties':{name:'Beta cell'}}];
 const first=captureModules(null,'one',firstModuleContexts(payload));
 expect(first.entries.single_cell_browser.geneSymbol).toBe('INS');
 expect(first.entries.differential_expression.recordId).toBe('first');
 payload.combined_query_result.nodes.push(gene('CFTR'));
 payload.combined_query_result.edges.unshift({...edge,'~id':'later','~start':'CFTR'});
 const next=captureModules(first,'one',firstModuleContexts(payload));
 expect(next).toBe(first);expect(next.entries.single_cell_browser.geneSymbol).toBe('INS');
});
