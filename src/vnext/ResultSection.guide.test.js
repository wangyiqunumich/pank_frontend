import React from 'react';
import {render,screen,act} from '@testing-library/react';
import {ResultSection} from './ResultView';
import {applyGuideAction} from './moduleGuide/bridge';
import {validBrowserContext} from './singleCellContext';
import {explorationAtlasContext} from './moduleGuide/GuideExploration';

jest.mock('./hosting',()=>({TECH_DEMO:true,DEV_MODULES:true,uiPath:path=>path}));
jest.mock('./resultPageSchema',()=>({resolveResultPage:()=>({mainVisuals:[{id:'graph_viewer',label:'Knowledge Graph'}],resourceTabs:{},supportingTabs:[],insertions:[]})}));
jest.mock('./AnswerMarkdown',()=>({__esModule:true,default:({answer})=><p>{answer}</p>}));
jest.mock('react-markdown',()=>({__esModule:true,default:({children})=><div>{children}</div>}));
jest.mock('react-slick',()=>({__esModule:true,default:({children})=><div>{children}</div>}));
jest.mock('remark-gfm',()=>({__esModule:true,default:()=>{}}));
jest.mock('./KnowledgeGraph',()=>({__esModule:true,default:()=> <div data-testid="original-graph"/>}));
jest.mock('./ResultComponent',()=>{const React=require('react');return ({__esModule:true,default:({data})=><>{data.aiOverview.sections.map((s,i)=><div key={i}>{s.content}</div>)}{data.visualMaterial.tabs.map(tab=><section key={tab.id} aria-label={tab.label}>{React.cloneElement(tab.content,{isVisible:data.visualMaterial.requestedTab?.id===tab.id})}</section>)}</>});});
jest.mock('./PanKbaseModule',()=>({__esModule:true,default:function MockModule({moduleId,context,isVisible}){
  const {useState,useEffect}=require('react');const {registerGuideModule}=require('./moduleGuide/bridge');
  const [axes,setAxes]=useState({x:1,y:2});
  useEffect(()=>{if(isVisible)return registerGuideModule(moduleId,async action=>{const undo={...action,params:axes};setAxes(action.params);return undo;});},[moduleId,isVisible,axes]);
  return <div data-testid={moduleId}>{context.match}:{context.geneSymbol}:{isVisible?'visible':'hidden'}:PC{axes.x}/PC{axes.y}</div>;
}}));
jest.mock('./SingleCellBrowser',()=>({__esModule:true,default:({context,isVisible})=><div data-testid="atlas">{context?.match}:{context?.geneSymbol}:{String(isVisible)}</div>}));
jest.mock('./PanKgraphFunctionalPlot',()=>({__esModule:true,default:()=> <div>Functional plot</div>}));
jest.mock('./QtlBrowser',()=>({__esModule:true,default:()=> <div>QTL plot</div>}));
const result={result_id:'one',status:'ready',answer:'Original answer remains unchanged.',combined_query_result:{nodes:[],edges:[]}};
const action={type:'pca_axes',module:'pca_explorer',params:{x:2,y:3}};

test('Apply creates an absent module, configures it after mount, and Undo restores settings without changing the answer',async()=>{
  render(<ResultSection result={result} anchorPrefix="guide"/>);
  expect(screen.queryByRole('region',{name:'PCA Explorer'})).toBeNull();
  let inverse;
  // Dispatch must flush the new module mount before the bridge's readiness poll.
  let pending;act(()=>{pending=applyGuideAction(action);});
  await act(async()=>{inverse=await pending;});
  expect(screen.getByTestId('pca_explorer').textContent).toContain('independent::visible:PC2/PC3');
  expect(screen.getByText(/Independent exploration/)).toBeTruthy();
  expect(screen.getByText(result.answer)).toBeTruthy();
  expect(inverse.params).toEqual({x:1,y:2});
  await act(async()=>{await applyGuideAction(inverse);});
  expect(screen.getByTestId('pca_explorer').textContent).toContain('PC1/PC2');
  expect(screen.getAllByRole('region',{name:'PCA Explorer'})).toHaveLength(1);
  expect(result.combined_query_result).toEqual({nodes:[],edges:[]});
});

test('all registered modules can open without graph triggers; defaults are explicit, unknown modules rejected and state resets per result',async()=>{
 const view=render(<ResultSection result={result} anchorPrefix="guide"/>);
 for(const id of ['single_cell_browser','genome_browser','differential_expression','functional_browser','pca_explorer','qtl_browser'])await act(async()=>{await applyGuideAction({type:'open_module',module:id,params:{}});});
 expect(screen.getAllByRole('region')).toHaveLength(7);
 expect(screen.getByTestId('atlas').textContent).toContain('independent:CFTR');
 expect(validBrowserContext(explorationAtlasContext)).toBe(true);
 expect(screen.getByTestId('genome_browser').textContent).toContain('independent:CFTR');
 await expect(applyGuideAction({type:'open_module',module:'arbitrary_module',params:{}})).rejects.toThrow('Unsupported');
 view.rerender(<ResultSection result={{...result,result_id:'two'}} anchorPrefix="guide"/>);
 expect(screen.getAllByRole('region')).toHaveLength(1);
});

test('historical results do not consume guide actions',async()=>{
 render(<ResultSection result={result} anchorPrefix="old" guideEnabled={false}/>);
 await expect(applyGuideAction({type:'open_module',module:'pca_explorer',params:{}})).rejects.toThrow('not available');
});
