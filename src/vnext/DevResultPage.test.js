import React from 'react';
import {render,screen} from '@testing-library/react';
import DevResultPage from './DevResultPage';
jest.mock('./hosting',()=>({DEV_MODULES:true}));
jest.mock('../components/ResultComponent',()=>({__esModule:true,default:()=>null}));
jest.mock('./ResultComponent',()=>({__esModule:true,default:({data})=><><p>{data.title}</p>{data.visualMaterial?.tabs.map(t=><section key={t.id} aria-label={t.label}>{t.content}</section>)}{data.evidences?.tabs.map((t,i)=><aside key={i}>{t.label}{t.content}</aside>)}</>}));
jest.mock('./PanKbaseModule',()=>({__esModule:true,default:({context})=><span>{context.geneSymbol}</span>}));
jest.mock('./SingleCellBrowser',()=>({__esModule:true,default:()=>null}));
jest.mock('./QtlBrowser',()=>({__esModule:true,default:()=>null}));
jest.mock('./PanKgraphFunctionalPlot',()=>({__esModule:true,default:()=>null}));
test('legacy result/follow-up adapter replaces duplicate module tabs while retaining original cohort evidence',()=>{
 const data={moduleScope:'legacy-answer-1',title:'Original answer',graphData:{nodes:[{'~id':'cftr','~labels':['Gene'],'~properties':{name:'CFTR'}}],edges:[]},visualMaterial:{tabs:[{label:'Knowledge Graph',content:<span>Graph</span>},{label:'Genome Browser',content:<span>Retired genome</span>},{label:'Functional Data',content:<span>Recorded selected cohort</span>}]}};
 const view=render(<DevResultPage data={data} contentAnchorPrefix="legacy"/>);
 expect(screen.queryByRole('region',{name:'Genome Browser'})).toBeNull();
 expect(screen.queryByText('Retired genome')).toBeNull();expect(screen.getByText('Recorded selected cohort')).toBeTruthy();
 view.rerender(<DevResultPage data={{...data,graphData:{nodes:[],edges:[]}}} contentAnchorPrefix="legacy"/>);
 expect(screen.queryByRole('region',{name:'Genome Browser'})).toBeNull();
 expect(screen.getByText('Graph')).toBeTruthy();
});
