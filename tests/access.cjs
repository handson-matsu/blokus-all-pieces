'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {assertAccess}=require('./access-probe.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  for(const mode of ['throw','reject','pending']){
   const page=await browser.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(/^https?:/,r=>r.abort());
   await page.addInitScript(mode=>{
    window.accessCalls=[];
    window.fetch=(url,options)=>{
     window.accessCalls.push({url,options});
     if(mode==='throw')throw new Error('synchronous failure');
     if(mode==='reject')return Promise.reject(new Error('offline'));
     return new Promise(()=>{});
    };
   },mode);
   await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
   const initial=await page.locator('#message').textContent();
   assert.equal(initial,'使う色とピースを選び、それぞれの ★ から始めましょう。');
   await page.locator('.piece[data-id="1"]').click();
   await page.locator('.cell[data-x="0"][data-y="0"]').click();
   await page.locator('#place').click();
   assert.equal(await page.locator('#progress').textContent(),'1 / 84 配置');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#progress').textContent(),'0 / 84 配置');
   const requests=await page.evaluate(()=>accessCalls.map(c=>c.url));
   await assertAccess(page,requests,1);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: synchronous failure, rejected fetch and pending fetch never block play, display errors or retry');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
