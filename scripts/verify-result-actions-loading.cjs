// Regression checks for initial iframe states and same-frame action alignment.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const url=new URL(process.env.ACTION_QA_URL||'http://127.0.0.1:4187/result-new2?run_id=11111111-1111-4111-8111-111111111111');
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
const prefix=url.pathname.startsWith('/techdemo')?'/techdemo':'';
const output=process.env.ACTION_QA_OUTPUT||path.join(os.tmpdir(),'pankgraph-actions-loading');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage(),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('pank_feedback_auto_prompt_disabled_v1','1');localStorage.setItem('pank-sidebar-open','false');});
  await page.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//,r=>r.abort());
  await page.route('**/pankgraph-dev-config.json',r=>r.fulfill({json:{vnextEnabled:true,apiBase:'/pankgraph-vnext/api'}}));
  await page.route('**/module-guide/health',r=>r.fulfill({json:{status:'ready'}}));
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:650});await page.goto(url.href);
   await page.getByRole('tab',{name:'Knowledge Graph',exact:true}).waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const samples=await page.evaluate(()=>{
    const guide=document.querySelector('.guide-launcher'),feedback=document.querySelector('[data-pank-feedback-launcher]');
    const out=[],sample=label=>{const g=guide.getBoundingClientRect(),f=feedback.getBoundingClientRect();out.push({label,left:g.left-f.left,right:g.right-f.right,width:g.width-f.width,gap:f.top-g.bottom});};
    sample('initial');
    // Measure in the same JS task, before a scroll event or React render can run.
    for(let p=guide.parentElement;p;p=p.parentElement){
     if(p.scrollHeight<=p.clientHeight+1)continue;
     const max=p.scrollHeight-p.clientHeight;
     for(let i=0;i<=12;i++){p.scrollTop=max*i/12;sample('scroll '+p.tagName+' '+i);}
     p.scrollTop=0;
    }
    const footer=guide.closest('.pank-result-footer');
    if(footer.classList.contains('has-search')){
     const bar=footer.firstElementChild,previous=bar.style.paddingBottom;
     bar.style.paddingBottom='64px';sample('taller follow-up bar');bar.style.paddingBottom=previous;sample('restored follow-up bar');
    }
    return out;
   });
   assert(samples.length>1,'Exercise a scrolling page');
   for(const s of samples){assert(Math.abs(s.left)<.5&&Math.abs(s.right)<.5&&Math.abs(s.width)<.5,JSON.stringify(s));assert(Math.abs(s.gap-10)<.5,JSON.stringify(s));}
   const size=width<600?40:48,expanded=width<600?176:220;
   for(const name of ['Open module guide','Give Feedback']){
    const button=page.getByRole('button',{name,exact:true}),initial=await button.boundingBox();
    assert.equal(initial.width,size);assert.equal(initial.height,size);
    assert.equal(await button.locator('.pank-floating-action-label').evaluate(e=>getComputedStyle(e).opacity),'0');
    await button.hover({position:{x:size-8,y:size/2}});
    const frames=await button.evaluate(async e=>{
     const frames=[];
     for(let i=0;i<18;i++){await new Promise(requestAnimationFrame);const r=e.getBoundingClientRect();frames.push({top:r.top,right:r.right,height:r.height,width:r.width});}
     return frames;
    });
    for(const frame of frames){assert(Math.abs(frame.top-initial.y)<.5);assert(Math.abs(frame.right-initial.x-initial.width)<.5);assert.equal(frame.height,size);}
    await page.waitForFunction(({name,expanded})=>{const e=[...document.querySelectorAll('.pank-floating-action')].find(e=>e.getAttribute('aria-label')===name);return Math.abs((e?.getBoundingClientRect().width||0)-expanded)<.5;},{name,expanded},{timeout:3000});
    assert.equal(await button.locator('.pank-floating-action-label').evaluate(e=>getComputedStyle(e).opacity),'1');
    await page.screenshot({path:path.join(output,`hover-${name.startsWith('Open')?'guide':'feedback'}-${width}.png`)});
    await page.mouse.move(0,0);
    await page.waitForFunction(({name,size})=>{const e=[...document.querySelectorAll('.pank-floating-action')].find(e=>e.getAttribute('aria-label')===name);return e?.getBoundingClientRect().width===size;},{name,size});
   }
   await page.screenshot({path:path.join(output,`collapsed-${width}.png`)});
   // Keyboard users can reveal the labels without a pointing device.
   await page.keyboard.press('Tab');
   const keyboardButton=page.getByRole('button',{name:'Give Feedback',exact:true});await keyboardButton.focus();
   await page.waitForFunction(expanded=>document.querySelector('[data-pank-feedback-launcher]').getBoundingClientRect().width===expanded,expanded);
   await keyboardButton.evaluate(e=>e.blur());
   await page.waitForFunction(size=>document.querySelector('[data-pank-feedback-launcher]').getBoundingClientRect().width===size,size);
   const guide=page.getByRole('button',{name:'Open module guide'});await guide.click();
   const panel=page.getByRole('dialog',{name:'PanKgraph module guide'});await panel.waitFor();
   const bounds=await panel.boundingBox();assert(bounds.y>=15&&bounds.x>=0&&bounds.x+bounds.width<=width,'Open guide must fit the viewport');
   await page.screenshot({path:path.join(output,`actions-${width}.png`)});
   await page.getByRole('button',{name:'Close module guide'}).click();
   checks.push({width,alignmentSamples:samples.length});
  }
  const touch=await browser.newPage({viewport:{width:390,height:650},hasTouch:true,isMobile:true});
  await touch.addInitScript(()=>{localStorage.setItem('pank_feedback_auto_prompt_disabled_v1','1');});
  await touch.route('**/pankgraph-dev-config.json',r=>r.fulfill({json:{vnextEnabled:true,apiBase:'/pankgraph-vnext/api'}}));
  await touch.route('**/module-guide/health',r=>r.fulfill({json:{status:'ready'}}));
  await touch.route(/https:\/\/(www\.)?(google-analytics|googletagmanager)\.com\//,r=>r.abort());
  await touch.goto(url.href);await touch.getByRole('tab',{name:'Knowledge Graph',exact:true}).waitFor();
  const touchGuide=touch.getByRole('button',{name:'Open module guide'});
  assert.equal((await touchGuide.boundingBox()).width,40);
  await touchGuide.tap();await touch.getByRole('button',{name:'Close module guide'}).tap();
  await touch.getByRole('button',{name:'Give Feedback',exact:true}).tap();await touch.getByRole('button',{name:'Close feedback dialog'}).tap();
  await touch.close();checks.push({touch:'Both circular buttons open on tap'});
  // Leave the embeds without a context, retaining exactly their first render.
  // This makes the normally transient text measurable without biological APIs.
  for(const component of ['pankbase-browser','scbrowser']){
   await page.goto(new URL(`${prefix}/${component}/index.html`,url).href);
   const state=page.locator('.browser-entry-state');await state.waitFor();
   const spacing=await state.evaluate(e=>{const s=getComputedStyle(e),r=document.createRange();r.selectNodeContents(e);const text=r.getBoundingClientRect();return{left:text.left,top:text.top,padding:s.padding,margin:s.margin};});
   assert(spacing.left>=16&&spacing.top>=16,component+': '+JSON.stringify(spacing));
   assert.equal(spacing.padding,'16px');assert.equal(spacing.margin,'0px');
   await page.screenshot({path:path.join(output,`${component}-initial.png`)});checks.push({component,spacing});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks,output},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
