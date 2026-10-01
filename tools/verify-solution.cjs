'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const key=([x,y])=>`${x},${y}`;
// Independent geometry canonicalization, without using the engine's transforms.
function signature(cells){
 const forms=[];
 for(const swap of [false,true])for(const sx of [-1,1])for(const sy of [-1,1]){
  const transformed=cells.map(([x,y])=>swap?[sx*y,sy*x]:[sx*x,sy*y]);
  const minX=Math.min(...transformed.map(c=>c[0])),minY=Math.min(...transformed.map(c=>c[1]));
  forms.push(transformed.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(key).join(';'));
 }
 return forms.sort()[0];
}
function verify(steps){
 assert.equal(E.size,20);assert.equal(E.total,84);
 assert.equal(steps.length,84,'exactly 84 pieces');
 const inventory=new Set(),occupied=new Map();
 const graph=steps.map(()=>new Set());let otherEdges=0,otherCorners=0;
 for(const [i,p] of steps.entries()){
  assert.ok(Object.hasOwn(E.colors,p.color),'known color');assert.ok(Object.hasOwn(E.pieces,p.id),'known piece');
  const pair=`${p.color}/${p.id}`;assert.ok(!inventory.has(pair),'unique color/piece');inventory.add(pair);
  assert.equal(p.cells.length,E.pieces[p.id].cells.length,'piece area');
  for(const cell of p.cells){
   assert.ok(Array.isArray(cell)&&cell.length===2&&cell.every(Number.isInteger),'integer coordinates');
   const [x,y]=cell;assert.ok(x>=0&&x<20&&y>=0&&y<20,'inside board');
   assert.ok(!occupied.has(key(cell)),'no overlap');occupied.set(key(cell),i);
  }
  assert.equal(signature(p.cells),signature(E.pieces[p.id].cells),'correct shape up to rotation/reflection');
 }
 assert.equal(occupied.size,356,'all piece squares');
 for(const [i,p] of steps.entries())for(const [x,y] of p.cells){
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const j=occupied.get(key([x+dx,y+dy]));if(j===undefined||i===j)continue;
   const edge=dx===0||dy===0;
   if(p.color===steps[j].color){assert.ok(!edge,'no same-color piece edges');graph[i].add(j);}
   else if(edge)otherEdges++;else otherCorners++;
  }
 }
 for(const [color,info] of Object.entries(E.colors)){
  const indices=steps.flatMap((p,i)=>p.color===color?[i]:[]);assert.equal(indices.length,21,`${color}: 21 pieces`);
  for(const id of Object.keys(E.pieces))assert.ok(inventory.has(`${color}/${id}`),'every kind present');
  const first=indices[0];assert.ok(steps[first].cells.some(c=>key(c)===key(info.start)),`${color}: first piece covers its corner`);
  const reached=new Set([first]),queue=[first];
  for(let k=0;k<queue.length;k++)for(const next of graph[queue[k]])if(!reached.has(next)){reached.add(next);queue.push(next);}
  assert.equal(reached.size,21,`${color}: entire corner graph connected to start`);
 }
 // Replay the saved order with the exact runtime checker, not the solver model.
 const previous=[];
 for(const [i,p] of steps.entries()){
  const result=E.check(previous,p.color,p.id,p.cells);assert.ok(result.ok,`runtime step ${i+1} ${p.color}/${p.id}: ${result.reason}`);previous.push(p);
 }
 assert.ok(E.isComplete(previous),'runtime completion');
 return {pieces:steps.length,perColor:21,occupied:occupied.size,empty:400-occupied.size,otherColorEdgeContacts:otherEdges/2,otherColorCornerContacts:otherCorners/2,runtimeReplay:true};
}
if(require.main===module){const result=require('../analysis/solution.json');console.log(JSON.stringify(verify(result.steps),null,2));}
module.exports={verify};
