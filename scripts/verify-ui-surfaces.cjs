// Audit the shared UI without submitting a query or changing remote data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const base=new URL(process.env.UI_QA_URL||'http://127.0.0.1:4187');
assert(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
const output=process.env.UI_QA_OUTPUT||path.join(os.tmpdir(),'pankgraph-ui-surfaces');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 const page=await browser.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('pank_feedback_auto_prompt_disabled_v1','1');localStorage.setItem('pank-sidebar-open','false');});
 await page.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//,r=>r.abort());
 await page.route('**/pankgraph-dev-config.json',r=>r.fulfill({json:{vnextEnabled:true,apiBase:'/pankgraph-vnext/api'}}));
 async function overflow(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page must not overflow horizontally');}
 try{
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:width<600?568:900});await page.goto(new URL('/',base).href);
   const input=page.getByRole('textbox',{name:'Ask a question'});await input.waitFor();await page.evaluate(()=>document.fonts.ready);
   if(width<600){const box=await input.boundingBox();assert(box.y+box.height<568,'Search must fit the initial phone viewport');}
   await input.fill('Check the layout');
   const button=page.getByRole('button',{name:'Search',exact:true});
   const bounds=await button.evaluate(e=>{const b=e.getBoundingClientRect(),i=e.querySelector('img').getBoundingClientRect();return {right:b.right,iconRight:i.right,iconWidth:i.width};});
   assert.equal(bounds.iconWidth,18);assert(bounds.iconRight<=bounds.right-4,'Search icon must not be clipped');
   assert.equal((await page.getByRole('button',{name:'Clear question'}).boundingBox()).width,28);
   await input.press('Escape');assert.equal(await page.getByRole('button',{name:'Close examples'}).count(),0);
   await page.getByRole('button',{name:'Gene expression',exact:true}).click();
   await page.getByRole('button',{name:'Close examples'}).focus();await page.keyboard.press('Escape');
   assert(await page.getByRole('button',{name:'Gene expression',exact:true}).evaluate(e=>e===document.activeElement),'Example dismissal returns keyboard focus');
   await overflow();await page.screenshot({path:path.join(output,`home-${width}.png`)});checks.push({home:width});
  }
  const nav=page.locator('.pkb-nav'),height=(await nav.boundingBox()).height;
  const data=nav.getByRole('button',{name:'Data',exact:true});await data.focus();
  const wrapper=data.locator('..'),submenu=wrapper.locator('.submenu');assert(await submenu.isVisible(),'Keyboard focus opens desktop submenus');
  await page.keyboard.press('Tab');assert(await submenu.locator('a').first().evaluate(e=>e===document.activeElement));
  assert.equal((await nav.boundingBox()).height,height,'Opening a menu must not move the header');
  const graph=nav.locator('.menu-item-main-highlighted');await graph.focus();
  assert.equal(await graph.evaluate(e=>getComputedStyle(e).color),'rgb(255, 255, 255)','Highlighted navigation keeps readable contrast');checks.push({navigation:'Keyboard, stable height, highlighted contrast'});
  for(const route of ['/docs/overview','/docs/tutorial','/docs/statistics']){
   for(const width of [320,768,1440]){
    await page.setViewportSize({width,height:844});await page.goto(new URL(route,base).href);
    const docs=page.getByRole('navigation',{name:'Documentation navigation'});await docs.waitFor();
    await page.waitForFunction(()=>{const content=document.querySelector('.docs-layout > :last-child');return content&&content.textContent.length>150&&!content.textContent.startsWith('Loading...');});
    if(width<900){
     const toggle=docs.getByRole('button',{name:'Documentation',exact:true});assert.equal(await toggle.getAttribute('aria-expanded'),'false');
     assert.equal(await docs.getByRole('combobox',{name:'Search documentation'}).isVisible(),false);
     await toggle.click();await docs.getByRole('combobox',{name:'Search documentation'}).waitFor();
     const leaf=docs.getByRole('treeitem',{name:'Use cases',exact:true});await leaf.focus();await leaf.press('Enter');
     await page.waitForURL('**/docs/usecase');await page.waitForFunction(()=>document.querySelector('nav[aria-label="Documentation navigation"] button')?.getAttribute('aria-expanded')==='false');
     await docs.getByRole('combobox',{name:'Search documentation'}).waitFor({state:'hidden'});
     assert(await toggle.evaluate(e=>e===document.activeElement),'Collapsing navigation returns focus to its visible toggle');
    }
    const content=page.locator('.docs-layout > :last-child');assert((await content.boundingBox()).width>width*(width<900?.8:.4));
    await overflow();await page.screenshot({path:path.join(output,`${route.replaceAll('/','_')}-${width}.png`),animations:'disabled'});checks.push({route,width});
   }
  }
  for(const route of ['/usecases','/tutorial','/pipeline','/qtldatasource']){
   await page.setViewportSize({width:320,height:844});await page.goto(new URL(route,base).href);const content=page.locator('.markdown-body');await content.waitFor();
   await page.waitForFunction(()=>document.querySelector('.markdown-body')?.textContent.length>100);
   const width=await content.evaluate(e=>e.clientWidth-parseFloat(getComputedStyle(e).paddingLeft)-parseFloat(getComputedStyle(e).paddingRight));assert(width>=180,route+' readable text width');
   await overflow();await page.screenshot({path:path.join(output,route.slice(1)+'-320.png')});checks.push({route,contentWidth:width});
  }
  await page.goto(new URL('/result-new2?run_id=11111111-1111-4111-8111-111111111111',base).href);
  await page.getByRole('button',{name:'Give Feedback',exact:true}).click();
  const feedback=page.getByRole('dialog',{name:'Share your feedback'});await feedback.waitFor();
  await page.keyboard.press('Escape');await feedback.waitFor({state:'hidden'});
  assert(await page.getByRole('button',{name:'Give Feedback',exact:true}).evaluate(e=>e===document.activeElement));checks.push({feedback:'Escape and focus return'});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks,output},null,2));
 }catch(e){await page.screenshot({path:path.join(output,'failure.png')});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
