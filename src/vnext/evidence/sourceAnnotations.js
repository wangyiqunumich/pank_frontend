// Read structured source annotations without executing Python/JavaScript literals.
// Non-structured values retain their source text.
export function annotationValue(value) {
  if(typeof value!=='string' || !/^[\[{]/.test(value.trim()))return value;
  let text=value.trim();
  if(text.startsWith('{') && /}\s*,\s*{/.test(text))text=`[${text}]`;
  try{return JSON.parse(text);}catch(_){}
  // Some source exports use single-quoted string tokens. Convert only tokens,
  // then let the strict JSON parser reject anything outside the JSON grammar.
  try{return JSON.parse(text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g,(_,token)=>JSON.stringify(token.replace(/\\'/g,"'"))));}catch(_){return value;}
}
