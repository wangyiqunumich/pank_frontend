export const MODULE_LABELS = {graph_viewer:'Knowledge Graph',single_cell_browser:'scBrowser',genome_browser:'Genome Browser',differential_expression:'Differential Expression',functional_browser:'Functional Browser',pca_explorer:'PCA Explorer'};
export const VIEWS = {graph_viewer:[],single_cell_browser:[],genome_browser:['Genome','Tracks','Source'],differential_expression:['Volcano','Heatmap','Gene table','Source'],functional_browser:['Response','Source'],pca_explorer:['PCA map','Contributions','Source']};
const cells=['a_stellate','acinar','alpha','beta','delta','ductal','endothelial','gamma','immune','muc5b_ductal','q_stellate','schwann'];
const keys=(p,expected)=>Object.keys(p).sort().join('|')===expected.split(',').sort().join('|');
export function validAction(a) {
  if(!a||typeof a!=='object'||!keys(a,'type,module,params')||!Object.hasOwn(MODULE_LABELS,a.module)||!a.params||typeof a.params!=='object'||Array.isArray(a.params))return false;
  const p=a.params;
  if(a.type==='open_module')return !Object.keys(p).length||(keys(p,'view')&&VIEWS[a.module].includes(p.view));
  if(a.type==='genome_tracks'&&a.module==='genome_browser')return keys(p,'cell_types,track_types,height')&&Array.isArray(p.cell_types)&&p.cell_types.length>0&&p.cell_types.every(c=>cells.includes(c))&&new Set(p.cell_types).size===p.cell_types.length&&Array.isArray(p.track_types)&&p.track_types.length>0&&p.track_types.every(t=>['signal','peaks'].includes(t))&&new Set(p.track_types).size===p.track_types.length&&['auto','80','160','260'].includes(p.height);
  if(a.type==='genome_region'&&a.module==='genome_browser'&&keys(p,'locus')){const m=String(p.locus).match(/^chr(?:[1-9]|1[0-9]|2[0-2]|X|Y):([0-9]{1,9})-([0-9]{1,9})$/);return !!m&&+m[1]>0&&+m[1]<+m[2]&&+m[2]<=300000000;}
  if(a.type==='de_thresholds'&&a.module==='differential_expression')return keys(p,'fold,pvalue')&&Number.isFinite(p.fold)&&p.fold>=0&&p.fold<=20&&Number.isFinite(p.pvalue)&&p.pvalue>0&&p.pvalue<=1;
  if(a.type==='pca_axes'&&a.module==='pca_explorer')return keys(p,'x,y')&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=1&&p.x<=10&&p.y>=1&&p.y<=10&&p.x!==p.y;
  return a.type==='functional_response'&&a.module==='functional_browser'&&keys(p,'trace')&&['ins_ieq','ins_content','gcg_ieq','gcg_content'].includes(p.trace);
}
export function actionSummary(a){
  if(!validAction(a))return 'Unsupported configuration';
  const p=a.params;
  if(a.type==='genome_tracks')return `${p.cell_types.join(', ')} · ${p.track_types.join(' + ')} · ${p.height==='auto'?'Fit panel':p.height+' px'} (${p.cell_types.length*p.track_types.length+2} tracks including references)`;
  if(a.type==='genome_region')return `GRCh38 · ${p.locus}`;
  if(a.type==='de_thresholds')return `|log₂ FC| > ${p.fold}; adjusted P < ${p.pvalue}`;
  if(a.type==='pca_axes')return `X: PC${p.x} · Y: PC${p.y}`;
  if(a.type==='functional_response')return ({ins_ieq:'Insulin · per IEQ',ins_content:'Insulin · % content',gcg_ieq:'Glucagon · per IEQ',gcg_content:'Glucagon · % content'})[p.trace];
  return `Open ${MODULE_LABELS[a.module]}${p.view?' → '+p.view:''}`;
}
