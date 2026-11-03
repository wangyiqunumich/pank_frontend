// Local acceptance harness: explicitly labeled graph context, actual public data.
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = path.resolve(__dirname, '../public');
const requests = [];
const modules = ['genome_browser','differential_expression','functional_browser','pca_explorer'];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px system-ui;margin:20px;color:#334155}iframe{width:100%;height:85vh;border:1px solid #dbe4ee;border-radius:12px}button{padding:8px;margin:4px}p{font-size:12px}</style></head><body><h2>PanKbase module acceptance</h2><p>Navigation fixture: CFTR / Beta. Module data comes from pinned public sources. This is not a retrieved biological result.</p><nav>${modules.map(m=>`<button data-module="${m}">${m}</button>`).join('')}</nav><iframe title="Module acceptance view"></iframe><script>
const frame=document.querySelector('iframe');let moduleId='pca_explorer';
const context=()=>({moduleId,recordId:'fixture-'+moduleId,geneSymbol:'CFTR',cellType:'Beta',available:true,match:'related',locus:{chromosome:'7',start:117480025,end:117668665,genomeBuild:'GRCh38'}});
const send=()=>frame.contentWindow.postMessage({protocol:'pankgraph.pankbase.v1',type:'context',moduleId,context:context()},location.origin);
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='ready')send()});
document.querySelectorAll('button').forEach(button=>button.onclick=()=>{moduleId=button.dataset.module;send()});
fetch('/pankbase-browser/embed.json').then(r=>r.json()).then(p=>{frame.srcdoc=p.html.replace('<head>','<head><base href="'+location.origin+'/pankbase-browser/">')});
</script></body></html>`;
http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  if(req.url==='/metrics'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(requests));}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.statusCode=404;return res.end('Not found');}
  const bytes=fs.readFileSync(target), compressed=zlib.gzipSync(bytes);
  const type={'.json':'application/json','.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(target)]||'application/octet-stream';
  res.setHeader('Content-Type',type);res.setHeader('Content-Encoding','gzip');
  res.setHeader('Cache-Control','no-cache');
  requests.push({path:pathname,decodedBytes:bytes.length,gzipBytes:compressed.length,at:new Date().toISOString()});
  res.end(compressed);
}).listen(Number(process.env.PANKBASE_PREVIEW_PORT||4197),'127.0.0.1',()=>console.log('PanKbase acceptance: http://127.0.0.1:4197'));
