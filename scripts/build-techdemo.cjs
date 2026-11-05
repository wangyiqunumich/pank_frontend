// Build the isolated feature snapshot without changing the main development UI.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
if (process.env.AWS_BRANCH !== 'xuteng/react' && process.env.PANK_BUILD_TECHDEMO !== '1') {
  console.log('Fixed techdemo is published only by the Amplify development build.');
  process.exit(0);
}
const config = JSON.parse(fs.readFileSync(path.join(root,'config/techdemo.json'),'utf8'));
if (!/^[a-f0-9]{40}$/.test(config.source_commit) || config.path !== '/techdemo') throw new Error('Invalid pinned demo source');
const work=path.join(root,'.techdemo-work');
if(fs.existsSync(work))throw new Error('Demo worktree already exists; inspect it before rebuilding');
const run=(bin,args,options={})=>execFileSync(bin,args,{cwd:root,stdio:'inherit',...options});
run('git',['fetch','origin',config.source_commit]);
run('git',['worktree','add','--detach',work,config.source_commit]);
try {
  const env={...process.env,AWS_BRANCH:'fixed-demo-source',PUBLIC_URL:'/techdemo',GENERATE_SOURCEMAP:'false'};
  run('npm',['ci','--cache',path.join(root,'.npm'),'--prefer-offline','--no-audit','--no-fund'],{cwd:work,env});
  run('npm',['test','--','--watchAll=false','--runInBand','src/vnext/hosting.test.js','src/vnext/techdemoApi.test.js','src/vnext/PanKgraphFunctionalPlot.test.js','src/vnext/moduleGuide/ModuleGuide.test.js','src/vnext/QtlBrowser.test.js','src/vnext/qtlContext.test.js','src/vnext/evidence/ObjectInformationPanel.test.js'],{cwd:work,env:{...env,CI:'true',PUBLIC_URL:''}});
  run('npm',['test','--prefix','single-cell-browser'],{cwd:work,env});
  run('npm',['run','build'],{cwd:work,env:{...env,CI:'false'}});
  const built=path.join(work,'build');
  const html=fs.readFileSync(path.join(built,'index.html'),'utf8');
  if(!html.includes('/techdemo/static/'))throw new Error('Demo assets have an incorrect hosting prefix');
  for(const folder of ['scbrowser','pankbase-browser']) {
    const entry=JSON.parse(fs.readFileSync(path.join(built,folder,'embed.json'),'utf8'));
    if(entry.version!==1||!entry.html.startsWith('<!doctype html'))throw new Error('Missing module entry: '+folder);
  }
  const destination=path.join(root,'build','techdemo');
  fs.cpSync(built,destination,{recursive:true});
  const hostCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  fs.writeFileSync(path.join(destination,'techdemo-release.json'),JSON.stringify({...config,host_commit:hostCommit,built_at:new Date().toISOString()},null,2)+'\n');
  console.log('Published fixed PanKbase demo:',config.source_commit);
} finally {
  run('git',['worktree','remove','--force',work]);
}
