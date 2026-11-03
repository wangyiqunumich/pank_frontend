import { pankbaseContexts, pankbaseUrl } from './pankbaseContext';
const gene=(id,symbol,extra={})=>({'~id':id,'~labels':['Gene'],'~properties':{HGNC_symbol:symbol,...extra}});
const cell={'~id':'beta','~labels':['CellType'],'~properties':{name:'Beta'}};
const edge=(id,type,g='g')=>({'~id':id,'~type':type,'~start':g,'~end':'beta','~properties':{dataset_id:'source-v3.4',data_source:'source',condition:'T1D'}});
test('exact node and edge types determine eligibility, preserving context without claiming a cohort match',()=>{
 const result=pankbaseContexts({nodes:[gene('g','CFTR'),cell],edges:[edge('de','T1D_DEG_IN')]});
 expect(result.differential_expression).toMatchObject({recordId:'de',geneSymbol:'CFTR',cellType:'Beta',datasetId:'source-v3.4',match:'related'});
 expect(result.gene_browser).toBeDefined();expect(result.pca_explorer).toBeUndefined();
 expect(pankbaseContexts({nodes:[{'~id':'fake','~labels':['GeneExpression'],'~properties':{name:'PCA CFTR'}}],edges:[]})).toEqual({});
});
test('selected evidence selects its gene; stale selection falls back within current graph',()=>{
 const graph={nodes:[gene('g','CFTR'),gene('g2','INS'),cell],edges:[edge('a','T1D_DEG_IN'),edge('b','T1D_DEG_IN','g2')]};
 expect(pankbaseContexts(graph,'b').differential_expression.geneSymbol).toBe('INS');
 expect(pankbaseContexts(graph,'gone').differential_expression.geneSymbol).toBe('CFTR');
 expect(pankbaseContexts({nodes:[],edges:[]},'b')).toEqual({});
});
test('an ATAC edge does not make differential expression available',()=>{
 expect(pankbaseContexts({nodes:[gene('g','CFTR'),cell],edges:[edge('a','GENE_ACTIVITY_SCORE_IN')]}).differential_expression).toBeUndefined();
});
test('loci require explicit assembly and coordinate convention; source links omit donor identifiers',()=>{
 const props={chromosome:'chr7',start_loc:101,end_loc:200,genome_build:'GRCh38'};
 expect(pankbaseContexts({nodes:[gene('g','CFTR',props)]}).genome_browser.locus).toBeNull();
 const c=pankbaseContexts({nodes:[gene('g','CFTR',{...props,coordinate_system:'1-based-inclusive'})]}).genome_browser;
 expect(c.locus).toEqual({chromosome:'7',start:100,end:200,genomeBuild:'GRCh38'});
 expect(pankbaseUrl('gene_browser',{geneSymbol:'CFTR',recordId:'private-donor',datasetId:'private'})).not.toMatch(/private/);
});
test('donor node enables related functional and PCA resources without inventing a gene',()=>{
 const result=pankbaseContexts({nodes:[{'~id':'donor','~labels':['Donor'],'~properties':{}}]});
 expect(result.functional_browser.available).toBe(true);expect(result.pca_explorer.available).toBe(true);expect(result.gene_browser).toBeUndefined();
});
