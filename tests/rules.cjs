const assert=require('node:assert/strict');
const E=require('../engine.js');
const canonical=c=>E.variants(c).map(E.key).sort()[0];
const pieces=Object.values(E.pieces);
assert.equal(pieces.length,21);
assert.deepEqual([1,2,3,4,5].map(n=>pieces.filter(p=>p.cells.length===n).length),[1,1,2,5,12]);
assert.equal(new Set(pieces.map(p=>canonical(p.cells))).size,21);
// Independently grow all free polyominoes up to order five to verify completeness.
let generated=new Map([[canonical([[0,0]]),[[0,0]]]]);
for(let n=1;n<=5;n++){
 assert.deepEqual(new Set(pieces.filter(p=>p.cells.length===n).map(p=>canonical(p.cells))),new Set(generated.keys()));
 const next=new Map();for(const shape of generated.values())for(const [x,y] of shape)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const cell=[x+dx,y+dy];if(shape.some(c=>c[0]===cell[0]&&c[1]===cell[1]))continue;
  const grown=E.normalize([...shape,cell]);next.set(canonical(grown),grown);
 }generated=next;
}
for(const p of pieces){
 let shape=p.cells;for(let i=0;i<4;i++)shape=E.rotate(shape);
 assert.deepEqual(shape,p.cells);assert.deepEqual(E.flip(E.flip(p.cells)),p.cells);
 assert.deepEqual(E.rotate(E.rotate(p.cells),-1),p.cells);
}

assert.equal(E.size,20);
assert.equal(Object.keys(E.colors).length*pieces.length,84);
assert.equal(pieces.reduce((n,p)=>n+p.cells.length,0)*4,356);
for(const [color,info] of Object.entries(E.colors)){
 assert.ok(E.check([],color,'1',[info.start]).ok);
 for(const other of Object.values(E.colors))if(other!==info)assert.ok(!E.check([],color,'1',[other.start]).ok);
}
const blue=[{color:'blue',id:'1',cells:[[0,0]]}];
assert.ok(E.check(blue,'yellow','1',[[19,0]]).ok,'each color has its own first move');
assert.ok(!E.check(blue,'yellow','1',[[1,1]]).ok,'other colors do not replace the start');
assert.ok(!E.check(blue,'blue','2',[[1,0],[2,0]]).ok,'same-color edge prohibited');
assert.ok(!E.check(blue,'blue','2',[[0,1],[0,2]]).ok);
assert.ok(E.check(blue,'blue','2',[[1,1],[2,1]]).ok,'same-color corner allowed');
assert.ok(!E.check(blue,'blue','2',[[1,0],[1,1]]).ok,'corner cannot override edge');
assert.ok(!E.check(blue,'blue','2',[[3,3],[4,3]]).ok,'must touch own corner');
assert.ok(!E.check(blue,'blue','1',[[1,1]]).ok,'cannot reuse a color/piece pair');
assert.ok(E.check([], 'blue','I3',[[0,0],[1,0],[2,0]]).ok,'internal edges allowed');
// Local geometric fixtures isolate contacts regardless of earlier play order.
const local=[{color:'blue',id:'1',cells:[[3,3]]},{color:'yellow',id:'1',cells:[[5,3]]}];
assert.ok(E.check(local,'blue','2',[[4,4],[5,4]]).ok,'DIFFERENT-color edge is allowed alongside own corner');
assert.ok(!E.check(local.map(p=>({...p,color:'blue'})),'blue','2',[[4,4],[5,4]]).ok,'SAME-color edge is forbidden for identical geometry');
assert.ok(E.check([...blue,{color:'yellow',id:'1',cells:[[3,2]]}],'blue','2',[[1,1],[2,1]]).ok,'different-color corner allowed');
assert.ok(!E.check([{color:'yellow',id:'1',cells:[[3,3]]},...blue],'blue','2',[[4,4],[5,4]]).ok,'different-color corner cannot satisfy own contact');
for(const color of ['blue','yellow'])assert.ok(!E.check([{color,id:'1',cells:[[0,0]]}],'blue','2',[[0,0],[1,0]]).ok,'overlap prohibited for every color');
for(const cells of [[[-1,0],[0,0]],[[19,0],[20,0]],[[0,-1],[0,0]],[[0,19],[0,20]]])assert.ok(!E.check([],'blue','2',cells).ok,'out of bounds');
assert.ok(!E.check([],'blue','2',[[0,0],[0,0]]).ok,'duplicate cells rejected');
assert.ok(!E.check([],'blue','2',[[0,0],[2,0]]).ok,'incorrect shape rejected');
assert.ok(!E.check([],'blue','2',[[0,0],[0.5,0]]).ok,'fractional coordinates rejected');
assert.ok(!E.check([],'purple','1',[[0,0]]).ok);
assert.ok(!E.isComplete([]));assert.ok(!E.isComplete(blue));
assert.ok(!E.isComplete(Array.from({length:84},()=>blue[0])),'84 entries alone do not count as clear');
for(const p of pieces)for(const shape of E.variants(p.cells)){
 const cells=E.position(shape,10,10);assert.deepEqual(cells[0],[10,10]);assert.equal(E.key(cells),E.key(shape));
}
console.log('PASS: 21 shapes, transforms, 4 starts, bounds, overlap, same-color edges, different-color edges/corners, inventory and completion guards');
