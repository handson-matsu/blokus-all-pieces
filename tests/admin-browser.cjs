'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const os=require('node:os');
const solution=require('../solution.js');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 for(const width of [390,1280]){
  const mobile=width<600,page=await browser.newPage({viewport:{width,height:900},isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const press=async selector=>page.locator(selector)[mobile?'tap':'click']();
  const taps=async n=>{for(let i=0;i<n;i++)await press('#game-title');};
  const state=()=>page.evaluate(()=>({placed,activeColor,selected,shape,anchor,message:$('message').textContent,error:$('message').className,progress:$('progress').textContent,remaining:$('remaining').textContent,board:boardCells.map(c=>({class:c.className,style:c.style.cssText,label:c.getAttribute('aria-label')}))}));
  assert.ok(await page.locator('#admin-tools').isHidden());
  await taps(4);assert.ok(await page.locator('#admin-tools').isHidden());
  await page.waitForTimeout(2050);await taps(1);assert.ok(await page.locator('#admin-tools').isHidden(),'expired taps do not enable');
  await taps(4);assert.ok(await page.locator('#show-answer').isVisible());
  await press('.piece[data-id="1"]');await press('.cell[data-x="0"][data-y="0"]');await press('#place');
  await press('.piece[data-id="L3"]');await press('#right');await press('#flip');await press('.cell[data-x="1"][data-y="0"]');
  // Invalid preview and error message must also be restored.
  const before=await state();await press('#show-answer');
  assert.ok(await page.locator('#clear').isHidden());assert.match(await page.locator('#progress').textContent(),/84 \/ 84 解答表示/);
  assert.equal(await page.locator('.occupied').count(),356);assert.equal(await page.locator('.preview-ok,.preview-no,.legal').count(),0);
  const drawn=await page.locator('.occupied').evaluateAll(cells=>cells.map(c=>[Number(c.dataset.x),Number(c.dataset.y),c.style.getPropertyValue('--piece-color'),c.getAttribute('aria-label')]));
  const expected=new Map(solution.flatMap(p=>p.cells.map(([x,y])=>[`${x},${y}`,p])));
  for(const [x,y,color,label] of drawn){const p=expected.get(`${x},${y}`);assert.ok(p);assert.match(label,new RegExp(` ${p.id} 配置済み`));assert.equal(color,{blue:'#327ac1',yellow:'#e6b932',red:'#d65b56',green:'#41966d'}[p.color]);}
  for(const selector of ['.cell','.color-button','.piece','#left','#right','#flip','#up','#west','#down','#east','#place','#undo','#restart'])assert.ok(await page.locator(selector).evaluateAll(es=>es.every(e=>e.disabled)),selector);
  // Programmatic handler calls cannot bypass the viewing guard either.
  await page.evaluate(()=>{selectPiece('2');chooseAnchor(5,5);orient(E.flip);$('undo').onclick();$('restart').onclick();$('place').onclick();$('east').onclick();});
  assert.deepEqual(await page.evaluate(()=>({placed,activeColor,selected,shape,anchor})),(({placed,activeColor,selected,shape,anchor})=>({placed,activeColor,selected,shape,anchor}))(before));
  await page.screenshot({path:path.join(os.tmpdir(),`blokus-answer-${width}.png`),fullPage:true});
  await press('#close-answer');assert.deepEqual(await state(),before,'close restores entire play state and preview');
  await press('#show-answer');await taps(5);assert.ok(await page.locator('#admin-tools').isHidden());assert.deepEqual(await state(),before,'turning off also restores');
  await press('#undo');assert.equal(await page.evaluate(()=>placed.length),0,'undo history is intact');
  await taps(5);await press('#show-answer');await page.reload();assert.ok(await page.locator('#admin-tools').isHidden());assert.equal(await page.locator('.occupied').count(),0);
  if(!mobile){
   // Replay all 84 placements through the normal selection/rotation/confirm path.
   const replay=await page.evaluate(steps=>{
    for(const p of steps){
     activeColor=p.color;selectPiece(p.id);
     const target=E.key(p.cells);let found=false;
     for(let f=0;f<2&&!found;f++){
      for(let r=0;r<4;r++){if(E.key(shape)===target){found=true;break;}orient(E.rotate);}
      if(!found)orient(E.flip);
     }
     if(!found)throw Error('orientation not found');
     const first=[...p.cells].sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0];chooseAnchor(...first);
     if($('place').disabled)throw Error('normal UI rejected solution');$('place').onclick();
    }
    return {count:placed.length,clear:!$('clear').hidden};
   },solution);
   assert.deepEqual(replay,{count:84,clear:true});
   await press('#undo');assert.equal(await page.evaluate(()=>placed.length),83);assert.ok(await page.locator('#clear').isHidden());
  }
  // A genuinely completed normal game remains completed after closing the viewer.
  await page.evaluate(steps=>{placed=steps;render();say('クリア！ 全84ピースを正しく置けました。');},solution);
  assert.ok(await page.locator('#clear').isVisible());const completed=await state();
  await taps(5);await press('#show-answer');assert.ok(await page.locator('#clear').isHidden());await press('#close-answer');assert.ok(await page.locator('#clear').isVisible());assert.deepEqual(await state(),completed);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: desktop/mobile hidden mode, five taps/timeout, 356-cell exact answer, disabled operations, no false clear, full state/undo restoration, reload OFF');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
