import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import EvidenceDetails, { InspectedInformationPanel } from './EvidenceDetails';
import { GraphInfoPanelSurface } from '../GraphInfoPanel';
const ref={kind:'node',id:'ENSG00000001626',type_id:'Gene'};
const table={id:'accessions',title:'Related links',component:'node_alt_id',columns:['source_name','alt_id'],all_fields:['source_name','alt_id'],filters:[],field_specs:{}};
const card={release_id:'PanKgraph_1024',ref,tables:[table],sections:[],fields:[],provenance:{},component_views:[{id:'node_alt_id',title:'Related links',renderer:'table',table_ids:['accessions']}]};
const schema={release_id:'PanKgraph_1024',tables:{accessions:table}};
test('version mismatch never requests or shows SQL tabs',()=>{
 const request=jest.fn();render(<EvidenceDetails card={card} schema={schema} releaseId="PanKgraph_08_04" request={request}/>);
 expect(screen.getByRole('status').textContent).toMatch(/graph version/);
 expect(screen.queryByRole('button',{name:'Related links'})).toBeNull();expect(request).not.toHaveBeenCalled();
});
test.each([
 ['no_records', 'No matching records.'],
 ['temporarily_unavailable', 'These records are temporarily unavailable.'],
])('owned table with state %s is requested only on its tab and has a readable status',async(state,message)=>{
 const request=jest.fn().mockResolvedValue({state,records:[],has_more:false});
 render(<EvidenceDetails card={card} schema={schema} releaseId={card.release_id} request={request}/>);
 expect(request).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Related links'}));
 await waitFor(()=>expect(request).toHaveBeenCalled());
 expect(request.mock.calls[0][1]).toMatchObject({ref,table_id:'accessions',filters:{}});
 expect(await screen.findByText(message)).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
});
test('registry without owned tables does not fabricate a tab',()=>{
 render(<EvidenceDetails card={{...card,tables:[],component_views:[]}} schema={schema} releaseId={card.release_id} request={jest.fn()}/>);
 expect(screen.queryByRole('button',{name:'Related links'})).toBeNull();expect(screen.getByRole('button',{name:'Complete record'})).toBeTruthy();
});

test('a sparse inspection leaves an explicit empty state and no empty provenance footer', () => {
 const {container}=render(<InspectedInformationPanel card={{ref:{...ref,type_id:'Unmapped'},release_id:card.release_id}} schema={schema} releaseId={card.release_id}/>);
 expect(screen.getByTestId('graph-info-title').textContent).toBe(ref.id);
 expect(screen.getByText('No details recorded.')).toBeTruthy();
 expect(container.querySelector('footer')).toBeNull();
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
   const footer=screen.getByText('Data Source: Recorded fixture').closest('footer');
   expect(footer).toBe(body.nextElementSibling);
 };
 checkFooter();
 rerender(surface('expanded'));
 checkFooter();
 const navigation=screen.getByRole('navigation',{name:'Record views'});
 const firstBody=container.querySelector('.graph-info-panel-body');
 expect(navigation.nextElementSibling).toBe(firstBody);
 fireEvent.click(screen.getByRole('button',{name:'Related links'}));
 await screen.findByText('No matching records.');
 expect(screen.queryByText('Data Source: Recorded fixture')).toBeNull();
 expect(navigation.nextElementSibling).not.toBe(firstBody);
 expect(screen.getByRole('button',{name:'Related links'}).getAttribute('aria-current')).toBe('page');
 fireEvent.click(screen.getByRole('button',{name:'Complete record'}));
 checkFooter();
});

test('a multi-table tab omits empty sections and keeps paging, download and one source together', async () => {
 const source='https://example.org/data/placements';
 const placements={id:'placements',title:'Placements',columns:['chr','data_source_url'],all_fields:['chr','data_source','data_source_url'],filters:[],pipeline_links:[{href:source,label:'Pipeline'}]};
 const empty={...placements,id:'empty',title:'Empty section'};
 const tables=[placements,empty,table];
 const record={...card,tables,component_views:[{...card.component_views[0],table_ids:tables.map(t=>t.id)}]};
 const request=jest.fn(async (_,query) => {
   if (query.table_id==='empty') return {state:'no_records',records:[],has_more:false};
   if (query.table_id==='accessions') return {state:'available',records:[{source_name:'Registry',alt_id:'ABC'}],has_more:false};
   return {state:'available',records:[{chr:query.cursor ? '12' : '11',data_source:'Fixture',data_source_url:source}],has_more:!query.cursor,next_cursor:'second'};
 });
 const {container}=render(<EvidenceDetails card={record} schema={{...schema,tables:Object.fromEntries(tables.map(t=>[t.id,t]))}} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('button',{name:'Related links'}));
 expect(await screen.findByRole('table',{name:'Placements'})).toBeTruthy();
 expect(await screen.findByRole('table',{name:'Related links'})).toBeTruthy();
 expect(screen.queryByText('Empty section')).toBeNull();
 expect(screen.queryByText('No matching records.')).toBeNull();
 const placementCard=screen.getByRole('table',{name:'Placements'}).closest('.xe-evidence-card');
 const pager=within(placementCard);
 expect(placementCard.querySelectorAll(`a[href="${source}"]`)).toHaveLength(1);
 expect(placementCard.querySelector('.xe-evidence-sources a').href).toBe(source);
 const toolbar=pager.getByRole('button',{name:'Download all records'}).closest('.xe-evidence-toolbar');
 expect(placementCard.firstElementChild).toBe(toolbar);
 expect(within(toolbar).getByRole('heading',{name:'Placements'})).toBeTruthy();
 expect(within(toolbar).getByRole('button',{name:'Next page'})).toBeTruthy();
 expect(screen.getByRole('table',{name:'Related links'}).closest('.xe-evidence-card').querySelector('button').textContent).toBe('Download 1 record');
 fireEvent.click(pager.getByRole('button',{name:'Next page'}));
 expect(await pager.findByText('12')).toBeTruthy();
 expect(pager.getByText('Page 2')).toBeTruthy();
 fireEvent.click(pager.getByRole('button',{name:'Previous page'}));
 expect(await pager.findByText('11')).toBeTruthy();
 expect(container.querySelectorAll('.xe-evidence-list > .xe-evidence')).toHaveLength(2);
});

test('CCC summary uses only supporting contexts and the matrix includes every owned page', async () => {
 const ref={kind:'edge',type_id:'LIGAND_RECEPTOR__Gene__Gene',id:'timp3-kdr'};
 const base={source:'Active Stellate',target:'Endothelial',map_id:'M5',condition:'ND',treatment:'no_treatment',
  ligand_complex:'TIMP3',receptor_complex:'KDR',specificity_rank:1.4e-7,lr_means:1.5863626,selection_status:'supporting',
  n_donors_sig:6,n_donors_celltypes_ok:6};
 const other={...base,source:'Quiescent Stellate',selection_status:'below_threshold',n_donors_sig:2,n_donors_celltypes_ok:3};
 const table={id:'ccc_contexts',title:'CCC contexts',columns:Object.keys(base),all_fields:Object.keys(base),filters:[],field_specs:{}};
 const schema={release_id:'PanKgraph_1104',tables:{ccc_contexts:table}};
 const record={...card,release_id:schema.release_id,ref,tables:[table],component_views:[],
   endpoints:['TIMP3','KDR'].map(id=>({ref:{kind:'node',type_id:'Gene',id},display_name:id}))};
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
 expect(await screen.findByText('Active Stellate → Endothelial',{exact:false,selector:'li'})).toBeTruthy();
 expect(request.mock.calls[0][1]).toMatchObject({ref,table_id:'ccc_contexts',filters:{selection_status:'supporting'}});
 expect(screen.queryByText('Quiescent Stellate → Endothelial',{exact:false,selector:'li'})).toBeNull();
 rerender(surface('expanded'));
 expect(await screen.findByText('Active Stellate → Endothelial',{exact:false,selector:'li'})).toBeTruthy();
 expect(screen.queryByText('Quiescent Stellate → Endothelial',{exact:false,selector:'li'})).toBeNull();
 expect(await screen.findByRole('img',{name:/TIMP3 \(Quiescent Stellate\) → KDR \(Endothelial\).*2 \/ 3/})).toBeTruthy();
 expect(screen.getByRole('rowheader',{name:'TIMP3 (Active Stellate) → KDR (Endothelial)'})).toBeTruthy();
 expect(screen.getAllByRole('img').filter(dot=>dot.classList.contains('xe-ccc-mark'))).toHaveLength(2);
 expect(await screen.findByRole('button',{name:'Download 2 records'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Complete record'}));
 expect(screen.getByText('Overall description')).toBeTruthy();
 expect(screen.queryByRole('table')).toBeNull();
});
