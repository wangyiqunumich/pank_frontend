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
