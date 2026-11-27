// QA4 adaptation; only fresh synthetic contexts, loopback hosts, no deployment.
// Builder QA only. Disposable synthetic contexts; no real browser profile or private data.
// Run: node /tmp/glp001-iphoneqa-20261126/builder-crosscheck/qa3-upgrade-probe.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const base='/tmp/glp001-iphoneqa-20261126';
const oldRoot=path.join(base,'qa3-stage'),newRoot=path.join(base,'qa4-reviewed');
const out=path.join(base,'qa4-verification/upgrade',new Date().toISOString().replace(/[:.]/g,'-'));
const prefix='/glp001-iphone-test/',KEY='glp001.continuous.v2';
const NOTE='SYNTHETIC QA4 update reflection — ਪੰਜਾਬੀ — keep every character.';
const require=createRequire(path.join(base,'source/tests/review-repairs-browser.mjs'));
const {chromium}=require('playwright');
const expectedSource='389e79baff4016a2ff61d1851908de0bd66beb8f';
const report={schema:'glp.qa4-upgrade-probe.v1',startedAtUtc:new Date().toISOString(),
  scope:'Builder desktop Chrome verification of the isolated QA adaptation',
  checks:[],layouts:[],screenshots:[],runtimeErrors:[],blockedExternalRequests:[],serverErrors:[],
  limitations:['No physical iPhone, Safari, Home Screen, VoiceOver, or airplane-mode acceptance.',
    'Only synthetic notes in fresh nonpersistent browser contexts.',
    'Not Claude independent verification, qualified source review, or permission to release.',
    'PDF copying and printing compatibility are outside this bounded check.']};
let root=oldRoot,server,browser,origin,certDir,activePage;
const contexts=new Set();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml',
  '.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
let oldMeta,newMeta,seedRaw,seedKeys;
function digest(bytes){return createHash('sha256').update(bytes).digest('hex');}
async function check(name,fn){
  try{const detail=await fn();report.checks.push({name,status:'PASS',...(detail?{detail}:{})});}
  catch(error){report.checks.push({name,status:'FAIL',error:error.stack||String(error)});
    if(activePage&&!activePage.isClosed())try{await capture(activePage,'failure-'+report.checks.length);}catch{}
    throw error;}
}
async function fresh({serviceWorkers='allow'}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,
    ignoreHTTPSErrors:true,serviceWorkers,reducedMotion:'reduce',acceptDownloads:true});
  contexts.add(context);
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin===origin)await route.continue();
    else {report.blockedExternalRequests.push(u.origin+u.pathname);await route.abort();}
  });
  const page=await context.newPage();activePage=page;page.setDefaultTimeout(20000);
  page.on('pageerror',error=>report.runtimeErrors.push({path:new URL(page.url()).pathname,message:error.message}));
  return {context,page};
}
async function close(context){await context.close();contexts.delete(context);}
async function go(page,relative='index.html'){
  activePage=page;const response=await page.goto(origin+prefix+relative,{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200,relative+' must load');return response;
}
async function japjiReady(page){
  await page.waitForFunction(()=>window.GLP_CONTINUOUS_DEBUG?.lineCount===385);
  assert.equal(await page.locator('#continuous-reader').getAttribute('data-source-integrity'),'verified');
}
async function controlled(page){
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:45000});
}
async function cacheNames(page){return page.evaluate(()=>caches.keys());}
async function currentRecord(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function preserved(page){
  const record=await currentRecord(page);
  assert.equal(record.notes?.['mool.line01'],NOTE);
  assert.ok(record.bookmarks?.includes('mool.line01'));
  return {noteExact:true,bookmarkPreserved:true};
}
async function capture(page,name){
  await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});
  report.screenshots.push(name+'.png');
}
async function layout(page,label){
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.evaluate(()=>{
    const banner=document.querySelector('.glp-qa-banner');
    const b=banner?.getBoundingClientRect(),style=banner?getComputedStyle(banner):null;
    const header=[...document.querySelectorAll('header')].find(n=>n.getClientRects().length);
    const h=header?.getBoundingClientRect();
    return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,
      bannerCount:document.querySelectorAll('.glp-qa-banner').length,
      banner:b?{top:b.top,bottom:b.bottom,height:b.height,position:style.position}:null,
      header:h?{top:h.top,bottom:h.bottom}:null,build:document.querySelector('#glp-qa-build')?.textContent||''};
  });
  assert.equal(result.width,390);
  assert.ok(result.documentWidth<=391,label+' horizontal overflow: '+JSON.stringify(result));
  assert.equal(result.bannerCount,1,label+' exactly one QA banner');
  assert.ok(result.banner.height>0&&['relative','static'].includes(result.banner.position),label+' banner stays in document flow');
  if(result.header)assert.ok(result.header.top>=result.banner.bottom-1,label+' banner/header overlap: '+JSON.stringify(result));
  assert.ok(result.build.includes('389e79b'),label+' source build label');
  report.layouts.push({label,...result});
}
async function applyExistingUpdate(page,{reader=true}={}){
  if(reader){await page.locator('#explore').click();await page.locator('#dialog-body [data-action="install"]').click();}
  await page.locator('#check-update').click();
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting),null,{timeout:45000});
  await page.locator('#apply-update').waitFor({state:'visible'});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#apply-update').click()]);
  if(reader)await japjiReady(page);
  await page.waitForFunction(()=>document.querySelector('#glp-qa-build')?.textContent.includes('389e79b'));
  const names=await cacheNames(page);
  assert.ok(names.some(n=>n.endsWith(':'+newMeta.cacheVersion)));
  assert.ok(!names.some(n=>n.endsWith(':'+oldMeta.cacheVersion)));
}
async function waitRoute(page,kind,count){
  if(kind==='japji')await japjiReady(page);
  else if(kind==='sukhmani')await page.waitForFunction(()=>document.querySelectorAll('#sukhmani-text .sk-line').length===2027);
  else if(kind==='salok')await page.waitForFunction(count=>window.NITNEM_INTERNAL_QA?.getState().sourceVerified&&document.querySelectorAll('#source-unit .scripture-line').length===count,count);
  else if(kind==='article'){
    await page.waitForFunction(()=>['ready','unavailable'].includes(document.documentElement.dataset.sourceState));
    assert.equal(await page.locator('html').getAttribute('data-source-state'),'ready');
  }
}

try{
  // Refuse to proceed until both real build manifests are available.
  oldMeta=JSON.parse(await fs.readFile(path.join(oldRoot,'qa-build.json'),'utf8'));
  newMeta=JSON.parse(await fs.readFile(path.join(newRoot,'qa-build.json'),'utf8'));
  assert.equal(oldMeta.sourceCommit,'acfeb0a157fc2cf38ae7ccbaeb2c53d8e97d3bec');
  assert.equal(newMeta.sourceCommit,expectedSource);
  assert.notEqual(oldMeta.cacheVersion,newMeta.cacheVersion);
  report.oldBuild=oldMeta;report.newBuild=newMeta;
  assert.equal(newMeta.previousQaCommit,'e7032867b9e4ed9bed9d302d72ecf9403f6479ca');
  const oldManifest=await fs.readFile(path.join(oldRoot,'manifest.webmanifest'),'utf8');
  const newManifest=await fs.readFile(path.join(newRoot,'manifest.webmanifest'),'utf8');
  assert.equal(newManifest,oldManifest,'PWA manifest identity must be unchanged');
  report.manifestIdentity={byteIdentical:true,identity:JSON.parse(newManifest)};
  report.workerDigests={old:digest(await fs.readFile(path.join(oldRoot,'sw.js'))),
    candidate:digest(await fs.readFile(path.join(newRoot,'sw.js')))};
  await fs.mkdir(out,{recursive:true});
  certDir=await fs.mkdtemp(path.join(out,'.ephemeral-loopback-tls-'));
  execFileSync('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes',
    '-keyout',path.join(certDir,'key.pem'),'-out',path.join(certDir,'cert.pem'),
    '-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
  server=https.createServer({key:await fs.readFile(path.join(certDir,'key.pem')),
    cert:await fs.readFile(path.join(certDir,'cert.pem'))},async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'https://localhost').pathname);
      if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
      if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
      let relative=pathname.slice(prefix.length);if(!relative||relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(root,relative);
      if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      const bytes=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream',
        'Cache-Control':'no-store','Service-Worker-Allowed':prefix}).end(bytes);
    }catch(error){report.serverErrors.push({url:req.url,message:error.code||error.message});res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='https://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,
    executablePath:process.env.CHROMIUM_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--ignore-certificate-errors','--disable-background-networking',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1']});
  report.browserVersion=browser.version();
  let {context,page}=await fresh();
  await check('Old QA installs its real hashed service worker in a fresh synthetic browser',async()=>{
    await go(page);await controlled(page);
    assert.ok((await cacheNames(page)).some(n=>n.endsWith(':'+oldMeta.cacheVersion)));
    assert.ok((await page.locator('#glp-qa-build').textContent()).includes('acfeb0a'));
    return {oldCache:oldMeta.cacheVersion};
  });
  await check('A valid bookmark and exact synthetic note are created through the old Japji UI',async()=>{
    await go(page,'full-japji.html');await japjiReady(page);
    await page.locator('#dock-position').click();
    await page.locator('#dialog-body [data-action="jump"][data-index="0"]').click();
    await page.locator('#tools-open').click();await page.locator('#dialog-body [data-action="reader-save"]').click();
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'{}').bookmarks?.includes('mool.line01'),KEY);
    await page.locator('#tools-open').click();
    await page.locator('#dialog-body [data-action="note"][data-index="0"]').click();
    await page.waitForFunction(()=>document.querySelector('#reflection')&&!document.querySelector('#reflection').disabled);
    await page.locator('#reflection').fill(NOTE);
    await page.waitForFunction(({key,note})=>JSON.parse(localStorage.getItem(key)||'{}').notes?.['mool.line01']===note,{key:KEY,note:NOTE});
    await page.locator('#dialog-close').click();await preserved(page);
    seedRaw=await page.evaluate(key=>localStorage.getItem(key),KEY);
    seedKeys=await page.evaluate(()=>Object.keys(localStorage).sort());
    return {fixture:'Created by ordinary shipped bookmark/reflection controls',noteExact:true};
  });
  await check('Replacing server files alone keeps the old installed reader until explicit update',async()=>{
    root=newRoot;
    await page.reload({waitUntil:'domcontentloaded'});await japjiReady(page);
    assert.ok((await page.locator('#glp-qa-build').textContent()).includes('acfeb0a'));
    await preserved(page);
  });
  await check('Shipped reader update control activates the new release and preserves note and bookmark',async()=>{
    await applyExistingUpdate(page);await preserved(page);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).sort()),seedKeys,'Explicit upgrade must not migrate or add source-learning keys');
    await layout(page,'Updated Japji');await capture(page,'updated-japji-390');
    return {newCache:newMeta.cacheVersion,noteExact:true,bookmarkPreserved:true};
  });
  await check('New four entrances open directly with Preview 4 identity and current navigation',async()=>{
    for(const view of ['today','read','explore','saved']){
      await go(page,'index.html?view='+view);
      await page.waitForSelector('html[data-library-state="ready"]');
      assert.equal(await page.title(),view[0].toUpperCase()+view.slice(1)+' · Gurbani Learning Library');
      assert.equal(await page.locator('.library-nav a[aria-current="page"]').getAttribute('data-view'),view);
      await layout(page,'Entrance '+view);await capture(page,'entrance-'+view+'-390');
    }
    for(const [href,kind,count] of [
      ['salok-mahalla9/index.html?bani=salok-mahalla9','salok',114],
      ['salok-kabir/index.html?bani=salok-kabir','salok',486],
      ['articles/index.html','article',0]
    ]){
      await go(page,href);await waitRoute(page,kind,count);
      await layout(page,href);
    }
    await preserved(page);
  });
  await check('New main routes are reachable from the installed shell with browser network disabled',async()=>{
    await context.setOffline(true);
    for(const [relative,kind,count] of [
      ['index.html?view=today','home',0],['index.html?view=read','home',0],
      ['index.html?view=explore','home',0],['index.html?view=saved','home',0],['nitnem/index.html','collection',0],
      ['full-japji.html','japji',0],['sukhmani.html','sukhmani',0],
      ['salok-mahalla9/index.html?bani=salok-mahalla9','salok',114],
      ['salok-kabir/index.html?bani=salok-kabir','salok',486],
      ['articles/index.html','article',0],
      ['articles/article.html?id=haumai-source-sheet','article',0],
      ['articles/article.html?id=dubidha-source-sheet','article',0],
      ['simran.html','simran',0],['breathing.html','breathing',0],
      ['gurdwaras.html','places',0]
    ]){
      const response=await go(page,relative);assert.equal(response.fromServiceWorker(),true,relative);
      await waitRoute(page,kind,count);await layout(page,relative);
    }
    await preserved(page);await context.setOffline(false);
    return {routes:15,network:'Browser-emulated offline; not physical airplane mode'};
  });
  await close(context);

  const hasPreview=await fs.access(path.join(newRoot,'preview.html')).then(()=>true,()=>false);
  if(hasPreview){
    root=oldRoot;({context,page}=await fresh());
    await check('QA-only preview loads through an old cache and uses the shipped explicit update handler',async()=>{
      await go(page);await controlled(page);
      await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:seedRaw});
      root=newRoot;
      await go(page,'preview.html');
      assert.match(await page.locator('#glp-qa-build').innerText(),/acfeb0a/,'Existing preview path is initially served by old installed worker');
      assert.ok((await cacheNames(page)).some(n=>n.endsWith(':'+oldMeta.cacheVersion)));
      await applyExistingUpdate(page,{reader:false});
      await preserved(page);await layout(page,'Updated Preview entrance');await capture(page,'preview-390');
      await go(page);assert.ok((await page.locator('#glp-qa-build').textContent()).includes('389e79b'));
      await preserved(page);
      return {existingCachedPreviewPath:true,shippedHandler:true,syntheticNotePreserved:true};
    });
    await close(context);
  }else report.checks.push({name:'QA-only preview entrance',status:'NOT_PRESENT',detail:'No preview.html supplied; reader update route was verified.'});

  root=newRoot;({context,page}=await fresh({serviceWorkers:'block'}));
  await check('One-byte source-package mutation refuses the adapted article without scripture or printing',async()=>{
    const target='salok-mahalla9/data/salok-mahalla9.json';
    const original=await fs.readFile(path.join(newRoot,target));
    const modified=Buffer.from(original),offset=modified.indexOf(0x20);
    assert.ok(offset>=0);modified[offset]=0x09;
    assert.notEqual(digest(original),digest(modified));
    JSON.parse(modified.toString('utf8')); // Valid JSON, but one source-package byte differs.
    await page.route('**/'+target,route=>route.fulfill({status:200,contentType:'application/json; charset=utf-8',body:modified}));
    await go(page,'articles/article.html?id=haumai-source-sheet');
    await page.waitForFunction(()=>document.documentElement.dataset.sourceState==='unavailable');
    assert.equal(await page.locator('.source-line:visible').count(),0);
    assert.equal(await page.locator('#print-article').isDisabled(),true);
    assert.equal(await page.locator('#article-error').isVisible(),true);
    await capture(page,'article-refuses-mutated-package-390');
    return {mutatedBytes:1,offset,originalSHA256:digest(original),mutatedSHA256:digest(modified),
      visibleScriptureLines:0,printDisabled:true};
  });
  await close(context);
  assert.deepEqual(report.runtimeErrors,[],'No uncaught page runtime errors');
}catch(error){
  report.failure=error.stack||String(error);process.exitCode=1;
}finally{
  for(const context of contexts)try{await context.close();}catch{}
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  if(certDir)await fs.rm(certDir,{recursive:true,force:true});
  report.finishedAtUtc=new Date().toISOString();report.status=report.failure?'FAIL':'PASS';
  await fs.mkdir(out,{recursive:true});
  await fs.writeFile(path.join(out,'upgrade-probe.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,
    failure:report.failure||null,evidence:path.join(out,'upgrade-probe.json')},null,2));
}
