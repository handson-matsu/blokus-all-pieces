'use strict';
const E=PuzzleEngine,$=id=>document.getElementById(id);
let placed=[],activeColor='blue',selected=null,shape=null,anchor=null;
let adminMode=false,answerVisible=false,titleTaps=[],savedView=null,previewPoint=null;
const boardCells=[];
function say(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function miniature(cells){
 const mini=document.createElement('span');mini.className='mini';mini.setAttribute('aria-hidden','true');
 mini.style.setProperty('--w',Math.max(...cells.map(c=>c[0]))+1);mini.style.setProperty('--h',Math.max(...cells.map(c=>c[1]))+1);
 cells.forEach(([x,y],i)=>{const cell=document.createElement('span');cell.className='mini-cell';cell.style.gridColumn=x+1;cell.style.gridRow=y+1;cell.textContent=i===0?'●':'';mini.append(cell);});return mini;
}
function resetSelection(){selected=null;shape=null;anchor=null;}
function selectPiece(id){if(answerVisible)return;selected=id;shape=E.pieces[id].cells.map(c=>[...c]);anchor=null;render();say('盤面をタップして ● の位置を選び、「ここに置く」で確定します。');}
function candidate(){return !answerVisible&&anchor&&selected?E.check(placed,activeColor,selected,E.position(shape,...anchor)):null;}
function drawPreview(point){
 boardCells.forEach(c=>{c.classList.remove('preview-ok','preview-no','anchor');c.style.setProperty('--piece-color',c.dataset.baseColor);});
 if(answerVisible)return;
 previewPoint=point?[...point]:null;
 if(!selected||!point)return;
 const cells=E.position(shape,...point),valid=E.check(placed,activeColor,selected,cells).ok;
 for(const [x,y] of cells)if(x>=0&&y>=0&&x<20&&y<20){const cell=boardCells[y*20+x];cell.classList.add(valid?'preview-ok':'preview-no');cell.style.setProperty('--piece-color',E.colors[activeColor].hex);}
 boardCells[point[1]*20+point[0]].classList.add('anchor');
}
function updateCandidate(){
 const result=candidate();$('place').disabled=!result?.ok;
 for(const id of ['up','west','down','east'])$(id).disabled=answerVisible||!anchor;
 drawPreview(anchor);
 if(result)say(result.ok?'この位置に置けます。「ここに置く」で確定してください。':result.reason,!result.ok);
}
function chooseAnchor(x,y){if(answerVisible)return;if(!selected){say('使う色と、未使用のピースを選びましょう。');return;}anchor=[x,y];updateCandidate();}
function render(){
 const displayed=answerVisible?VERIFIED_SOLUTION:placed;
 syncAdminTools();
 $('progress').textContent=`${displayed.length} / 84 ${answerVisible?'解答表示':'配置'}`;$('remaining').textContent=`残り ${84-displayed.length} ピース`;
 $('colors').replaceChildren();
 for(const [color,info] of Object.entries(E.colors)){
  const count=displayed.filter(p=>p.color===color).length,button=document.createElement('button');button.className='color-button';button.disabled=answerVisible;button.style.setProperty('--piece-color',info.hex);button.setAttribute('aria-pressed',String(color===activeColor));button.setAttribute('aria-label',`${info.name}、配置済み${count}、残り${21-count}`);button.append(info.name);const label=document.createElement('span');label.textContent=`${count}/21・残り${21-count}`;button.append(label);button.onclick=()=>{if(answerVisible)return;activeColor=color;resetSelection();render();say(`${info.name}の未使用ピースを選びましょう。`);};$('colors').append(button);
 }
 const occupied=new Map(displayed.flatMap((p,i)=>p.cells.map(([x,y])=>[`${x},${y}`,{...p,index:i}])));
 boardCells.forEach((cell,i)=>{
  const x=i%20,y=Math.floor(i/20),p=occupied.get(`${x},${y}`),start=Object.entries(E.colors).find(([,c])=>c.start[0]===x&&c.start[1]===y);
  cell.className='cell';cell.disabled=answerVisible;cell.style.cssText='';cell.textContent=start?'★':'';
  if(start){cell.classList.add('start');cell.style.setProperty('--piece-color',start[1].hex);}
  if(p){cell.classList.add('occupied');cell.style.setProperty('--piece-color',E.colors[p.color].hex);
   for(const [side,dx,dy] of [['Top',0,-1],['Right',1,0],['Bottom',0,1],['Left',-1,0]])if(occupied.get(`${x+dx},${y+dy}`)?.index!==p.index)cell.style[`border${side}Width`]='1px';
  }
  cell.dataset.baseColor=cell.style.getPropertyValue('--piece-color')||'#658b6c';
  const valid=!answerVisible&&selected&&E.check(placed,activeColor,selected,E.position(shape,x,y)).ok;
  if(valid)cell.classList.add('legal');
  cell.setAttribute('aria-label',`${y+1}行 ${x+1}列${start?` ${start[1].name}のスタート`:''}${p?` ${E.colors[p.color].name} ${p.id} 配置済み`:valid?' 配置できます':''}`);
 });
 const count=displayed.filter(p=>p.color===activeColor).length;
 $('piece-title').textContent=`${E.colors[activeColor].name}のピース`;$('color-count').textContent=`配置済み ${count}・残り ${21-count}`;
 $('selected-preview').replaceChildren();$('selected-preview').style.setProperty('--piece-color',E.colors[activeColor].hex);
 if(selected&&!answerVisible)$('selected-preview').append(miniature(shape));
 $('selection-label').textContent=answerVisible?'検証済みの解答を表示中':selected?`${E.colors[activeColor].name} ${selected}・${shape.length}マス`:count===21?'この色はすべて配置済みです':'ピースを選びましょう';
 $('pieces').replaceChildren();
 for(const [id,p] of Object.entries(E.pieces)){
  const used=displayed.some(t=>t.color===activeColor&&t.id===id),button=document.createElement('button');button.className='piece';button.dataset.id=id;button.style.setProperty('--piece-color',E.colors[activeColor].hex);button.disabled=answerVisible||used;button.setAttribute('aria-pressed',String(!answerVisible&&id===selected));button.setAttribute('aria-label',`${E.colors[activeColor].name} ${id}、${p.cells.length}マス、${used?'配置済み':'未使用'}`);button.append(miniature(!answerVisible&&id===selected?shape:p.cells));const label=document.createElement('span');label.className='piece-name';label.textContent=`${used?'✓ ':''}${id}`;button.append(label);button.onclick=()=>selectPiece(id);$('pieces').append(button);
 }
 for(const id of ['left','right','flip'])$(id).disabled=answerVisible||!selected;
 $('undo').disabled=answerVisible||!placed.length;$('restart').disabled=answerVisible||!placed.length;$('clear').hidden=answerVisible||!E.isComplete(placed);updateCandidate();
}
for(let y=0;y<20;y++)for(let x=0;x<20;x++){
 const cell=document.createElement('button');cell.type='button';cell.className='cell';cell.dataset.x=x;cell.dataset.y=y;
 cell.onclick=()=>chooseAnchor(x,y);cell.onpointerenter=e=>{if(e.pointerType==='mouse'&&!anchor)drawPreview([x,y]);};cell.onfocus=()=>{if(!anchor)drawPreview([x,y]);};
 cell.onkeydown=e=>{if(answerVisible)return;const moves={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(moves[e.key]){e.preventDefault();const [dx,dy]=moves[e.key];boardCells[Math.max(0,Math.min(19,y+dy))*20+Math.max(0,Math.min(19,x+dx))].focus();}};
 boardCells.push(cell);$('board').append(cell);
}
$('board').onpointerleave=()=>drawPreview(anchor);
function orient(fn){if(answerVisible||!selected)return;shape=fn(shape);render();if(!anchor)say('向きを変えました。● の位置を確認してください。');}
$('left').onclick=()=>orient(c=>E.rotate(c,-1));$('right').onclick=()=>orient(E.rotate);$('flip').onclick=()=>orient(E.flip);
for(const [id,dx,dy] of [['up',0,-1],['west',-1,0],['down',0,1],['east',1,0]])$(id).onclick=()=>{if(!answerVisible&&anchor){anchor=[Math.max(0,Math.min(19,anchor[0]+dx)),Math.max(0,Math.min(19,anchor[1]+dy))];updateCandidate();}};
$('place').onclick=()=>{if(!candidate()?.ok)return;placed.push({color:activeColor,id:selected,cells:E.position(shape,...anchor)});resetSelection();render();say(E.isComplete(placed)?'クリア！ 全84ピースを正しく置けました。':'置けました。次の色・ピースを選びましょう。');};
$('undo').onclick=()=>{if(answerVisible)return;const last=placed.pop();if(!last)return;activeColor=last.color;selected=last.id;shape=E.normalize(last.cells);anchor=null;render();say('1手戻しました。戻したピースを選択しています。');};
$('restart').onclick=()=>{if(!answerVisible&&placed.length&&confirm('すべての配置をリセットして最初からやり直しますか？')){placed=[];activeColor='blue';resetSelection();render();say('青・黄・赤・緑、好きな色から始めましょう。');}};
function syncAdminTools(){
 $('admin-tools').hidden=!adminMode;$('show-answer').hidden=answerVisible;$('close-answer').hidden=!answerVisible;
}
function closeAnswer(){
 if(!answerVisible)return;
 answerVisible=false;render();
 drawPreview(savedView.preview);say(savedView.message,savedView.error);savedView=null;
}
// Hidden convenience mode, matching blokus-puzzle; not authentication.
$('game-title').addEventListener('click',()=>{
 const now=performance.now();titleTaps=titleTaps.filter(t=>now-t<=2000);titleTaps.push(now);
 if(titleTaps.length<5)return;
 titleTaps=[];adminMode=!adminMode;
 if(!adminMode&&answerVisible)closeAnswer();else syncAdminTools();
});
$('show-answer').onclick=()=>{
 if(!adminMode||answerVisible)return;
 savedView={message:$('message').textContent,error:$('message').classList.contains('error'),preview:previewPoint?[...previewPoint]:null};
 answerVisible=true;render();say('管理者用：検証済みの84ピースの解答です。「解答を閉じる」でプレイに戻ります。');$('close-answer').focus();
};
$('close-answer').onclick=()=>{closeAnswer();$('show-answer').focus();};
render();say('使う色とピースを選び、それぞれの ★ から始めましょう。');

// Record one visit per page load without waiting for the response or retrying.
try {
  fetch('https://script.google.com/macros/s/AKfycbxssCIHsD-N97SHxNC_GN0ihYeC0qy-lb-EY0KmSs6Gnztaph1sITMerLVEnNWOGkYc/exec?app=blokus-all-pieces', {
    method: 'GET',
    mode: 'no-cors',
    cache: 'no-store',
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
} catch {
  // Access logging must never interrupt the game.
}
