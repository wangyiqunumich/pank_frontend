import React from 'react';
import {render,screen} from '@testing-library/react';
import ObjectInformationPanel from './ObjectInformationPanel';
import {recordedCard} from './recordedCard';
import schema from '../../../config/graph-viewer/PanKgraph_1104.graph-viewer.schema.json';
const ref={kind:'node',type_id:'Gene',id:'ENSG00000204287'};
const raw={id:ref.id,name:'HLA-DRA',chr:'6',start_loc:32439869,end_loc:32445181,strand:1,data_source:'Ensembl',data_version:'Ensembl_116',license:'CC0'};
const data={id:ref.id,viewer_ref:ref,element_kind:'node',evidence_properties:raw};
test('first paint has actual saved Gene measurements in the regular compact design without awaiting the API',()=>{
 const service={schema,request:jest.fn(()=>new Promise(()=>{}))};
 render(<ObjectInformationPanel data={data} releaseId={schema.release_id} service={service} fallback={<div>Legacy fallback</div>}/>);
 expect(screen.getByTestId('graph-info-title').textContent).toBe('HLA-DRA');
 expect(screen.getByText('Gene Identity')).toBeTruthy();
 expect(screen.getByText('32,439,869')).toBeTruthy();
 expect(screen.queryByText(/Loading detailed/)).toBeNull();
 expect(screen.queryByText('Legacy fallback')).toBeNull();
});
test('saved annotations preserve values and do not manufacture SQL tables or ownership',()=>{
 const card=recordedCard({...data,evidence_properties:{...raw,start_loc:0,flag:false}},ref,schema);
 expect(card.fields.find(f=>f.key==='start_loc').value).toBe(0);
 expect(card.fields.find(f=>f.key==='flag').value).toBe(false);
 expect(card.tables).toEqual([]);expect(card.component_views).toEqual([]);
 expect(recordedCard({...data,evidence_properties:{id:'wrong'}},ref,schema)).toBeNull();
});
