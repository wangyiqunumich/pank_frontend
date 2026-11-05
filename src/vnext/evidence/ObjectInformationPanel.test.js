import React from 'react';
import {render,screen,waitFor,act} from '@testing-library/react';
import ObjectInformationPanel from './ObjectInformationPanel';
jest.mock('./EvidenceDetails',()=>({InspectedInformationPanel:({card})=><div>Inspected {card.ref.id}</div>}));
const releaseId='release-a';
const data=id=>({id,element_kind:'node',viewer_ref:{kind:'node',type_id:'Gene',id}});
const fallback=<div>Saved graph evidence</div>;
test('legacy aliases and mismatched releases cannot request owned evidence',()=>{
 const request=jest.fn(),service={schema:{release_id:releaseId},request};
 const {rerender}=render(<ObjectInformationPanel data={{id:'A',element_kind:'node',type:'Gene'}} releaseId={releaseId} service={service} fallback={fallback}/>);
 rerender(<ObjectInformationPanel data={data('A')} releaseId="older" service={service} fallback={fallback}/>);
 expect(request).not.toHaveBeenCalled();expect(screen.getByText('Saved graph evidence')).toBeTruthy();
});
test('switch aborts old request and rejects its late response',async()=>{
 const resolve={};const request=jest.fn((path,body)=>new Promise(done=>{resolve[body.ref.id]=done;}));
 const service={schema:{release_id:releaseId},request};
 const props={releaseId,service,fallback};
 const {rerender}=render(<ObjectInformationPanel {...props} data={data('A')}/>);
 await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));
 rerender(<ObjectInformationPanel {...props} data={data('B')}/>);
 await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
 expect(request.mock.calls[0][2].aborted).toBe(true);
 await act(async()=>resolve.B({ref:data('B').viewer_ref}));
 expect(screen.getByText('Inspected B')).toBeTruthy();
 await act(async()=>resolve.A({ref:data('A').viewer_ref}));
 expect(screen.queryByText('Inspected A')).toBeNull();
 expect(screen.getByText('Inspected B')).toBeTruthy();
});
test('incorrect response identity preserves original evidence and shows unavailable',async()=>{
 const request=jest.fn().mockResolvedValue({ref:data('wrong').viewer_ref});
 render(<ObjectInformationPanel data={data('A')} releaseId={releaseId} service={{schema:{release_id:releaseId},request}} fallback={fallback}/>);
 expect(await screen.findByText(/temporarily unavailable/)).toBeTruthy();
 expect(screen.getByText('Saved graph evidence')).toBeTruthy();
});

test('recovers an exact stored object only from an unambiguous current schema profile',()=>{
 const {exactGraphRef}=require('./ObjectInformationPanel');
 const edge={id:'stable',element_kind:'edge',raw_type:'PART_OF_QTL_SIGNAL',evidence_properties:{id:'stable'}};
 const profile={id:'QTL__Variant__Gene',kind:'edge',match:{relationship_type:'PART_OF_QTL_SIGNAL'}};
 const schema={release_id:releaseId,profiles:{qtl:profile}};
 expect(exactGraphRef(edge,schema)).toEqual({kind:'edge',type_id:profile.id,id:'stable'});
 expect(exactGraphRef({...edge,evidence_properties:{id:'another'}},schema)).toBeNull();
 expect(exactGraphRef(edge,{...schema,profiles:{a:profile,b:{...profile,id:'other'}}})).toBeNull();
 expect(exactGraphRef(edge)).toBeNull();
});

test('fixed demo without a release or viewer service renders its recorded fallback',()=>{
 const {rerender}=render(<ObjectInformationPanel data={null} service={null} fallback={fallback}/>);
 expect(screen.getByText('Saved graph evidence')).toBeTruthy();
 rerender(<ObjectInformationPanel data={{id:'CFTR',element_kind:'node'}} fallback={fallback}/>);
 expect(screen.getByText('Saved graph evidence')).toBeTruthy();
 expect(screen.queryByRole('status')).toBeNull();
});

 test('pending schema and inspections never flash the legacy card or previous object',async()=>{
 const resolve={};const request=jest.fn((path,body)=>new Promise(done=>{resolve[body.ref.id]=done;}));
 const props={releaseId,fallback};
 const {rerender}=render(<ObjectInformationPanel {...props} data={data('A')} service={{loading:true}}/>);
 expect(screen.getByTestId('graph-info-title').textContent).toBe('A');
 expect(screen.queryByText('Saved graph evidence')).toBeNull();
 const service={schema:{release_id:releaseId},request};
 rerender(<ObjectInformationPanel {...props} data={data('A')} service={service}/>);
 expect(screen.queryByText('Saved graph evidence')).toBeNull();
 await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));
 await act(async()=>resolve.A({ref:data('A').viewer_ref}));
 expect(screen.getByText('Inspected A')).toBeTruthy();
 rerender(<ObjectInformationPanel {...props} data={data('B')} service={service}/>);
 expect(screen.queryByText('Inspected A')).toBeNull();
 expect(screen.queryByText('Saved graph evidence')).toBeNull();
 expect(screen.getByTestId('graph-info-title').textContent).toBe('B');
 await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
 await act(async()=>resolve.B({ref:data('B').viewer_ref}));
 expect(screen.getByText('Inspected B')).toBeTruthy();
 });
