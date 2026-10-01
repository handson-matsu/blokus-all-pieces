'use strict';
const assert=require('node:assert/strict');
const url='https://script.google.com/macros/s/AKfycbxssCIHsD-N97SHxNC_GN0ihYeC0qy-lb-EY0KmSs6Gnztaph1sITMerLVEnNWOGkYc/exec?app=blokus-all-pieces';
async function installAccessProbe(page){
 // Abort every external request: tests never create real access records.
 await page.route(/^https?:/,route=>route.abort());
 await page.addInitScript(()=>{
  window.accessCalls=[];
  const originalFetch=window.fetch.bind(window);
  window.fetch=(url,options)=>{window.accessCalls.push({url,options});return originalFetch(url,options);};
 });
}
async function assertAccess(page,requests,loads){
 await page.waitForFunction(()=>window.accessCalls.length===1);
 assert.deepEqual(await page.evaluate(()=>window.accessCalls),[{url,options:{method:'GET',mode:'no-cors',cache:'no-store',credentials:'omit',keepalive:true}}]);
 assert.deepEqual(requests,Array(loads).fill(url));
}
module.exports={installAccessProbe,assertAccess};
