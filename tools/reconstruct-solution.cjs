'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const {verify}=require('./verify-solution.cjs');
const equal=(a,b)=>a[0]===b[0]&&a[1]===b[1];
function reconstruct(reference){
 const rows=reference.rows,width=20,height=18;
 assert.equal(rows.length,height);assert.ok(rows.every(row=>row.length===width&&/^[YBRG.]+$/.test(row)));
 // Assign colors by source corners, keeping the full 20-column width.
 const colorMap={[rows[0][0]]:'blue',[rows[0][19]]:'yellow',[rows[17][19]]:'red',[rows[17][0]]:'green'};
 assert.equal(Object.keys(colorMap).length,4);assert.ok(!colorMap['.']);
 const seen=new Set(),original=[];
 const key=(x,y)=>`${x},${y}`;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(rows[y][x]==='.'||seen.has(key(x,y)))continue;
  const cells=[[x,y]],color=rows[y][x];seen.add(key(x,y));
  for(let k=0;k<cells.length;k++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const xx=cells[k][0]+dx,yy=cells[k][1]+dy;
   if(xx<0||xx>=width||yy<0||yy>=height||seen.has(key(xx,yy))||rows[yy][xx]!==color)continue;
   cells.push([xx,yy]);seen.add(key(xx,yy));
  }
  const matches=Object.values(E.pieces).filter(p=>E.variants(p.cells).some(v=>E.key(v)===E.key(cells)));
  assert.equal(matches.length,1,'each orthogonal color component must be one known piece');
  original.push({color:colorMap[color],id:matches[0].id,cells});
 }
 assert.equal(original.length,84);
 for(const color of Object.keys(E.colors))assert.deepEqual(original.filter(p=>p.color===color).map(p=>p.id).sort(),Object.keys(E.pieces).sort());
 const placements=id=>E.variants(E.pieces[id].cells).flatMap(shape=>{
  const result=[];for(let y=0;y<20;y++)for(let x=0;x<20;x++){
   const cells=E.position(shape,x,y);if(cells.every(([xx,yy])=>xx>=0&&xx<20&&yy>=0&&yy<20))result.push(cells);
  }return result;
 });
 const long=placements('I5'),short=placements('I3');
 let pieces=original.slice();const adjustments=[];
 // In the published arrangement, each bottom corner is an I3. Search an I5
 // that reaches the actual 20x20 corner, then an I3 within the vacated I5 slot.
 // No candidate is accepted without the runtime rules; final connectivity is
 // checked by replay and the independent verifier below.
 for(const color of ['green','red']){
  const oldLong=pieces.find(p=>p.color===color&&p.id==='I5');
  const fixed=pieces.filter(p=>p.color!==color||!['I3','I5'].includes(p.id));
  let repair=null;
  for(const cells of long){
   if(!cells.some(c=>equal(c,E.colors[color].start))||!E.check(fixed,color,'I5',cells).ok)continue;
   const first={color,id:'I5',cells};
   for(const small of short){
    if(!small.every(c=>oldLong.cells.some(o=>equal(c,o)))||!E.check([...fixed,first],color,'I3',small).ok)continue;
    repair=[first,{color,id:'I3',cells:small}];break;
   }
   if(repair)break;
  }
  assert.ok(repair,`${color}: local corner adjustment found`);
  for(const p of repair)adjustments.push({color,id:p.id,before:pieces.find(q=>q.color===color&&q.id===p.id).cells,after:p.cells});
  pieces=[...fixed,...repair];
 }
 const steps=[];
 while(pieces.length){
  const index=pieces.findIndex(p=>E.check(steps,p.color,p.id,p.cells).ok);
  assert.ok(index>=0,'all pieces playable from the actual four corners');steps.push(pieces.splice(index,1)[0]);
 }
 const verification=verify(steps);
 return {method:'Automatic image-grid reconstruction and exhaustive local I3/I5 corner adjustment; independent verification and runtime replay',source:reference.page,image:reference.image,sourceImageSha256:reference.sha256,colorMap,adjustments,verification,steps};
}
if(require.main===module){
 const result=reconstruct(require('../analysis/reference-grid.json'));
 fs.writeFileSync(path.join(__dirname,'../analysis/solution.json'),JSON.stringify(result,null,2)+'\n');
 console.log('Reconstructed and verified:',result.verification);
}
module.exports={reconstruct};
