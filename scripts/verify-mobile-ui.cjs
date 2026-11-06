// Touch-first checks using local recorded results; never submit a live query.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const base=new URL(process.env.MOBILE_QA_URL||'http://127.0.0.1:4187');
assert(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
const output=process.env.MOBILE_QA_OUTPUT||path.join(os.tmpdir(),'pankgraph-mobile-ui');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),errors=[],submissions=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&/\/agent\/v2\/(plans|runs)$/.test(new URL(r.url()).pathname))submissions.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('pank_feedback_auto_prompt_disabled_v1','1');localStorage.setItem('pank-sidebar-open','false');});
 await page.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//,r=>r.abort());
 await page.route('**/pankgraph-dev-config.json',r=>r.fulfill({json:{vnextEnabled:true,apiBase:'/pankgraph-vnext/api'}}));
 await page.route('**/module-guide/health',r=>r.fulfill({json:{status:'ready'}}));
 const near=(a,b,label)=>assert(Math.abs(a-b)<1,label+': '+a+' vs '+b);
 try{
  for(const [width,height] of [[320,568],[360,740],[390,844],[430,932],[844,390]]){
   await page.setViewportSize({width,height});await page.goto(new URL('/',base).href);
   const input=page.getByRole('textbox',{name:'Ask a question'});await input.waitFor();await page.evaluate(()=>document.fonts.ready);
   {
    assert.equal(await input.evaluate(e=>e.tagName),'TEXTAREA');
    await input.fill('Explain how genetic variation affects pancreatic cell types and compare the related expression and regulatory evidence. '.repeat(12));
    const size=await input.evaluate(e=>({font:getComputedStyle(e).fontSize,height:e.clientHeight,line:parseFloat(getComputedStyle(e).lineHeight),scrollWidth:e.scrollWidth,width:e.clientWidth}));
    assert.equal(size.font,'16px');assert(size.height<=3*size.line+1&&size.height>size.line);assert(size.scrollWidth<=size.width+1,'Long questions wrap instead of scrolling horizontally');
    await input.press('Shift+Enter');assert((await input.inputValue()).endsWith('\n'));
    await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});assert.equal(new URL(page.url()).pathname,'/','IME confirmation must not submit a question');
    await input.press('Escape');await page.screenshot({path:path.join(output,`home-long-${width}.png`)});
   }
   const menu=page.getByRole('button',{name:'Open context navigation'});const menuBox=await menu.boundingBox();assert(menuBox.width>=44&&menuBox.height>=44);
   await menu.tap();await page.getByRole('button',{name:'Close context navigation'}).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'Close context navigation'}).tap();
   await page.goto(new URL('/result-new2?run_id=11111111-1111-4111-8111-111111111111',base).href);
   const followup=page.getByRole('textbox',{name:'Follow-up question'});await followup.waitFor();
   const composer=await followup.evaluate(e=>{const input=e.getBoundingClientRect(),bar=e.closest('.pank-followup-bar').getBoundingClientRect(),button=e.parentElement.querySelector('button').getBoundingClientRect();return {x:input.x,height:input.height,right:button.right,buttonHeight:button.height,barRight:bar.right,font:getComputedStyle(e).fontSize};});
   assert(composer.x>=0&&composer.right<=width&&composer.right<=composer.barRight,'Composer and Search stay inside the viewport');
   if(width<600){near(composer.height,44,'Input touch height');near(composer.buttonHeight,44,'Search touch height');assert.equal(composer.font,'16px');
    const text=await page.locator('[id$="-ai-overview"]').first().boundingBox();assert(text.x<=17,'Result content uses a single phone gutter');
    const needsScroll=await page.getByRole('tab',{name:'Knowledge Graph',exact:true}).evaluate(e=>{const s=e.closest('.MuiTabs-root').querySelector('.MuiTabs-scroller');return s.scrollWidth>s.clientWidth+1;});
    if(needsScroll){const more=page.getByRole('button',{name:'More visualization tabs'});await more.waitFor();await more.tap();await page.getByRole('button',{name:'Previous visualization tabs'}).waitFor();}
   }
   await page.screenshot({path:path.join(output,`result-${width}.png`)});
   assert(await page.locator('.pank-result-actions').evaluate(e=>getComputedStyle(e).position==='static'&&getComputedStyle(e).flexDirection==='row'),'Mobile help actions stay inside the bottom bar');
   const guide=page.getByRole('button',{name:'Open module guide'});await guide.tap();
   const panel=page.getByRole('dialog',{name:'PanKgraph module guide'});await panel.waitFor();
   assert(await panel.evaluate(e=>e===document.activeElement),'Touch guide opening must not automatically focus the text field');
   let bounds=await panel.boundingBox();assert(bounds.x>=0&&bounds.y>=15&&bounds.y+bounds.height<=height,'Guide fits the visible viewport');
   if(width===390){
    await page.setViewportSize({width,height:390});await page.waitForTimeout(100);
    bounds=await panel.boundingBox();assert(bounds.y>=15&&bounds.y+bounds.height<=390,'Guide adapts to a reduced viewport');
    const editor=await page.getByRole('textbox',{name:'Ask about module usage'}).boundingBox();assert(editor.y+editor.height<=390);
    await page.screenshot({path:path.join(output,'guide-short-viewport.png')});
    await page.setViewportSize({width,height});await page.waitForTimeout(100);
   }
   await page.getByRole('button',{name:'Close module guide'}).tap();
   await page.getByRole('button',{name:'Give Feedback',exact:true}).tap();
   const feedback=page.getByRole('dialog',{name:'Share your feedback'});await feedback.waitFor();
   if(width<600){assert.equal(await page.getByRole('textbox',{name:'Feedback comments'}).evaluate(e=>getComputedStyle(e).fontSize),'16px');assert.equal(await page.getByRole('textbox',{name:'Feedback email'}).evaluate(e=>getComputedStyle(e).fontSize),'16px');}
   await page.getByRole('button',{name:'Close feedback dialog'}).tap();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push({width,height,passed:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(submissions,[]);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks,output},null,2));
 }catch(e){await page.screenshot({path:path.join(output,'failure.png')});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
