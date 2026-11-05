import React from 'react';
import { MODULE_LABELS } from './actions.mjs';
import { SC_DATASET } from '../singleCellContext';

export const explorationContext = id => ({ moduleId:id, available:true, match:'independent', geneSymbol:id === 'genome_browser' ? 'CFTR' : '', cellType:'', locus:null, reason:'Opened from the module guide; not evidence from the original answer.' });
export const explorationAtlasContext = Object.freeze({
  version:1, edgeId:'guide-independent-atlas', available:true, match:'independent',
  assay:'scRNA-seq', datasetId:SC_DATASET, release:'v3.4', geneSymbol:'CFTR', mappedCellType:null,
  reason:'Independent exploration with CFTR as the starting gene. No graph relationship or cohort is inferred.',
  browserUrl:`https://pankbase.org/single-cell.html?datasetId=${SC_DATASET}&gene=CFTR`,
});
export function canOpenGuideModule(id) { return Object.hasOwn(MODULE_LABELS,id); }

// Forward visibility: iframe modules should initialize only when the tab opens.
export default function GuideExploration({ children, isVisible }) {
  return <div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',minHeight:0,minWidth:0}}>
    <div style={{flex:'1 1 0%',minHeight:0,minWidth:0}}>{React.cloneElement(children,{isVisible})}</div>
  </div>;
}
