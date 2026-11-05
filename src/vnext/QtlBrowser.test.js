import React from 'react';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import QtlBrowser from './QtlBrowser';
const cs='ENSG00000001626__CFTR__credibleSet1';
const item={key:'1_sQTL-gtex-susie/'+cs,source:'PKBDS2105PCON',symbol:'CFTR',credible_set:cs};
beforeEach(()=>{
 global.fetch=jest.fn(async url=>({ok:true,json:async()=>String(url).includes('/data?')?{lead_snp:'rs1',records:[{snp:'rs1'}]}:{items:[item],total:1,offset:0,limit:50,truncated:false}}));
});
test('uses EC2, source-qualified set identity and shared fullscreen/download without bitmap zoom',async()=>{
 render(<QtlBrowser isVisible/>);
 await screen.findByRole('img');
 expect(global.fetch.mock.calls[0][0]).toContain('source=PKBDS2105PCON&gene=CFTR');
 expect(screen.getByRole('img').src).toContain('/api/qtl/plot.jpg?key=1_sQTL-gtex-susie%2F');
 expect(screen.getByRole('button',{name:'Download plot'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Zoom in'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Open in full screen'}));
 expect(screen.getByRole('dialog',{name:'QTL Browser'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Source',exact:true}));
 expect(screen.getByText(/Equal SNP spacing represents source order/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));
 expect(screen.queryByRole('dialog')).toBeNull();
});
test('complete 1104 IDs are passed without shortening and sources remain independent',async()=>{
 render(<QtlBrowser isVisible contexts={[{available:true,sourceId:'PKBDS2105PCON',credibleSet:cs}]}/>);
 await screen.findByRole('img');
 expect(global.fetch.mock.calls[0][0]).toContain('credible_set_id='+cs);
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'QTL source'}));
 fireEvent.click(screen.getByRole('option',{name:'GTEx · pancreatic eQTL'}));
 await waitFor(()=>expect(global.fetch.mock.calls.some(([u])=>u.includes('source=PKBDS6689QROA&credible_set_id='+cs))).toBe(true));
});
test('empty results are explicit and never retain the previous source image',async()=>{
 const {rerender}=render(<QtlBrowser isVisible/>);await screen.findByRole('img');
 global.fetch=jest.fn(async()=>({ok:true,json:async()=>({items:[],total:0})}));
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'QTL source'}));
 fireEvent.click(screen.getByRole('option',{name:'INSPIRE · islet eQTL'}));
 await screen.findByText(/No matching credible sets/);
 expect(screen.queryByRole('img')).toBeNull();
 rerender(<QtlBrowser/>);expect(screen.queryByText(/No matching credible sets/)).toBeNull();
});
