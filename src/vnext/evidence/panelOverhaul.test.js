import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import EvidenceDetails from './EvidenceDetails';
import {expandedSections} from './recordDesign';
import {conditionGroups} from './evidenceComponents';
import {publicId} from './displayPolicy';
const f=(key,value)=>({key,label:key,value});
test('complete record deduplicates fields and keeps false and zero in open sections',()=>{
 const card={sections:[{title:'Evidence',fields:[f('score',0),f('supported',false)]}],fields:[f('score',0),f('supported',false),f('extra','value'),f('extra','value'),f('data_source','source')]};
 const sections=expandedSections(card);
 expect(sections.flatMap(s=>s.fields.map(f=>[f.key,f.value]))).toEqual([['score',0],['supported',false],['extra','value']]);
 expect(sections[1].title).toBe('Additional details');
});
test('native RUV view uses owned source rows and never borrows missing ownership',()=>{
 const c={table_ids:['ruv'],view:{groups:[{id:'ruv',presets:[{id:'native',table_id:'ruv_condition_summary'}]}]}};
 expect(conditionGroups(c,{})[0].presets[0]).toMatchObject({table_id:'ruv',fixed_filters:{record_kind:'ruv_abundance',normalization:'RUVSeq_native_export'}});
 expect(conditionGroups({...c,table_ids:['ruv_condition_summary']},{})).toEqual([]);
});
test('coordinate allele variant remains a meaningful public identity',()=>{
 expect(publicId('7:117320776_CATTA_C',{version:1,public_id_patterns:['^rs[0-9]+$']},'variant_id')).toBe('7:117320776_CATTA_C');
});
test('disease contrast uses both source groups without flipping the sign',async()=>{
 const ref={kind:'edge',type_id:'DEG',id:'exact-edge'};
 const table={id:'expression',columns:[],filters:['method','record_kind'],all_fields:['condition','reference_condition','treatment','log2fc','p_adj','stat'],field_specs:{}};
 const card={ref,release_id:'PanKgraph_1104',sections:[],fields:[],provenance:{},tables:[table],component_views:[{id:'expression',renderer:'condition_tables',table_ids:['expression'],view:{groups:[{id:'deg',presets:[{id:'disease',table_id:'expression',fixed_filters:{method:'DESeq2_RUVg_disease_contrast',record_kind:'disease_deg'}}]}]}}]};
 const request=jest.fn().mockResolvedValue({state:'available',records:[{condition:'T1D',reference_condition:'ND',log2fc:-2,p_adj:0}],has_more:false});
 render(<EvidenceDetails card={card} schema={{release_id:card.release_id,tables:{expression:table}}} request={request} releaseId={card.release_id}/>);
 fireEvent.click(screen.getByRole('button',{name:'Expression evidence summary'}));
 expect(await screen.findByText('T1D vs ND')).toBeTruthy();expect(screen.getByText('-2')).toBeTruthy();
 expect(screen.queryByText('Edge role')).toBeNull();expect(screen.queryByRole('button',{name:/Read row/})).toBeNull();
 await waitFor(()=>expect(request.mock.calls[0][1]).toMatchObject({ref,filters:{method:'DESeq2_RUVg_disease_contrast',record_kind:'disease_deg'}}));
});

test('sample and treatment labels retain their literal source spelling',()=>{
 const {displayValue}=require('./displayPolicy');
 expect(displayValue('treatment','no_treatment',{replace_underscores:true})).toBe('no_treatment');
 expect(displayValue('sample_id','HPAP_01_A',{replace_underscores:true})).toBe('HPAP_01_A');
});
test('structured annotations are decoded as data, never executable literals',()=>{
 const {annotationValue}=require('./sourceAnnotations');
 expect(annotationValue("{'ethnicity': 'European', 'percentage': 96},{'ethnicity': 'African', 'percentage': 3}")).toEqual([{ethnicity:'European',percentage:96},{ethnicity:'African',percentage:3}]);
 expect(annotationValue("{x: alert('test')}" )).toBe("{x: alert('test')}");
});
test('credible set exports retain signal roles and raw precision',()=>{
 const {tableCsv}=require('./tableDownloads');
 const csv=tableCsv([{signal_role:'qtl',credible_set_id:'internal-set',variant_id:'rs1',pip:0.123456789}],{id:'credible_members',columns:['variant_id','pip']},{provenance:{}},{},{'internal-set':{description:'Pancreas eQTL'}});
 expect(csv).toContain('signal_role');expect(csv).toContain('qtl');expect(csv).toContain('0.123456789');expect(csv).not.toContain('internal-set');
});
