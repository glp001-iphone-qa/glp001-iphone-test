import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const root='/tmp/glp001-iphoneqa-20261126';
const require=createRequire(path.join(root,'source/tests/review-repairs-browser.mjs'));
const {chromium}=require('playwright');
const out=path.join(root,'builder-crosscheck/qa3-evidence');
const base='https://glp001-iphone-qa.github.io/glp001-iphone-test/';
const report={startedAtUtc:new Date().toISOString(),url:base,scope:'Fresh desktop Chrome against actual GitHub Pages; no physical-device claim',checks:[],runtimeErrors:[]};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
const page=await context.newPage();
page.setDefaultTimeout(45000);
page.on('pageerror',e=>report.runtimeErrors.push(e.message));
try{
  report.browser=browser.version();
  for(const [name,relative] of [['Preview guide','preview.html'],['Library home',''],['Japji reader','full-japji.html'],['Topic index','articles/index.html'],['Haumai source sheet','articles/article.html?id=haumai-source-sheet']]){
    const response=await page.goto(base+relative,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200,name);
    await page.waitForFunction(()=>document.querySelector('#glp-qa-build')?.textContent.includes('acfeb0a'));
    if(relative==='preview.html'){
      await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
      const names=await page.evaluate(()=>caches.keys());
      assert.ok(names.some(x=>x.endsWith('iphone-qa3-acfeb0a-20261126')));
      await page.screenshot({path:path.join(out,'live-preview-390.png')});
    }
    if(relative==='full-japji.html'){
      await page.waitForFunction(()=>window.GLP_CONTINUOUS_DEBUG?.lineCount===385);
      assert.equal(await page.locator('#continuous-reader').getAttribute('data-source-integrity'),'verified');
    }
    if(relative.startsWith('articles/')){
      await page.waitForSelector('html[data-source-state="ready"]');
      if(relative.includes('article.html'))assert.equal(await page.locator('.source-line[data-line-id]').count(),2);
    }
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(width<=390,name+' must fit the viewport');
    report.checks.push({name,status:'PASS',servedFrom:base+relative,buildLabel:await page.locator('#glp-qa-build').innerText()});
  }
  assert.deepEqual(report.runtimeErrors,[]);
  report.result='PASS';
}catch(e){report.result='FAIL';report.error=e.stack;process.exitCode=1;}
finally{
  report.finishedAtUtc=new Date().toISOString();
  await fs.writeFile(path.join(out,'live-browser.json'),JSON.stringify(report,null,2)+'\n');
  await context.close();await browser.close();
  console.log(JSON.stringify(report,null,2));
}
