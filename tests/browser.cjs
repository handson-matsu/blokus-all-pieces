const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const os=require('node:os');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 for(const width of [320,390,1280]){
  const mobile=width<600,page=await browser.newPage({viewport:{width,height:1000},isMobile:mobile,hasTouch:mobile});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const press=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
  const cell=(x,y)=>`.cell[data-x="${x}"][data-y="${y}"]`;
  assert.equal(await page.locator('.cell').count(),400);assert.equal(await page.locator('.piece').count(),21);
  await press('.piece[data-id="1"]');assert.equal(await page.locator('.cell.legal').count(),1);
  await press(cell(1,1));assert.ok(await page.locator('#place').isDisabled());
  await press(cell(0,0));assert.equal(await page.locator('.preview-ok').count(),1);assert.match(await page.locator('#progress').textContent(),/^0/);
  await press('#place');assert.match(await page.locator('#progress').textContent(),/^1 \/ 84/);assert.ok(await page.locator('.piece[data-id="1"]').isDisabled());
  await press('.piece[data-id="2"]');await press(cell(1,0));assert.ok(await page.locator('#place').isDisabled());assert.match(await page.locator('#message').textContent(),/辺/);
  await press('#down');assert.ok(await page.locator('#place').isEnabled());await press('#place');assert.match(await page.locator('#progress').textContent(),/^2/);
  await press('#undo');assert.match(await page.locator('#progress').textContent(),/^1/);assert.ok(await page.locator('.piece[data-id="2"]').isEnabled());
  await press('#right');await press('#flip');await press('#left');
  await page.getByRole('button',{name:'黄、配置済み0、残り21',exact:true})[mobile?'tap':'click']();
  await press('.piece[data-id="1"]');await press(cell(19,0));await press('#place');
  await page.getByRole('button',{name:'赤、配置済み0、残り21',exact:true})[mobile?'tap':'click']();
  await press('.piece[data-id="1"]');await press(cell(19,19));await press('#place');
  await page.getByRole('button',{name:'緑、配置済み0、残り21',exact:true})[mobile?'tap':'click']();
  await press('.piece[data-id="1"]');await press(cell(0,19));await press('#place');
  assert.match(await page.locator('#progress').textContent(),/^4/);assert.match(await page.locator('#remaining').textContent(),/80/);
  await press('#undo');assert.match(await page.locator('#piece-title').textContent(),/緑/);
  page.once('dialog',d=>d.dismiss());await press('#restart');assert.match(await page.locator('#progress').textContent(),/^3/);
  page.once('dialog',d=>d.accept());await press('#restart');assert.match(await page.locator('#progress').textContent(),/^0/);assert.ok(await page.locator('#undo').isDisabled());
  // Verify mixed-color edge placement through the actual UI and restore preview colors.
  await page.evaluate(()=>{placed=[{color:'blue',id:'1',cells:[[3,3]]},{color:'yellow',id:'1',cells:[[5,3]]}];render();});
  await press('.piece[data-id="2"]');await press(cell(4,4));assert.ok(await page.locator('#place').isEnabled());await press('#place');assert.match(await page.locator('#progress').textContent(),/^3/);
  await press('.piece[data-id="I3"]');await press(cell(5,3));assert.ok(await page.locator('#place').isDisabled());await press(cell(10,10));
  assert.equal(await page.locator(cell(5,3)).evaluate(e=>e.style.getPropertyValue('--piece-color')),'#e6b932');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.equal(await page.locator('#clear').isVisible(),false);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  await page.screenshot({path:path.join(os.tmpdir(),`blokus-all-pieces-${width}.png`),fullPage:true});await page.close();
 }
 console.log('PASS: 320/390/1280px, tap/click, preview/confirm, nudge, rotate/flip, 4 colors, contact rules, undo/reset, no overflow or network');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
