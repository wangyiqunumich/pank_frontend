import React from 'react';
import {act,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import EvidenceDetails, { InspectedInformationPanel } from './EvidenceDetails';
import { GraphInfoPanelSurface } from '../GraphInfoPanel';
import ObjectInformationPanel from './ObjectInformationPanel';
const ref={kind:'node',id:'ENSG00000001626',type_id:'Gene'};
const table={id:'accessions',title:'Related links',component:'node_alt_id',columns:['source_name','alt_id'],all_fields:['source_name','alt_id'],filters:[],field_specs:{}};
const card={release_id:'PanKgraph_1024',ref,tables:[table],sections:[],fields:[],provenance:{},component_views:[{id:'node_alt_id',title:'Related links',renderer:'table',table_ids:['accessions']}]};
const schema={release_id:'PanKgraph_1024',tables:{accessions:table}};
test('version mismatch never requests or shows SQL tabs',()=>{
 const request=jest.fn();render(<EvidenceDetails card={card} schema={schema} releaseId="PanKgraph_08_04" request={request}/>);
 expect(screen.getByRole('status').textContent).toMatch(/graph version/);
 expect(screen.queryByRole('tab',{name:'Related links'})).toBeNull();expect(request).not.toHaveBeenCalled();
});
test.each([
 ['no_records', 'No matching records.'],
 ['temporarily_unavailable', 'These records are temporarily unavailable.'],
 ['unavailable', 'These records are temporarily unavailable.'],
])('owned table with state %s is requested only on its tab and has a readable status',async(state,message)=>{
 const request=jest.fn().mockResolvedValue({state,records:[],has_more:false});
 render(<EvidenceDetails card={card} schema={schema} releaseId={card.release_id} request={request}/>);
 expect(request).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('tab',{name:'Related links'}));
 await waitFor(()=>expect(request).toHaveBeenCalled());
 expect(request.mock.calls[0][1]).toMatchObject({ref,table_id:'accessions',filters:{}});
 expect(await screen.findByText(message)).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
});
test('a failed evidence read can retry its current page without showing an empty result', async () => {
 const placement={id:'placements',title:'Coordinates',columns:['chr'],all_fields:['chr'],filters:[]};
 const record={...card,tables:[placement],component_views:[]};
 const request=jest.fn()
   .mockResolvedValueOnce({state:'available',records:[{chr:'11'}],has_more:true,next_cursor:'second'})
   .mockResolvedValueOnce({state:'unavailable',records:[],has_more:false})
   .mockResolvedValueOnce({state:'available',records:[{chr:'12'}],has_more:false});
 render(<EvidenceDetails card={record} schema={{...schema,tables:{placements:placement}}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Genomic coordinates'}));
 fireEvent.click(await screen.findByRole('button',{name:'Next page'}));
 expect((await screen.findByRole('alert')).textContent).toContain('temporarily unavailable');
 expect(screen.queryByText('No matching records.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry'}));
 expect(await screen.findByRole('cell',{name:'12'})).toBeTruthy();
 expect(request.mock.calls[2][1]).toEqual(request.mock.calls[1][1]);
});

test('empty default results keep the alternative table filters reachable', async () => {
 const placement={id:'placements',title:'Coordinates',columns:['chr'],all_fields:['chr'],filters:['dataset'],
   presets:[{title:'Default dataset',filters:{dataset:'default'}},{title:'Alternative dataset',filters:{dataset:'alternative'}}]};
 const record={...card,tables:[placement],component_views:[]};
 const request=jest.fn().mockResolvedValueOnce({state:'no_records',records:[],has_more:false})
   .mockResolvedValueOnce({state:'available',records:[{chr:'12'}],has_more:false});
 render(<EvidenceDetails card={record} schema={{...schema,tables:{placements:placement}}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Genomic coordinates'}));
 expect(await screen.findByText('No matching records.')).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Alternative dataset'}));
 expect(await screen.findByRole('cell',{name:'12'})).toBeTruthy();
 expect(request.mock.calls[1][1].filters).toEqual({dataset:'alternative'});
});

test('sample memberships distinguish the source versions in their rows', async () => {
 const sourceMembership={id:'metadata_sample_source',title:'Source memberships',columns:['donor_id'],
   all_fields:['donor_id','data_version','data_source'],filters:[]};
 const record={...card,ref:{kind:'node',type_id:'sample',id:'sample'},tables:[sourceMembership],component_views:[]};
 const request=jest.fn().mockResolvedValue({state:'available',has_more:false,records:[
   {donor_id:'Example donor',data_version:'Source file A',data_source:'Example study'},
   {donor_id:'Example donor',data_version:'Source file B',data_source:'Example study'},
 ]});
 const {container}=render(<EvidenceDetails card={record} schema={{...schema,tables:{metadata_sample_source:sourceMembership}}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Source memberships'}));
 expect(await screen.findByRole('columnheader',{name:'Source version'})).toBeTruthy();
 expect(screen.getByRole('cell',{name:'Source file A'})).toBeTruthy();
 expect(screen.getByRole('cell',{name:'Source file B'})).toBeTruthy();
 const footer=container.querySelector('.xe-evidence-sources.xe-record-footer');
 expect(within(footer).getByText('Example study')).toBeTruthy();
 expect(within(footer).queryByText(/Source file/)).toBeNull();
});

test('variant views hide a missing HGVS sentinel and retain an actual notation', () => {
 const variant={...card,ref:{kind:'node',id:'rs1',type_id:'Variant'},tables:[],component_views:[],
   hgvs:'.',fields:[{key:'HGVS_name',label:'HGVS name',value:'.'}]};
 const view=record=><EvidenceDetails card={record} schema={schema} releaseId={card.release_id} request={jest.fn()}/>;
 const {rerender}=render(view(variant));
 expect(screen.queryByText('.',{exact:true})).toBeNull();
 rerender(view({...variant,hgvs:'NC_000001.11:g.123A>G'}));
 expect(screen.getByText('NC_000001.11:g.123A>G')).toBeTruthy();
});
test('registry without owned tables does not fabricate a tab',()=>{
 render(<EvidenceDetails card={{...card,tables:[],component_views:[]}} schema={schema} releaseId={card.release_id} request={jest.fn()}/>);
 expect(screen.queryByRole('tablist')).toBeNull();
 expect(screen.getByRole('region',{name:'Complete record'})).toBeTruthy();
});

test('arrow keys move tab focus without loading evidence until it is activated', async () => {
 const request=jest.fn().mockResolvedValue({state:'no_records',records:[],has_more:false});
 render(<EvidenceDetails card={card} schema={schema} releaseId={card.release_id} request={request}/>);
 const record=screen.getByRole('tab',{name:'Complete record'});
 const links=screen.getByRole('tab',{name:'Related links'});
 act(() => record.focus());
 fireEvent.keyDown(record,{key:'ArrowRight'});
 expect(document.activeElement).toBe(links);
 expect(links.tabIndex).toBe(0);
 expect(record.getAttribute('aria-selected')).toBe('true');
 expect(request).not.toHaveBeenCalled();
 fireEvent.click(links);
 expect(await screen.findByText('No matching records.')).toBeTruthy();
 expect(screen.getByRole('tabpanel',{name:'Related links'}).id).toBe(links.getAttribute('aria-controls'));
 fireEvent.keyDown(links,{key:'Home'});
 expect(document.activeElement).toBe(record);
});

test('a sparse inspection leaves an explicit empty state and no empty provenance footer', () => {
 const {container}=render(<InspectedInformationPanel card={{ref:{...ref,type_id:'Unmapped'},release_id:card.release_id}} schema={schema} releaseId={card.release_id}/>);
 expect(screen.getByTestId('graph-info-title').textContent).toBe(ref.id);
 expect(screen.getByText('No details recorded.')).toBeTruthy();
 expect(container.querySelector('footer')).toBeNull();
});

test('compact CCC is ready while supporting contexts load and a parent rerender does not reload them', async () => {
 const ref={kind:'edge',id:'ccc',type_id:'LIGAND_RECEPTOR__Gene__Gene'};
 const data={id:ref.id,element_kind:ref.kind,viewer_ref:ref};
 const row={source:'Alpha',target:'Beta',condition:'ND',selection_status:'supporting'};
 const table={id:'ccc_contexts',title:'CCC contexts',columns:Object.keys(row),all_fields:Object.keys(row),filters:[]};
 const schema={release_id:'PanKgraph_1104',tables:{ccc_contexts:table}};
 const source={ref,fields:[],sections:[],tables:[table]};
 const onReady=jest.fn();
 let finishContexts;
 const contexts=new Promise(resolve=>{finishContexts=resolve;});
 const request=jest.fn(path=>path==='/inspect' ? Promise.resolve(source) : contexts);
 const service={schema,request};
 const endpoint={id:'endpoint',name:'G1'};
 const panel=()=> <ObjectInformationPanel data={data} endpointNodes={[endpoint]} service={service} releaseId={schema.release_id} onReady={onReady}/>;
 const {rerender}=render(panel());
 await screen.findByText('Loading sender → receiver contexts…');
 expect(onReady).toHaveBeenCalledTimes(1);
 await act(async()=>finishContexts({state:'available',records:[row],has_more:false}));
 expect(screen.getByText(/Alpha → Beta/)).toBeTruthy();
 expect(onReady).toHaveBeenCalledTimes(1);
 rerender(panel());
 expect(screen.queryByText('Loading sender → receiver contexts…')).toBeNull();
 expect(request.mock.calls.filter(([path])=>path==='/table')).toHaveLength(1);
});

test('donor source rows retain their values and share provenance within a source', async () => {
 const table={id:'metadata_donor',title:'Source annotations',columns:['source_records'],all_fields:['source_records'],filters:[]};
 const provenance={data_source:'Example source',data_version:'Release A',license:'unknown'};
 const request=jest.fn().mockResolvedValue({state:'available',records:[{source_records:[
   {...provenance,row:{measure_a:21}},
   {...provenance,row:{measure_a:23}},
 ]}],has_more:false});
 const donor={...card,ref:{kind:'node',id:'HPAP-fixture',type_id:'donor'},tables:[table],component_views:[]};
 render(<EvidenceDetails card={donor} schema={{...schema,tables:{metadata_donor:table}}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Source annotations'}));
 const annotation=await screen.findByRole('table',{name:'Source annotations'});
 expect(within(annotation).getByText('21')).toBeTruthy();
 expect(within(annotation).getByText('23')).toBeTruthy();
 expect(within(annotation).getAllByRole('heading',{name:'Example source'})).toHaveLength(1);
 expect(within(annotation).getAllByText('License: unknown')).toHaveLength(1);
});

test('the record footer sits below the scroll area in compact and expanded cards', async () => {
 const request=jest.fn().mockResolvedValue({state:'no_records',records:[],has_more:false});
 const record={...card,title:'CFTR evidence',provenance:{data_source:'Recorded fixture'}};
 const surface=mode=><GraphInfoPanelSurface visible mode={mode} position={{x:24,y:24}}>
   <InspectedInformationPanel card={record} schema={schema} releaseId={record.release_id} request={request}/>
 </GraphInfoPanelSurface>;
 const {container,rerender}=render(surface('hover'));
 const checkFooter=()=>{
   const body=container.querySelector('.graph-info-panel-body');
   const footer=screen.getByText('Recorded fixture').closest('footer');
   expect(footer).toBe(body.nextElementSibling);
 };
 checkFooter();
 rerender(surface('expanded'));
 checkFooter();
 const navigation=screen.getByRole('navigation',{name:'Record views'});
 const firstBody=container.querySelector('.graph-info-panel-body');
 expect(navigation.nextElementSibling).toBe(firstBody);
 fireEvent.click(screen.getByRole('tab',{name:'Related links'}));
 await screen.findByText('No matching records.');
 expect(screen.queryByText('Recorded fixture')).toBeNull();
 expect(navigation.nextElementSibling).not.toBe(firstBody);
 expect(screen.getByRole('tab',{name:'Related links'}).getAttribute('aria-selected')).toBe('true');
 fireEvent.click(screen.getByRole('tab',{name:'Complete record'}));
 checkFooter();
});

test('a multi-table tab omits empty sections and keeps paging, download and one source together', async () => {
 const source='https://example.org/data/placements';
 const pipeline='https://example.org/analysis';
 const placements={id:'placements',title:'Placements',columns:['chr','data_source_url'],all_fields:['chr','data_source','data_source_url','data_version','license'],filters:[],
   pipeline_links:[{href:source,label:'Duplicate link'},{href:pipeline,label:'Analysis pipeline'}]};
 const empty={...placements,id:'empty',title:'Empty section'};
 const tables=[placements,empty,table];
 const record={...card,tables,component_views:[{...card.component_views[0],table_ids:tables.map(t=>t.id)}]};
 const request=jest.fn(async (_,query) => {
   if (query.table_id==='empty') return {state:'no_records',records:[],has_more:false};
   if (query.table_id==='accessions') return {state:'available',records:[{source_name:'Registry',alt_id:'ABC'}],has_more:false};
   return {state:'available',records:[
     {chr:query.cursor ? '12' : '11',data_source:'Fixture',data_source_url:source,data_version:'Release A',license:'CC-BY-4.0'},
     {chr:'13',data_source:'Fixture',data_source_url:source,data_version:'Release B',license:'CC-BY-4.0'},
   ],has_more:!query.cursor,next_cursor:'second'};
 });
 const {container}=render(<EvidenceDetails card={record} schema={{...schema,tables:Object.fromEntries(tables.map(t=>[t.id,t]))}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Related links'}));
 expect(await screen.findByRole('table',{name:'Placements'})).toBeTruthy();
 expect(await screen.findByRole('table',{name:'Related links'})).toBeTruthy();
 expect(screen.queryByText('Empty section')).toBeNull();
 expect(screen.queryByText('No matching records.')).toBeNull();
 const placementCard=screen.getByRole('table',{name:'Placements'}).closest('.xe-evidence-card');
 const pager=within(placementCard);
 expect(placementCard.querySelectorAll(`a[href="${source}"]`)).toHaveLength(1);
 const footer=placementCard.querySelector('.xe-evidence-sources.xe-record-footer');
 expect(within(footer).getByText('Fixture')).toBeTruthy();
 expect(within(footer).getByText('Release A, Release B')).toBeTruthy();
 expect(within(footer).getByText('CC BY 4.0').title).toBe('CC-BY-4.0');
 expect(within(footer).getByRole('link',{name:'Analysis pipeline'}).href).toBe(pipeline);
 expect(within(footer).getAllByRole('link')).toHaveLength(2);
 const toolbar=pager.getByRole('button',{name:'Download all records'}).closest('.xe-evidence-toolbar');
 expect(placementCard.firstElementChild).toBe(toolbar);
 expect(within(toolbar).getByRole('heading',{name:'Placements'})).toBeTruthy();
 const navigation=pager.getByRole('navigation',{name:'Placements pages'});
 expect(navigation.nextElementSibling.classList.contains('xe-evidence-record-group')).toBe(true);
 expect(within(navigation).getByRole('button',{name:'Next page'})).toBeTruthy();
 expect(screen.getByRole('table',{name:'Related links'}).closest('.xe-evidence-card').querySelector('button').textContent).toBe('Download 1 record');
 fireEvent.click(pager.getByRole('button',{name:'Next page'}));
 expect(await pager.findByText('12')).toBeTruthy();
 expect(pager.getByText('Page 2')).toBeTruthy();
 fireEvent.click(pager.getByRole('button',{name:'Previous page'}));
 expect(await pager.findByText('11')).toBeTruthy();
 expect(container.querySelectorAll('.xe-evidence-list > .xe-evidence')).toHaveLength(2);
});

test('credible-set metadata labels a single group once and retains the group role', async () => {
 const credible={id:'credible_members',title:'Credible-set SNPs',columns:['variant_id'],all_fields:['variant_id','signal_role','credible_set_id'],filters:[]};
 const record={...card,tables:[credible],component_views:[{id:'credible_set',renderer:'credible_set',table_ids:[credible.id]}]};
 const request=jest.fn().mockResolvedValue({
   state:'available',
   records:[{variant_id:'rs123',signal_role:'qtl',credible_set_id:'id-set'}],
   credible_sets:{'id-set':{qtl_type:'eQTL',method:'SuSiE',tissue_name:'Islet',n_members:1,purity:.8}},
   has_more:false,
 });
 render(<EvidenceDetails card={record} schema={{...schema,tables:{credible_members:credible}}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Credible-set summary'}));
 expect(await screen.findByRole('cell',{name:'rs123'})).toBeTruthy();
 expect(screen.getAllByRole('heading',{name:/Set 1/})).toHaveLength(1);
 expect(screen.getByText('eQTL')).toBeTruthy();
 expect(screen.getByText('QTL')).toBeTruthy();
 expect(screen.getByText('SuSiE')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Download 1 record'})).toBeTruthy();
});

test('a visible table column still hides each non-public value', async () => {
 const placements={id:'placements',title:'Positions',columns:['chr'],all_fields:['chr'],filters:[]};
 const record={...card,tables:[placements],component_views:[]};
 const viewerSchema={...schema,tables:{placements},display_policy:{version:1,internal_value_patterns:['^/private/']}};
 const request=jest.fn().mockResolvedValue({state:'available',records:[{chr:'11'},{chr:'/private/test'}],has_more:false});
 render(<EvidenceDetails card={record} schema={viewerSchema} releaseId={record.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('tab',{name:'Genomic coordinates'}));
 expect(await screen.findByRole('cell',{name:'11'})).toBeTruthy();
 expect(screen.getByRole('cell',{name:'Not recorded'})).toBeTruthy();
 expect(screen.queryByText('/private/test')).toBeNull();
});

test('CCC summary uses only supporting contexts and the matrix includes every owned page', async () => {
 const ref={kind:'edge',type_id:'LIGAND_RECEPTOR__Gene__Gene',id:'timp3-kdr'};
 const base={source:'Active Stellate',target:'Endothelial',map_id:'M5',condition:'ND',treatment:'no_treatment',
  data_version:'JP_CCC_2026-11-03_0123456789ab',
  ligand_complex:'TIMP3',receptor_complex:'KDR',specificity_rank:1.4e-7,lr_means:1.5863626,selection_status:'supporting',
  n_donors_sig:6,n_donors_celltypes_ok:6};
 const other={...base,source:'Quiescent Stellate',selection_status:'below_threshold',n_donors_sig:2,n_donors_celltypes_ok:3};
 const table={id:'ccc_contexts',title:'CCC contexts',columns:Object.keys(base),all_fields:Object.keys(base),filters:[],field_specs:{}};
 const schema={release_id:'PanKgraph_1104',tables:{ccc_contexts:table},
   display_policy:{version:1,public_id_patterns:['^M[0-9]+$','^ENSG[0-9]+$'],unknown_internal_version:'Source version not specified'}};
 const record={...card,release_id:schema.release_id,ref,tables:[table],component_views:[],
   provenance:{data_version:base.data_version,data_source:'JP Cartailler / PanKbase CCC',snapshot_id:'ccc_M5_20261103_v1'},
   ccc_context:{sender_cell_name:'pancreatic stellate cell active state',receiver_cell_name:'endothelial cell'},
   endpoints:[['ENSG00000100234','TIMP3'],['ENSG00000128052','KDR']].map(([id,name])=>({ref:{kind:'node',type_id:'Gene',id},display_name:name}))};
 const request=jest.fn(async (_,query) => {
   expect(query.ref).toEqual(ref);
   if (query.filters.selection_status === 'supporting') return {state:'available',records:[base],has_more:false};
   return query.limit===100 && !query.cursor
     ? {state:'available',records:[base],has_more:true,next_cursor:'second'}
     : {state:'available',records:query.cursor ? [other] : [base,other],has_more:false};
 });
 const surface = mode => <GraphInfoPanelSurface visible mode={mode} position={{x:24,y:24}}>
   <InspectedInformationPanel card={record} schema={schema} releaseId={record.release_id} request={request}/>
 </GraphInfoPanelSurface>;
 const {rerender}=render(surface('hover'));
 expect(screen.getByText('Sender · pancreatic stellate cell active state')).toBeTruthy();
 expect(screen.getByText('Receiver · endothelial cell')).toBeTruthy();
 expect(screen.getByText('PanKbase',{selector:'.xe-footer-source strong'})).toBeTruthy();
 expect(await screen.findByText('Active Stellate → Endothelial',{exact:false,selector:'li'})).toBeTruthy();
 expect(screen.getByText('ND · Untreated')).toBeTruthy();
 expect(screen.queryByText(/M5/)).toBeNull();
 expect(request.mock.calls[0][1]).toMatchObject({ref,table_id:'ccc_contexts',filters:{selection_status:'supporting'}});
 expect(screen.queryByText('Quiescent Stellate → Endothelial',{exact:false,selector:'li'})).toBeNull();
 rerender(surface('expanded'));
 expect(screen.getByRole('tab',{name:'Complete record',selected:true})).toBeTruthy();
 fireEvent.click(screen.getByRole('tab',{name:'Cell–cell contexts'}));
 expect(await screen.findByText('Active Stellate → Endothelial',{exact:false,selector:'li'})).toBeTruthy();
 expect(screen.queryByText('Quiescent Stellate → Endothelial',{exact:false,selector:'li'})).toBeNull();
 expect(await screen.findByRole('img',{name:/TIMP3 \(Quiescent Stellate\) → KDR \(Endothelial\).*2 \/ 3/})).toBeTruthy();
 expect(screen.getByRole('rowheader',{name:'TIMP3 (Active Stellate) → KDR (Endothelial)'})).toBeTruthy();
 expect(screen.getAllByRole('img').filter(dot=>dot.classList.contains('xe-ccc-mark'))).toHaveLength(2);
 expect(await screen.findByRole('button',{name:'Download 2 records'})).toBeTruthy();
 expect(within(screen.getByRole('region',{name:'Cell–cell context dot matrix'})).getByText('ND · Untreated')).toBeTruthy();
 expect(within(screen.getByRole('table',{name:'CCC contexts'})).getAllByRole('cell',{name:'Untreated'})).toHaveLength(2);
 const footer=screen.getByRole('table',{name:'CCC contexts'}).closest('.xe-evidence-card').querySelector('.xe-record-footer');
 expect(within(footer).getByText('Source version not specified')).toBeTruthy();
 expect(screen.queryByText(/M5/)).toBeNull();
 expect(screen.queryByRole('columnheader',{name:'map_id'})).toBeNull();
 fireEvent.click(screen.getByRole('tab',{name:'Complete record'}));
 expect(screen.getByText('Overall description')).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
 expect(screen.getByText('ND · Untreated')).toBeTruthy();
 expect(screen.queryByText(/M5/)).toBeNull();
 expect(screen.getByText('Source version not specified')).toBeTruthy();
});
