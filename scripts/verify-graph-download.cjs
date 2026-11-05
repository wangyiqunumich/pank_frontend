// Verify actual files in both toolbar layouts, inline/fullscreen, and on mobile.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const url = new URL(process.env.GRAPH_QA_URL || 'http://127.0.0.1:4188/techdemo/');
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname), 'Downloads are verified against a local build');
const demo = url.pathname.startsWith('/techdemo');
const fixture = demo ? require('../src/vnext/techdemoFixture.json') : require('./scbrowser-demo-data.cjs');
const output = process.env.GRAPH_QA_OUTPUT || path.join(os.tmpdir(),'pankgraph-download-qa');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const requests=[],errors=[],files=[];let downloadCount=0;
  page.on('request',r=>requests.push(new URL(r.url()).pathname));page.on('pageerror',e=>errors.push(e.message));page.on('download',()=>downloadCount++);
  await page.addInitScript(()=>{localStorage.setItem('pank_feedback_auto_prompt_disabled_v1','1');localStorage.setItem('pank-sidebar-open','false');});
  await page.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//,r=>r.abort());
  if(!demo)await page.route('**/pankgraph-dev-config.json',r=>r.fulfill({json:{vnextEnabled:true,apiBase:'/pankgraph-vnext/api'}}));
  try{
    await page.goto(url.href);
    await page.locator('.graph-viewer canvas').first().waitFor({timeout:45000});
    const toolbar=page.getByRole('toolbar',{name:'Graph controls'});
    const trigger=toolbar.getByRole('button',{name:'Download',exact:true});
    async function openMenu(){
      const previous=downloadCount;await trigger.click();
      const menu=page.getByRole('menu',{name:'Graph download formats'});await menu.waitFor();
      await page.waitForFunction(()=>{const menu=document.querySelector('[role="menu"][aria-label="Graph download formats"]');return menu&&Number(getComputedStyle(menu.closest('.MuiPaper-root')).opacity)>=.99;});
      assert.equal(downloadCount,previous,'Opening Download must only display the menu');
      assert.deepEqual(await menu.getByRole('menuitem').allTextContents(),['Download JSON','Download image']);
      const box=await menu.boundingBox(),size=page.viewportSize();
      assert(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height,'Menu must fit the viewport');
      return menu;
    }
    for(const fullscreen of [false,true]){
      if(fullscreen){await toolbar.getByRole('button',{name:'Open in full screen'}).click();await page.locator('dialog:modal').waitFor();}
      for(const expanded of [false,true]){
        const toggle=toolbar.getByRole('button',{name:expanded?'Expand graph toolbar':'Collapse graph toolbar'});
        if(await toggle.count())await toggle.click();
        for(const format of ['JSON','image']){
          const menu=await openMenu();
          // A late hover card must not intercept clicks on either format.
          await menu.evaluate(menu=>{const r=menu.getBoundingClientRect(),overlay=document.createElement('div');overlay.dataset.downloadQaOverlay='';Object.assign(overlay.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',background:'white',zIndex:2147483000});(menu.closest('dialog')||document.body).appendChild(overlay);});
          assert(await menu.evaluate(menu=>{const r=menu.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[role="menu"]')===menu;}),'Menu must be above hover cards');
          const [file]=await Promise.all([page.waitForEvent('download',{timeout:60000}),menu.getByRole('menuitem',{name:'Download '+format,exact:true}).click()]);
          const extension=format==='JSON'?'json':'png';assert.equal(file.suggestedFilename(),'knowledge_graph.'+extension);assert(file.url().startsWith('blob:'),'Both formats must use Blob URLs');
          const name=`${fullscreen?'fullscreen':'inline'}-${expanded?'expanded':'compact'}.${extension}`;
          await file.saveAs(path.join(output,name));assert.equal(await file.failure(),null);
          const bytes=fs.readFileSync(path.join(output,name));
          if(format==='JSON')assert.deepEqual(JSON.parse(bytes.toString('utf8')),fixture.result.combined_query_result);
          else{assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert(bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(16)<=4096);assert(bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(20)<=4096);}
          await page.locator('[data-download-qa-overlay]').evaluateAll(elements=>elements.forEach(e=>e.remove()));
          await menu.waitFor({state:'hidden'});
          files.push(name);
        }
      }
      const menu=await openMenu();await menu.press('Escape');await menu.waitFor({state:'hidden'});
      assert.equal(await page.locator('dialog:modal').count(),fullscreen?1:0,'Escape closes the menu before fullscreen');
      if(fullscreen){await page.keyboard.press('Escape');await page.locator('dialog:modal').waitFor({state:'hidden'});}
    }
    await page.screenshot({path:path.join(output,'desktop-tabs.png')});
    for(const expanded of [false,true]){
      await page.setViewportSize({width:390,height:844});
      const toggle=toolbar.getByRole('button',{name:expanded?'Expand graph toolbar':'Collapse graph toolbar'});if(await toggle.count())await toggle.click();
      const menu=await openMenu();await page.screenshot({path:path.join(output,`mobile-${expanded?'expanded':'compact'}.png`)});await menu.press('Escape');await menu.waitFor({state:'hidden'});
    }
    const selected=page.getByRole('tab',{name:'Knowledge Graph',exact:true});
    assert.equal(await selected.getAttribute('aria-selected'),'true');
    assert.equal(await selected.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','Visualization tabs must use the original underline style');
    const tabStyles=await selected.evaluate(e=>{
      const root=e.closest('.MuiTabs-root'),indicator=getComputedStyle(root.querySelector('.MuiTabs-indicator'));
      return {indicator:{display:indicator.display,height:indicator.height,color:indicator.backgroundColor},tabs:[...root.querySelectorAll('[role="tab"]')].map(tab=>{const s=getComputedStyle(tab);return {background:s.backgroundColor,border:s.borderTopWidth,radius:s.borderRadius};})};
    });
    assert.deepEqual(tabStyles.indicator,{display:'block',height:'2px',color:'rgb(58, 131, 139)'});
    for(const style of tabStyles.tabs)assert.deepEqual(style,{background:'rgba(0, 0, 0, 0)',border:'0px',radius:'0px'});
    if(demo)assert(!requests.some(p=>p.includes('/agent/v2/')),'The fixed demo must not contact the agent');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,files,requests,errors},null,2));
    console.log(JSON.stringify({passed:true,files,output},null,2));
  }catch(error){await page.screenshot({path:path.join(output,'failure.png')});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
