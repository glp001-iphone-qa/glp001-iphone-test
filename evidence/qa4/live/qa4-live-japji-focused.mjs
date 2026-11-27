// Focused fresh-context recheck of the incorrect Japji selector in live run 1.
// No application mutation; compare every rendered occurrence against frozen source bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='/tmp/glp001-iphoneqa-20261126',out=path.join(base,'qa4-verification/live',new Date().toISOString().replace(/[:.]/g,'-'));
const require=createRequire(path.join(base,'source/tests/review-repairs-browser.mjs'));
const {chromium}=require('playwright');
const url='https://glp001-iphone-qa.github.io/glp001-iphone-test/full-japji.html';
const report={schema:'glp.qa4-live-japji-focused.v1',startedAtUtc:new Date().toISOString(),url,
 deploymentCommit:'63780b0a15c56a974c9dafd41d3308c0b82c1bf7',sourceCommit:'389e79baff4016a2ff61d1851908de0bd66beb8f',
 purpose:'Resolve initial unsupported .gurbani-line selector using declared rendered article.scripture-line elements',
 runtimeErrors:[],externalRequests:[],limitations:['Fresh headless desktop Chrome; not physical iPhone/Safari/VoiceOver acceptance.','No private data or source mutation.','Original failing run remains retained.']};
let browser,context;
await fs.mkdir(out,{recursive:true});
try{
 const bytes=await fs.readFile(path.join(base,'qa4-reviewed/js/japji-full-data.js'));
 report.localSourceSHA256=createHash('sha256').update(bytes).digest('hex');
 assert.equal(report.localSourceSHA256,'7f5f78ac33da1a944e14c3d2b901926686df7e520e6fe681f6a28802d85e9808');
 const source={window:{}};vm.runInNewContext(bytes.toString('utf8'),source,{timeout:3000});
 const expected=JSON.parse(JSON.stringify(source.window.GLP_FULL_JAPJI.units.flatMap(u=>u.lines.map(l=>({id:l.id,text:l.text})))));
 assert.equal(expected.length,385);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-background-networking']});
 report.browser=browser.version();context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
 context.on('request',request=>{const u=new URL(request.url());if(/^https?:$/.test(u.protocol)&&u.origin!==new URL(url).origin)report.externalRequests.push(u.origin+u.pathname);});
 const page=await context.newPage();page.on('pageerror',e=>report.runtimeErrors.push(e.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.GLP_CONTINUOUS_DEBUG?.lineCount===385,null,{timeout:30000});
 assert.equal(await page.locator('#continuous-reader').getAttribute('data-source-integrity'),'verified');
 const actual=await page.locator('#continuous-reader article.scripture-line').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.occurrence,text:n.querySelector('.tuk')?.textContent})));
 report.originalUnsupportedSelectorCount=await page.locator('#continuous-reader .gurbani-line').count();
 report.declaredSelectorCount=actual.length;
 assert.deepEqual(actual,expected);
 assert.equal(await page.locator('#continuous-reader article.scripture-line').first().isVisible(),true);
 assert.match(await page.locator('#glp-qa-build').innerText(),/389e79b.*Preview 4/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=391));
 assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.externalRequests,[]);
 report.allRenderedOccurrenceIdsAndTextsMatch=true;
 report.orderedOccurrenceSHA256=createHash('sha256').update(JSON.stringify(actual)).digest('hex');
 await page.screenshot({path:path.join(out,'live-japji-390.png')});
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e.stack||String(e);}
finally{
 if(context)await context.close();if(browser)await browser.close();
 report.finishedAtUtc=new Date().toISOString();
 await fs.writeFile(path.join(out,'live-japji-focused.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,report:path.join(out,'live-japji-focused.json'),...report},null,2));
 if(report.result!=='PASS')process.exitCode=1;
}
