// QA4 adaptation of builder-crosscheck/qa3-live-browser.mjs.
// Fresh nonpersistent desktop Chrome only; no personal profile, notes or deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const root='/tmp/glp001-iphoneqa-20261126';
const require=createRequire(path.join(root,'source/tests/review-repairs-browser.mjs'));
const {chromium}=require('playwright');
const evidence=path.join(root,'qa4-verification/live');
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const out=path.join(evidence,runId);
const base='https://glp001-iphone-qa.github.io/glp001-iphone-test/';
const deployment='63780b0a15c56a974c9dafd41d3308c0b82c1bf7';
const expectedSource='389e79baff4016a2ff61d1851908de0bd66beb8f';
const report={schema:'glp.qa4-live-browser.v1',startedAtUtc:new Date().toISOString(),runId,url:base,
  deploymentCommit:deployment,sourceCommit:expectedSource,
  scope:'Fresh headless desktop Chrome against actual GitHub Pages; no physical-device claim',
  checks:[],runtimeErrors:[],externalRequests:[],responses:[],screenshots:[],
  limitations:['Not physical iPhone, Safari, Home Screen, VoiceOver or airplane-mode acceptance.',
    'This live read-only check does not replace the earlier synthetic QA3-to-QA4 upgrade test.',
    'No private notes, personal profiles, source editing, deployment or release approval.']};
let browser,context,page;
await fs.mkdir(out,{recursive:true});
async function capture(name){
  const file=name+'.png';await page.screenshot({path:path.join(out,file),fullPage:false});report.screenshots.push(file);
}
async function check(name,fn){
  try{const detail=await fn();report.checks.push({name,status:'PASS',...(detail?{detail}:{})});}
  catch(e){report.checks.push({name,status:'FAIL',error:e.stack||String(e)});if(page&&!page.isClosed())await capture('failure-'+report.checks.length).catch(()=>{});}
}
try{
 const build=JSON.parse(await fs.readFile(path.join(evidence,'pages-build-ready.json'),'utf8'));
 assert.equal(build.status,'built');assert.equal(build.commit,deployment);report.pagesBuild=build;
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
   args:['--disable-background-networking']});
 report.browser=browser.version();
 context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 const allowedOrigin=new URL(base).origin;
 context.on('request',request=>{
   const u=new URL(request.url());if(/^https?:$/.test(u.protocol)&&u.origin!==allowedOrigin)report.externalRequests.push({url:u.origin+u.pathname,resourceType:request.resourceType()});
 });
 await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===allowedOrigin)await route.continue();else await route.abort();
 });
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>report.runtimeErrors.push({url:page.url(),message:e.message}));
 await check('Live QA metadata identifies the exact frozen source and preview',async()=>{
   const response=await context.request.get(base+'qa-build.json',{headers:{'Cache-Control':'no-cache'}});
   assert.equal(response.status(),200);const meta=await response.json();
   assert.equal(meta.sourceCommit,expectedSource);assert.equal(meta.buildId,'qa4-389e79b');
   assert.equal(meta.cacheVersion,'iphone-qa4-389e79b-20261126');report.liveMetadata=meta;
   return {buildId:meta.buildId,cacheVersion:meta.cacheVersion,sourceCommit:meta.sourceCommit};
 });
 const routes=[
  {name:'Preview guide',relative:'preview.html',kind:'preview'},
  {name:'Root library',relative:'',kind:'library',view:'today'},
  ...['today','read','explore','saved'].map(view=>({name:'Direct '+view+' entrance',relative:'index.html?view='+view,kind:'library',view})),
  {name:'Japji reader',relative:'full-japji.html',kind:'japji'},
  {name:'Kabir reader',relative:'salok-kabir/index.html?bani=salok-kabir',kind:'kabir'},
  {name:'Topic index',relative:'articles/index.html',kind:'article-index'},
  {name:'Haumai source sheet',relative:'articles/article.html?id=haumai-source-sheet',kind:'article'}
 ];
 for(const item of routes)await check(item.name,async()=>{
   const response=await page.goto(base+item.relative,{waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200,item.name);
   report.responses.push({name:item.name,url:response.url(),status:response.status(),fromServiceWorker:response.fromServiceWorker(),
     headers:await response.allHeaders()});
   await page.waitForSelector('#glp-qa-build');
   const label=await page.locator('#glp-qa-build').innerText();
   assert.match(label,/389e79b.*26 Nov 2026.*Preview 4/);
   assert.equal(await page.locator('.glp-qa-banner').count(),1);
   if(item.kind==='preview'){
     await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:45000});
     const names=await page.evaluate(()=>caches.keys());assert.ok(names.some(x=>x.endsWith('iphone-qa4-389e79b-20261126')));
     report.cacheNames=names;assert.equal(await page.locator('#check-update').isVisible(),true);
     await capture('live-preview-390');
   }else if(item.kind==='library'){
     await page.waitForSelector('html[data-library-state="ready"]');
     assert.equal(await page.title(),item.view[0].toUpperCase()+item.view.slice(1)+' · Gurbani Learning Library');
     assert.equal(await page.locator('.library-nav a[data-view]').count(),4);
     assert.equal(await page.locator('.library-nav a[aria-current="page"]').getAttribute('data-view'),item.view);
     assert.equal(await page.locator('[data-view-panel="'+item.view+'"]').isVisible(),true);
     if(item.view==='read')assert.equal(await page.locator('#reader-list a[data-reader-id]').count(),10);
     if(item.view==='saved')assert.equal(await page.locator('#saved-list a[data-saved-reader]').count(),10);
     if(item.name==='Direct today entrance'||item.view==='read')await capture('live-'+item.view+'-390');
   }else if(item.kind==='japji'){
     await page.waitForFunction(()=>window.GLP_CONTINUOUS_DEBUG?.lineCount===385);
     assert.equal(await page.locator('#continuous-reader').getAttribute('data-source-integrity'),'verified');
     assert.equal(await page.locator('#continuous-reader .gurbani-line').count(),385);
   }else if(item.kind==='kabir'){
     await page.waitForFunction(()=>window.NITNEM_INTERNAL_QA?.getState().sourceVerified===true);
     assert.equal(await page.locator('#source-unit .scripture-line').count(),486);
   }else{
     await page.waitForSelector('html[data-source-state="ready"]');
     if(item.kind==='article')assert.equal(await page.locator('.source-line[data-line-id]').count(),2);
     else assert.equal(await page.locator('a[data-article-id]').count(),2);
   }
   await page.evaluate(()=>document.fonts.ready);
   const width=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(width<=391,item.name+' fits 390-pixel viewport');
   return {url:page.url(),title:await page.title(),buildLabel:label,width};
 });
 await check('Live rendering has no external requests or uncaught runtime errors',async()=>{
   assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.externalRequests,[]);
 });
}catch(e){report.failure=e.stack||String(e);}
finally{
 if(context)await context.close();if(browser)await browser.close();
 report.finishedAtUtc=new Date().toISOString();
 report.result=!report.failure&&report.checks.every(c=>c.status==='PASS')?'PASS':'FAIL';
 await fs.writeFile(path.join(out,'live-browser.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,report:path.join(out,'live-browser.json'),checks:report.checks,
   runtimeErrors:report.runtimeErrors,externalRequests:report.externalRequests,failure:report.failure},null,2));
 if(report.result!=='PASS')process.exitCode=1;
}
