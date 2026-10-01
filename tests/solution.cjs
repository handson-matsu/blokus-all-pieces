'use strict';
const assert=require('node:assert/strict');
const {verify}=require('../tools/verify-solution.cjs');
const source=require('../analysis/solution.json');
const solution=require('../solution.js');
const {reconstruct}=require('../tools/reconstruct-solution.cjs');
assert.deepEqual(reconstruct(require('../analysis/reference-grid.json')),source,'reference grid deterministically reconstructs the saved solution');
assert.deepEqual(solution,source.steps,'browser artifact matches reconstructed witness');
const summary=verify(solution);
assert.ok(summary.otherColorEdgeContacts>0,'solution demonstrates allowed mixed-color edges');
assert.ok(summary.otherColorCornerContacts>0,'solution demonstrates allowed mixed-color corners');
assert.ok(Object.isFrozen(solution)&&solution.every(p=>Object.isFrozen(p)&&Object.isFrozen(p.cells)&&p.cells.every(Object.isFrozen)));
const reject=fn=>{const bad=JSON.parse(JSON.stringify(solution));fn(bad);assert.throws(()=>verify(bad));};
reject(s=>s.pop());
reject(s=>s[1]=s[0]);
reject(s=>s[0].cells[0]=[-1,0]);
reject(s=>s[0].cells[0]=[20,0]);
reject(s=>s[1].cells[0]=s[0].cells[0]);
reject(s=>{const i=s.findIndex(p=>p.color==='blue');const j=s.findIndex((p,k)=>p.color==='blue'&&k!==i);[s[i],s[j]]=[s[j],s[i]];});
reject(s=>s[0].color='unknown');
reject(s=>s[0].cells[0][0]+=0.5);
// Preserve all inventory and shapes while deliberately breaking connectivity.
const disconnected=JSON.parse(JSON.stringify(solution));
disconnected.find(p=>p.color==='blue'&&p.id==='1').cells=[[5,19]];
assert.throws(()=>verify(disconnected),/corner graph connected/);
// Move a monomino to an empty side-neighbor of its color: geometry, not count.
const edged=JSON.parse(JSON.stringify(solution)),mono=edged.find(p=>p.color==='blue'&&p.id==='1');
const others=edged.filter(p=>p!==mono),occupied=new Set(others.flatMap(p=>p.cells.map(c=>String(c))));
let edgeCell=null;
for(const p of others.filter(p=>p.color==='blue'))for(const [x,y] of p.cells)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
 const c=[x+dx,y+dy];if(c.every(v=>v>=0&&v<20)&&!occupied.has(String(c)))edgeCell??=c;
}
assert.ok(edgeCell);mono.cells=[edgeCell];assert.throws(()=>verify(edged),/same-color piece edges/);
console.log('PASS: verified 84-piece witness, complete inventory, shapes, bounds, overlap, starts, same-color edges/connectivity, mixed contacts, runtime replay and completion; corrupt data rejected.');
console.log(summary);
