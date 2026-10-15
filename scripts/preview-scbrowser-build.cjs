// Local build preview, with SPA fallback for application routes only.
const http = require('http');
const fs = require('fs');
const path = require('path');
const demo = process.argv.includes('--qtl') ? require('./qtl-visual-demo-data.cjs') : process.argv.includes('--cftr') ? require('./scbrowser-cftr-demo-data.cjs') : process.argv.includes('--demo') ? require('./scbrowser-demo-data.cjs') : null;
if (process.argv.includes('--mixed') && demo) {
  const rna = require('./scbrowser-cftr-demo-data.cjs').result.combined_query_result;
  const qtl = demo.result.combined_query_result;
  demo.result.combined_query_result = { nodes: [...new Map([...qtl.nodes, ...rna.nodes].map(node => [node['~id'], node])).values()], edges: [...qtl.edges, ...rna.edges] };
  demo.result.result_page_state = { main_visual: 'graph_viewer' };
}
const root = path.resolve(__dirname, '../build');
const types = { '.js':'text/javascript', '.html':'text/html', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.json':'application/json', '.txt':'text/plain' };
http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/(?:pankgraph-vnext\/?)?/,'');
  if (name === 'api/scbrowser/expression' && demo) {
    require('https').get('https://dev.pankgraph.org/pankgraph-vnext/'+new URL(req.url,'http://localhost').pathname.replace(/^\/(?:pankgraph-vnext\/)?/,'')+new URL(req.url,'http://localhost').search, upstream=>{res.writeHead(upstream.statusCode, {'Content-Type':'application/json', ...(upstream.headers['content-encoding'] ? {'Content-Encoding':upstream.headers['content-encoding']} : {})});upstream.pipe(res);}).on('error',()=>res.writeHead(502).end()); return;
  }
  if (name.startsWith('api/')) {
    if (!demo) { res.writeHead(503, {'Content-Type':'application/json'}).end(JSON.stringify({message:'Static preview only. Start with --demo for the single-cell navigation demo.'})); return; }
    let body;
    if (name === `api/agent/v2/runs/${demo.run.run_id}` && req.method === 'GET') body = demo.run;
    else if (name === 'api/results' && req.method === 'POST') body = {result_id:demo.result.result_id};
    else if (name === `api/results/${demo.result.result_id}` && req.method === 'GET') body = demo.result;
    else if (name.endsWith('/interactions') && req.method === 'POST') body = {status:'ignored_local_demo'};
    else { res.writeHead(404, {'Content-Type':'application/json'}).end(JSON.stringify({message:'This action is not available in the local navigation demo.'})); return; }
    res.writeHead(200, {'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body)); return;
  }
  let file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep) && file!==root){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()) {
    if(name.startsWith('scbrowser/')||path.extname(name)){res.writeHead(404).end('Not found');return;}
    file=path.join(root,'index.html');
  }
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.SC_PREVIEW_PORT || 4187),'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${process.env.SC_PREVIEW_PORT || 4187}/result-new2?run_id=11111111-1111-4111-8111-111111111111`));
