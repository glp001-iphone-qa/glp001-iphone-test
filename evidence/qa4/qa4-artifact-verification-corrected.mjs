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
  if(!tracked.has(file)||file.endsWith('.html')||file.endsWith('.md')||file==='manifest.webmanifest'||file==='sw.js')continue;
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
report.finishedAtUtc=new Date().toISOString();
report.result=report.checks.every(c=>c.status==='PASS')?'PASS':'FAIL';
await fs.writeFile(path.join(out,'artifact-verification-corrected.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:report.result,checks:report.checks},null,2));
if(report.result!=='PASS')process.exitCode=1;
