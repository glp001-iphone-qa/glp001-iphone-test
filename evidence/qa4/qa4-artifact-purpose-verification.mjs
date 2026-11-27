// Purpose-specific QA4 adapter checks. No runtime/application files are edited. Earlier instrument failures are retained.
// Final instrument scope: source runtime assets plus attribution files; deployment adapters README, robots, .nojekyll, manifest, worker and HTML are checked separately or by browser. Prior attempts retained.
// Corrected instrument: QA documentation is not a runtime asset; Sukhmani data is a JS assignment. Initial failure and original script retained.
// QA4 artifact/source identity checks. Reads only candidate, baseline, and frozen Git objects.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const base='/tmp/glp001-iphoneqa-20261126';
const qa=path.join(base,'qa4-reviewed'),old=path.join(base,'qa3-stage'),repo=path.join(base,'unified-library');
const out=path.join(base,'qa4-verification');
const source='389e79baff4016a2ff61d1851908de0bd66beb8f';
const report={schema:'glp.qa4-artifact-verification.v1',startedAtUtc:new Date().toISOString(),checks:[],sourceBindings:[],runtimeFiles:[],limitations:['File identity and tested navigation do not constitute qualified Gurbani review or physical-device acceptance.','No live data or personal browser profile is accessed. No deployment is performed.']};
const sha=b=>createHash('sha256').update(b).digest('hex');
async function check(name,fn){try{const detail=await fn();report.checks.push({name,status:'PASS',detail});}catch(e){report.checks.push({name,status:'FAIL',error:e.stack||String(e)});}}
async function walk(dir,rel=''){let a=[];for(const e of await fs.readdir(path.join(dir,rel),{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=path.join(rel,e.name);if(e.isDirectory())a.push(...await walk(dir,p));else if(e.isFile())a.push(p);}return a;}
await check('Baseline Git checkout and candidate metadata identify the frozen builds',async()=>{
 const head=execFileSync('git',['-C',old,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 assert.equal(head,'e7032867b9e4ed9bed9d302d72ecf9403f6479ca');
 const meta=JSON.parse(await fs.readFile(path.join(qa,'qa-build.json'),'utf8'));
 assert.equal(meta.sourceCommit,source);assert.equal(meta.previousQaCommit,head);
 return {baseline:head,sourceCommit:source,buildId:meta.buildId,cacheVersion:meta.cacheVersion};
});
await check('Manifest install identity is byte-identical to QA3',async()=>{
 const a=await fs.readFile(path.join(old,'manifest.webmanifest')),b=await fs.readFile(path.join(qa,'manifest.webmanifest'));
 assert.ok(a.equals(b));return {sha256:sha(b),manifest:JSON.parse(b)};
});
await check('Every staged runtime module/data/style asset matches its frozen source object',async()=>{
 const tracked=new Set(execFileSync('git',['-C',repo,'ls-tree','-r','--name-only',source],{encoding:'utf8'}).trim().split('\n'));
 for(const file of (await walk(qa)).sort()){
  if(!tracked.has(file)||file.endsWith('.html')||['README.md','robots.txt','manifest.webmanifest','sw.js','tools/build-offline.mjs'].includes(file))continue;
  const actual=await fs.readFile(path.join(qa,file));
  const frozen=execFileSync('git',['-C',repo,'show',source+':'+file],{maxBuffer:32*1024*1024});
  assert.ok(actual.equals(frozen),file+' must match frozen source bytes');
  report.runtimeFiles.push({path:file,sha256:sha(actual),bytes:actual.length});
 }
 assert.equal(report.runtimeFiles.length,67);
 return {byteIdenticalFiles:report.runtimeFiles.length};
});
await check('All ten directory source bindings match their real bytes and unchanged QA3 packages',async()=>{
 const {READERS}=await import(pathToFileURL(path.join(qa,'library/catalog.mjs')));
 assert.equal(READERS.length,10);
 for(const reader of READERS){
  for(const pin of reader.sourceBindings){
   const b=await fs.readFile(path.join(qa,pin.path)),previous=await fs.readFile(path.join(old,pin.path));
   assert.equal(sha(b),pin.sha256,reader.id+' source digest');
   assert.ok(b.equals(previous),reader.id+' source bytes must not change during library navigation upgrade');
   const entry={reader:reader.id,path:pin.path,sha256:pin.sha256,unchangedFromQa3:true};
   if(pin.compositionId||pin.editionId){
    let pack;
    if(pin.path.endsWith('.js')){const c={window:{}};vm.runInNewContext(b.toString('utf8'),c,{timeout:3000});pack=c.window.GLP_SUKHMANI;assert.ok(pack,'Known Sukhmani source global exists');}
    else pack=JSON.parse(b);
    assert.equal(pack.compositionId,pin.compositionId);if(pin.editionId)assert.equal(pack.editionId,pin.editionId);
    entry.compositionId=pack.compositionId;entry.editionId=pack.editionId;
   }
   report.sourceBindings.push(entry);
  }
 }
 const storageFiles=['nitnem/local-learning.js','js/learning-storage.js'];
 const files=[];
 for(const f of storageFiles){
  let present=true;try{await fs.access(path.join(qa,f));}catch{present=false;}
  if(!present)continue;
  const a=await fs.readFile(path.join(old,f)),b=await fs.readFile(path.join(qa,f));
  assert.ok(a.equals(b),f+' unchanged storage contract');files.push({path:f,sha256:sha(b)});
 }
 assert.ok(files.some(f=>f.path==='nitnem/local-learning.js'));
 return {readers:10,bindings:report.sourceBindings.length,storageContractFiles:files};
});
await check('QA crawler exclusion and Pages adapter are intentionally scoped',async()=>{
 const robots=await fs.readFile(path.join(qa,'robots.txt'),'utf8');
 assert.match(robots,/User-agent: \*\nDisallow: \/(?:\n|$)/);
 await fs.access(path.join(qa,'.nojekyll'));
 return {robots,sourceRuntimeExclusions:['README.md','robots.txt','.nojekyll','manifest.webmanifest','sw.js','HTML QA-banner adapters'],reason:'QA documentation, crawler policy, Pages marker, manifest identity and regenerated verified cache are deployment adapters; no source-runtime exception.'};
});

const frozen=file=>execFileSync('git',['-C',repo,'show',source+':'+file],{encoding:'utf8',maxBuffer:32*1024*1024});
const meta=JSON.parse(await fs.readFile(path.join(qa,'qa-build.json'),'utf8'));
const version=meta.cacheVersion;
function oneReplace(text,find,replacement,label){assert.equal(text.split(find).length-1,1,label+' occurs exactly once');return text.replace(find,replacement);}
function banner(prefix){return '<aside class="glp-qa-banner" role="note" aria-label="Isolated development preview"><strong>TEST COPY — DEVELOPMENT PREVIEW</strong><small id="glp-qa-build">Source build: 389e79b · 26 Nov 2026 · Preview 4</small><small>Use made-up notes only · Qualified review pending</small><small><a href="'+prefix+'preview.html">Preview guide and update help</a></small></aside>';}
await check('Every inherited HTML page reverses exactly to frozen source after the four declared QA adaptations',async()=>{
 const records=[];
 for(const file of (await walk(qa)).filter(f=>f.endsWith('.html')&&f!=='preview.html').sort()){
  const prefix='../'.repeat(file.split('/').length-1),actual=await fs.readFile(path.join(qa,file),'utf8');
  let restored=oneReplace(actual,'<title>TEST COPY · ','<title>',file+' title prefix');
  restored=oneReplace(restored,'\n<meta name="robots" content="noindex,nofollow">','',file+' robots meta');
  restored=oneReplace(restored,'\n<link rel="stylesheet" href="'+prefix+'qa-banner.css">','',file+' stylesheet');
  restored=oneReplace(restored,'\n'+banner(prefix),'',file+' banner');
  assert.equal(restored,frozen(file),file+' no other HTML/content change');
  records.push({path:file,qaSHA256:sha(actual),restoredSourceSHA256:sha(restored)});
 }
 assert.equal(records.length,13);report.htmlAdapters=records;return {pages:records.length,allowedChanges:['title prefix','noindex meta','relative QA stylesheet','in-flow QA banner'],remainingBytes:'exact frozen source'};
});
await check('Generated worker retains frozen runtime logic and verifies every declared cache asset',async()=>{
 const original=frozen('sw.js'),actual=await fs.readFile(path.join(qa,'sw.js'),'utf8');
 const versionPattern=/const VERSION="([^"]+)";/,assetsPattern=/const EXPECTED=(\{[^\n]+\});/;
 assert.equal(actual.match(versionPattern)?.[1],version);
 const expected=JSON.parse(actual.match(assetsPattern)[1]),sourceExpected=JSON.parse(original.match(assetsPattern)[1]);
 const canonical=s=>s.replace(versionPattern,'const VERSION="<VERSION>";').replace(assetsPattern,'const EXPECTED=<ASSETS>;');
 assert.equal(canonical(actual),canonical(original),'Worker behavior must not change beyond version and asset hashes');
 const added=Object.keys(expected).filter(k=>!(k in sourceExpected)).sort();
 assert.deepEqual(added,['./preview.html','./qa-banner.css','./qa-build.json']);
 assert.deepEqual(Object.keys(sourceExpected).filter(k=>!(k in expected)),[]);
 for(const [asset,digest]of Object.entries(expected)){
  assert.ok(asset.startsWith('./')&&!asset.includes('..'),'Asset remains in QA scope');
  const file=path.join(qa,asset.endsWith('/')?asset+'index.html':asset);
  assert.equal(sha(await fs.readFile(file)),digest,'Correct generated hash for '+asset);
 }
 assert.equal(Object.keys(expected).length,88);
 return {cacheVersion:version,assets:Object.keys(expected).length,added,workerLogic:'byte-identical after removing version/hash data'};
});
await check('Offline builder differs only by the QA cache version',async()=>{
 const oldVersion=frozen('sw.js').match(/const VERSION="([^"]+)";/)[1];
 const actual=await fs.readFile(path.join(qa,'tools/build-offline.mjs'),'utf8');
 const restored=oneReplace(actual,version,oldVersion,'Offline-builder QA cache version');
 assert.equal(restored,frozen('tools/build-offline.mjs'));
 return {from:oldVersion,to:version,otherChanges:false};
});
await check('QA README names the precise source, rollback and limits without declaring release approval',async()=>{
 const readme=await fs.readFile(path.join(qa,'README.md'),'utf8');
 for(const value of [meta.sourceCommit,meta.previousQaCommit,meta.independentReviewCommit,version])assert.ok(readme.includes(value),'README provenance includes '+value);
 for(const wording of ['Isolated phone preview 4','TEST COPY — DEVELOPMENT PREVIEW','Public, unlisted','use synthetic notes','not a production release','Qualified review remains pending','PDF copy interoperability remains OPEN','Physical iPhone, Home Screen, VoiceOver and airplane-mode acceptance remain unperformed','Never delete device storage or reset production'])assert.ok(readme.includes(wording),'README retains '+wording);
 return {sha256:sha(readme),provenanceMatches:true,rollbackReferencePresent:true,limitsPresent:true};
});
await check('QA preview guide uses only the shipped update handler and existing local destinations',async()=>{
 const text=await fs.readFile(path.join(qa,'preview.html'),'utf8');
 assert.equal(text.split(banner('')).length-1,1);
 assert.ok(text.includes('<meta name="robots" content="noindex,nofollow">'));
 const scripts=[...text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);assert.equal(scripts[0][1].trim(),'src="js/pwa.js"');assert.equal(scripts[0][2],'');
 assert.ok(text.includes('id="check-update"'));assert.ok(text.includes('id="apply-update"'));
 for(const view of ['today','read','explore','saved'])assert.ok(text.includes('index.html?view='+view));
 const hrefs=[...text.matchAll(/\bhref="([^"]+)"/g)].map(m=>m[1]);
 for(const href of hrefs){
  const u=new URL(href,'https://qa.invalid/glp001-iphone-test/preview.html');
  assert.equal(u.origin,'https://qa.invalid');assert.ok(u.pathname.startsWith('/glp001-iphone-test/'));
  let relative=u.pathname.slice('/glp001-iphone-test/'.length);if(!relative||relative.endsWith('/'))relative+='index.html';
  await fs.access(path.join(qa,relative));
 }
 assert.equal((await fs.readFile(path.join(qa,'.nojekyll'))).length,0);
 return {script:'js/pwa.js',localLinks:hrefs.length,allFourEntrances:true,oneBanner:true,emptyPagesMarker:true};
});
report.finishedAtUtc=new Date().toISOString();
report.result=report.checks.every(c=>c.status==='PASS')?'PASS':'FAIL';
await fs.writeFile(path.join(out,'artifact-purpose-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,checks:report.checks},null,2));
if(report.result!=='PASS')process.exitCode=1;
