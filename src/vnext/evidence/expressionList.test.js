import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import EvidenceDetails,{currentPresets} from './EvidenceDetails';
test('current list excludes historical view and duplicate baseline without dropping distinct methods',()=>{
 expect(currentPresets([{id:'baseline'},{id:'treatments'},{id:'historical'},{id:'native'}]).map(x=>x.id)).toEqual(['treatments','native']);
});
test('expression records are direct lists without row-open controls or view selectors',async()=>{
 const ref={kind:'edge',type_id:'Expression',id:'e'};
 const table={id:'expression',columns:['condition','cpm'],all_fields:['condition','cpm'],filters:[],field_specs:{}};
 const card={ref,release_id:'PanKgraph_1104',tables:[table],sections:[],fields:[],provenance:{},component_views:[{id:'expression',title:'Expression',renderer:'condition_tables',table_ids:['expression'],view:{context_filters:{},groups:[{id:'general',title:'General expression',presets:[{id:'baseline',table_id:'expression',title:'V3.4',method_label:'Raw-count CPM',columns:['condition','cpm'],editable_filters:[]}]}]}}]};
 const schema={release_id:card.release_id,display_policy:{},tables:{expression:table}};
 const request=jest.fn().mockResolvedValue({records:[{condition:'ND',cpm:0}],has_more:false});
 render(<EvidenceDetails card={card} schema={schema} releaseId={card.release_id} request={request}/>);
 fireEvent.click(screen.getByRole('button',{name:'Expression evidence summary',exact:true}));
 expect(await screen.findByText('ND')).toBeTruthy();
 expect(screen.queryByRole('button',{name:/Read row/})).toBeNull();
 expect(screen.queryByRole('combobox')).toBeNull();
 expect(screen.queryByText(/Condition-level evidence/)).toBeNull();
});
