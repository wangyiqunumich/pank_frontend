import { validAction, MODULE_LABELS } from './actions.mjs';
const handlers=new Map();
let applying=false;
export function registerGuideModule(id, handler){handlers.set(id,handler);return()=>{if(handlers.get(id)===handler)handlers.delete(id);};}
export async function applyGuideAction(action){
  if(!validAction(action))throw new Error('Unsupported configuration. Use the native module controls.');
  if(applying)throw new Error('Wait for the current configuration to finish before applying another.');
  applying=true;
  try {
  const detail={module:action.module,opened:false};
  window.dispatchEvent(new CustomEvent('pank-guide-open',{detail}));
  if(!detail.opened)throw new Error('This module is not available on the current result page.');
  if(action.type==='open_module'&&!action.params.view)return null;
  const deadline=Date.now()+18000;
  while(Date.now()<deadline){const handler=handlers.get(action.module);if(handler)return await handler(action);await new Promise(resolve=>setTimeout(resolve,150));}
  throw new Error('The module has not finished loading. Check its error message and try again.');
  } finally {applying=false;}
}

let activeModule='graph_viewer';
export const getGuideActiveModule=()=>activeModule;
export function setGuideActiveModule(id){if(!Object.hasOwn(MODULE_LABELS,id))return;activeModule=id;window.dispatchEvent(new CustomEvent('pank-guide-active',{detail:id}));}
