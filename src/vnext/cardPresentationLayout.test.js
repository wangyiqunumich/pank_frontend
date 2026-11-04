import {compactCardModel} from './cardPresentationLayout';
import {recordedInfocardModel} from './recordedPresentation';

test('short cards retain every available row and exact source properties',()=>{
 const raw={name:'CFTR',id:'ENSG00000001626',data_source:'Ensembl'};
 const full=recordedInfocardModel({evidence_properties:raw},false);
 const compact=compactCardModel(full);
 expect(compact.omitted).toBe(0);
 expect(compact.rawProperties).toEqual(raw);
 expect(compact.schema.flatMap(s=>Array.isArray(s[1])?s[1]:[]).map(r=>r[3])).toEqual(expect.arrayContaining(['name','id','data_source']));
});
test('long cards budget compact rows without dropping complete-record evidence',()=>{
 const raw={gene_symbol:'CFTR',cell_type:'Ductal',median_pct_cells_expressing:87.3,median_donor_log_cpm:10.5,total_cells:33686,description:'Source description '.repeat(100),...Object.fromEntries(Array.from({length:30},(_,i)=>['field'+i,'Recorded annotation '.repeat(10)]))};
 const full=recordedInfocardModel({evidence_properties:raw},false);
 const compact=compactCardModel(full);
 expect(compact.omitted).toBeGreaterThan(0);
 expect(compact.schema.flatMap(s=>Array.isArray(s[1])?s[1]:[]).map(r=>r[0])).toContain('Cells expressing (%)');
 expect(compact.rawProperties).toEqual(raw);
 expect(full.schema.flatMap(s=>Array.isArray(s[1])?s[1]:[]).some(r=>r[3]==='field29')).toBe(true);
});
test('unset initial card does not crash the graph',()=>expect(compactCardModel({schema:undefined})).toEqual({schema:undefined}));
