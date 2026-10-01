"""Extract cells from Toby Gottfried's 18x20dtl.gif, without hand transcription.
Usage: python tools/extract-reference.py /path/to/18x20dtl.gif analysis/reference-grid.json
Requires Pillow. The 20-column x 18-row middle panel has 11-pixel cells.
"""
import hashlib,json,sys
from PIL import Image
image=Image.open(sys.argv[1]).convert('RGB')
assert image.size==(590,221),'Unexpected reference image dimensions'
palette={(255,230,0):'Y',(0,0,220):'B',(210,0,0):'R',(0,190,0):'G',(192,192,192):'.'}
rows=[]
for y in range(18):
    row=''
    for x in range(20):
        # Check a 3x3 center patch to reject ambiguous grid/text pixels.
        samples={image.getpixel((135+11*x+dx,16+11*y+dy)) for dx in [-1,0,1] for dy in [-1,0,1]}
        assert len(samples)==1 and next(iter(samples)) in palette,'Ambiguous cell'
        row+=palette[next(iter(samples))]
    rows.append(row)
result={'author':'Toby Gottfried','page':'https://www.gottfriedville.net/blokus/18x20dtl.htm','image':'https://www.gottfriedville.net/blokus/18x20dtl.gif','sha256':hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest(),'panel':{'firstCellCenter':[135,16],'pitch':11,'width':20,'height':18},'rows':rows}
with open(sys.argv[2],'w') as f:json.dump(result,f,indent=2);f.write('\n')
