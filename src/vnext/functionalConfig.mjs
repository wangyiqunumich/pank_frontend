export const FUNCTIONAL_FILTER_LABELS={disease:'Disease',sex:'Genetic sex',center:'Center',race:'Race',age_min:'Minimum age',age_max:'Maximum age',bmi_min:'Minimum BMI',bmi_max:'Maximum BMI',ids:'PanKbase IDs',donor_ids:'Donor IDs / RRIDs',hpap_ids:'HPAP IDs'};
const choices={disease:['Control','T1D','T2D'],sex:['Male','Female','Unknown'],center:['HPAP','IIDP'],race:['African American','Asian','Biracial','Caucasian','Hispanic','White','unknown']};
export function validFunctionalFilters(filters){
 if(!filters||typeof filters!=='object'||Array.isArray(filters))return false;
 const names=Object.keys(filters),idNames=names.filter(k=>['ids','donor_ids','hpap_ids'].includes(k));
 if(idNames.length && (idNames.length!==1||names.length!==1))return false;
 for(const [key,value] of Object.entries(filters)){
  if(!Object.hasOwn(FUNCTIONAL_FILTER_LABELS,key))return false;
  if(idNames.includes(key)){if(!Array.isArray(value)||value.length<1||value.length>100||new Set(value).size!==value.length||!value.every(id=>typeof id==='string'&&/^[A-Za-z0-9_.:-]{1,64}$/.test(id)))return false;}
  else if(choices[key]){if(!choices[key].includes(value))return false;}
  else if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>(key.startsWith('age')?120:100))return false;
 }
 return ['age','bmi'].every(k=>filters[k+'_min']===undefined||filters[k+'_max']===undefined||filters[k+'_min']<=filters[k+'_max']);
}
export function functionalQuery(trace,filters){const q=new URLSearchParams({trace_type:trace,result_page:'Yes'});for(const [key,value] of Object.entries(filters))q.set(key,Array.isArray(value)?value.join(','):String(value));return q.toString();}
