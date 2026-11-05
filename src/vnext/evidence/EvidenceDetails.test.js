import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import EvidenceDetails from './EvidenceDetails';
const ref={kind:'node',id:'ENSG00000001626',type_id:'Gene'};
const table={id:'accessions',title:'Related links',component:'node_alt_id',columns:['source_name','alt_id'],all_fields:['source_name','alt_id'],filters:[],field_specs:{}};
const card={release_id:'PanKgraph_1024',ref,tables:[table],sections:[],fields:[],provenance:{},component_views:[{id:'node_alt_id',title:'Related links',renderer:'table',table_ids:['accessions']}]};
const schema={release_id:'PanKgraph_1024',tables:{accessions:table}};
test('version mismatch never requests or shows SQL tabs',()=>{
 const request=jest.fn();render(<EvidenceDetails card={card} schema={schema} releaseId="PanKgraph_08_04" request={request}/>);
 expect(screen.getByRole('status').textContent).toMatch(/graph version/);
 expect(screen.queryByRole('button',{name:'Related links'})).toBeNull();expect(request).not.toHaveBeenCalled();
});
test('owned table is requested only on its tab with the exact object ref',async()=>{
 const request=jest.fn().mockResolvedValue({state:'no_records',records:[],has_more:false});
 render(<EvidenceDetails card={card} schema={schema} releaseId={card.release_id} request={request}/>);
 expect(request).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Related links'}));
 await waitFor(()=>expect(request).toHaveBeenCalled());
 expect(request.mock.calls[0][1]).toMatchObject({ref,table_id:'accessions',filters:{}});
 expect(await screen.findByText(/does not mean zero expression/)).toBeTruthy();
});
test('registry without owned tables does not fabricate a tab',()=>{
 render(<EvidenceDetails card={{...card,tables:[],component_views:[]}} schema={schema} releaseId={card.release_id} request={jest.fn()}/>);
 expect(screen.queryByRole('button',{name:'Related links'})).toBeNull();expect(screen.getByRole('button',{name:'Complete record'})).toBeTruthy();
});
