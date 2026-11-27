import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from '/tmp/glp001-iphoneqa-20261126/source/node_modules/playwright/index.mjs';
const out=path.dirname(fileURLToPath(import.meta.url)),origin='https://glp001-iphone-qa.github.io',rootURL=origin+'/glp001-iphone-test/';
const http=JSON.parse(await fs.readFile(path.join(out,'http-record.json'),'utf8'));
const report={startedAtUtc:new Date().toISOString(),checks:[],limitations:['Fresh nonpersistent desktop Chrome contexts with service workers blocked; no real user profile, notes or saved state.','390px is an emulated viewport, not a physical phone test.','This is a read-only public-live inspection; nothing was deployed or modified.']};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.environment={node:process.version,browser:browser.version(),platform:process.platform};
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[],failedRequests=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  try{
   const response=await page.goto(rootURL,{waitUntil:'networkidle'}),body=await response.body();
   await page.locator('[data-view-panel="today"]:not([hidden])').waitFor({state:'visible'});
   const build=page.locator('#glp-qa-build'),label=await build.innerText();
   assert.match(label,/Preview 4/);assert.equal(await build.isVisible(),true);
   const navigation=[];
   for(const view of ['today','read','explore','saved']){
    const link=page.locator('nav[aria-label="Library"] a[data-view="'+view+'"]');
    assert.equal(await link.isVisible(),true);
    navigation.push({view,text:await link.innerText(),href:await link.getAttribute('href'),box:await link.boundingBox()});
   }
   await fs.writeFile(path.join(out,'root-dom-'+width+'.html'),await page.content());
   await fs.writeFile(path.join(out,'root-text-'+width+'.txt'),await page.locator('body').innerText());
   await page.screenshot({path:path.join(out,'root-today-'+width+'.png'),fullPage:true});
   const result={name:width+'px fresh live root',status:'PASS',url:page.url(),httpStatus:response.status(),responseSha256:createHash('sha256').update(body).digest('hex'),matchesFrozenQA4:body.equals(await fs.readFile(path.join(out,'root-qa4-frozen.html'))),buildLabel:label,buildVisible:true,buildBox:await build.boundingBox(),navigation,entrances:[]};
   for(const view of ['read','explore','saved','today']){
    await page.locator('nav[aria-label="Library"] a[data-view="'+view+'"]').click();
    const panel=page.locator('[data-view-panel="'+view+'"]:not([hidden])');await panel.waitFor({state:'visible'});
    assert.equal(await page.locator('nav[aria-label="Library"] a[data-view="'+view+'"]').getAttribute('aria-current'),'page');
    result.entrances.push({view,url:page.url(),heading:await panel.locator('[data-view-heading]').innerText(),visible:true});
   }
   result.localStorageAfterReadOnlyNavigation=await page.evaluate(()=>Object.keys(localStorage));
   result.errors=errors;result.failedRequests=failedRequests;assert.deepEqual(errors,[]);
   report.checks.push(result);
   const previewResponse=await page.goto(rootURL+'preview.html',{waitUntil:'networkidle'}),previewBody=await previewResponse.body(),previewText=await page.locator('body').innerText();
   assert.match(previewText,/Preview 4/);
   await fs.writeFile(path.join(out,'preview-text-'+width+'.txt'),previewText);
   await fs.writeFile(path.join(out,'preview-dom-'+width+'.html'),await page.content());
   await page.screenshot({path:path.join(out,'preview-'+width+'.png'),fullPage:true});
   report.checks.push({name:width+'px live preview guide',status:'PASS',url:page.url(),httpStatus:previewResponse.status(),responseSha256:createHash('sha256').update(previewBody).digest('hex'),matchesFrozenQA4:previewBody.equals(await fs.readFile(path.join(out,'preview-qa4-frozen.html'))),containsPreview4:true});
  }catch(error){report.checks.push({name:width+'px live inspection',status:'FAIL',error:error.stack||String(error),errors,failedRequests});await fs.writeFile(path.join(out,'failure-dom-'+width+'.html'),await page.content());await page.screenshot({path:path.join(out,'failure-'+width+'.png'),fullPage:true});}
  finally{await context.close();}
 }
}finally{
 await browser.close();report.completedAtUtc=new Date().toISOString();report.status=report.checks.some(c=>c.status!=='PASS')?'FAIL':'PASS';
 await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
 if(report.status!=='PASS')process.exitCode=1;
}
