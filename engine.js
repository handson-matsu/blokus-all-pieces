/* Shapes and transforms adapted from blokus-puzzle; four-color challenge rules. */
(function(root) {
  'use strict';
  const normalize = cells => {
    const minX = Math.min(...cells.map(c=>c[0])), minY = Math.min(...cells.map(c=>c[1]));
    return cells.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
  };
  const rotate = (cells, direction=1) => normalize(cells.map(([x,y])=>direction===1?[-y,x]:[y,-x]));
  const flip = cells => normalize(cells.map(([x,y])=>[-x,y]));
  const key = cells => JSON.stringify(normalize(cells));
  const variants = cells => {
    const result = new Map();
    for (const base of [cells,flip(cells)]) {
      let shape=base;
      for(let i=0;i<4;i++){result.set(key(shape),normalize(shape));shape=rotate(shape);}
    }
    return [...result.values()];
  };
  const definitions = {
    '1': [[0,0]], '2': [[0,0],[1,0]],
    'I3': [[0,0],[1,0],[2,0]], 'L3': [[0,0],[0,1],[1,1]],
    'I4': [[0,0],[1,0],[2,0],[3,0]], 'O4': [[0,0],[1,0],[0,1],[1,1]],
    'T4': [[0,0],[1,0],[2,0],[1,1]], 'L4': [[0,0],[0,1],[0,2],[1,2]],
    'S4': [[1,0],[2,0],[0,1],[1,1]],
    'F5': [[1,0],[2,0],[0,1],[1,1],[1,2]], 'I5': [[0,0],[1,0],[2,0],[3,0],[4,0]],
    'L5': [[0,0],[0,1],[0,2],[0,3],[1,3]], 'P5': [[0,0],[1,0],[0,1],[1,1],[0,2]],
    'N5': [[0,0],[0,1],[1,1],[1,2],[1,3]], 'T5': [[0,0],[1,0],[2,0],[1,1],[1,2]],
    'U5': [[0,0],[2,0],[0,1],[1,1],[2,1]], 'V5': [[0,0],[0,1],[0,2],[1,2],[2,2]],
    'W5': [[0,0],[0,1],[1,1],[1,2],[2,2]], 'X5': [[1,0],[0,1],[1,1],[2,1],[1,2]],
    'Y5': [[0,0],[0,1],[1,1],[0,2],[0,3]], 'Z5': [[0,0],[1,0],[1,1],[1,2],[2,2]],
  };
  const pieces = Object.fromEntries(Object.entries(definitions).map(([id,cells])=>[id,{id,cells:normalize(cells)}]));
  const position = (shape,x,y) => shape.map(([cx,cy])=>[cx-shape[0][0]+x,cy-shape[0][1]+y]);
  const cellKey = (x,y) => `${x},${y}`;
  const edges = [[1,0],[-1,0],[0,1],[0,-1]], corners = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const size=20;
  const colors={blue:{name:'青',hex:'#327ac1',start:[0,0]},yellow:{name:'黄',hex:'#e6b932',start:[19,0]},red:{name:'赤',hex:'#d65b56',start:[19,19]},green:{name:'緑',hex:'#41966d',start:[0,19]}};
  const total=84;
  function check(placed,color,id,cells) {
    if(!colors[color]||!pieces[id])return {ok:false,reason:'色とピースを選んでください。'};
    if(placed.some(p=>p.color===color&&p.id===id))return {ok:false,reason:'このピースは配置済みです。'};
    if(!Array.isArray(cells)||cells.length!==pieces[id].cells.length||cells.some(c=>!Array.isArray(c)||c.length!==2||!c.every(Number.isInteger))||!variants(pieces[id].cells).some(s=>key(s)===key(cells)))return {ok:false,reason:'ピースの形が正しくありません。'};
    if(cells.some(([x,y])=>x<0||y<0||x>=size||y>=size))return {ok:false,reason:'盤面からはみ出しています。'};
    const occupied=new Set(placed.flatMap(p=>p.cells.map(([x,y])=>cellKey(x,y))));
    if(cells.some(([x,y])=>occupied.has(cellKey(x,y))))return {ok:false,reason:'ほかのピースと重なっています。'};
    const same=placed.filter(p=>p.color===color);
    const own=new Set(same.flatMap(p=>p.cells.map(([x,y])=>cellKey(x,y))));
    if(cells.some(([x,y])=>edges.some(([dx,dy])=>own.has(cellKey(x+dx,y+dy)))))return {ok:false,reason:'同じ色とは辺で接することができません。角でつなげましょう。'};
    if(!same.length){const [sx,sy]=colors[color].start;return cells.some(([x,y])=>x===sx&&y===sy)?{ok:true}:{ok:false,reason:`${colors[color].name}の最初のピースは、${colors[color].name}の ★ を含めてください。`};}
    if(!cells.some(([x,y])=>corners.some(([dx,dy])=>own.has(cellKey(x+dx,y+dy)))))return {ok:false,reason:'配置済みの同じ色と、少なくとも1か所で角をつなげてください。'};
    return {ok:true};
  }
  // Completion depends on the full legal history, never on filling 400 squares.
  function isComplete(placed){
    if(placed.length!==total)return false;
    const previous=[];
    for(const p of placed){if(!check(previous,p.color,p.id,p.cells).ok)return false;previous.push(p);}
    return true;
  }
  const api={pieces,normalize,rotate,flip,key,variants,position,check,isComplete,colors,size,total};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PuzzleEngine=api;
})(globalThis);
