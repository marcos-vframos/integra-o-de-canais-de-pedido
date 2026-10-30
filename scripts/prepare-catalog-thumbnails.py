"""Optimize delivery sizes and build internal QA sheets; do not alter food content."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
plans=json.loads((root/'docs/catalogo-montagem-aprovada-prompts.json').read_text())
found=[]
for plan in plans:
    path=root/plan['path']
    if not path.exists():
        continue
    thumbnail=path.with_name(path.stem+'-thumb.webp')
    if '--qa-only' not in sys.argv and (not thumbnail.exists() or thumbnail.stat().st_mtime < path.stat().st_mtime):
        with Image.open(path) as image:
            image.load()
            thumb=image.copy()
            thumb.thumbnail((384,384),Image.Resampling.LANCZOS)
            thumb.save(thumbnail,format='WEBP',quality=77,method=6)
    found.append(plan)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
qa=Path('/workspace/scratch/4236a2e19452/catalog-qa')
qa.mkdir(exist_ok=True)
for start in range(0,len(found),16):
    sheet=Image.new('RGB',(1200,1120),'#202522')
    draw=ImageDraw.Draw(sheet)
    for index,plan in enumerate(found[start:start+16]):
        x=(index%4)*300;y=(index//4)*280
        with Image.open(root/plan['path']) as photo:
            photo=photo.convert('RGBA');photo.thumbnail((284,236),Image.Resampling.LANCZOS)
            sheet.paste(photo,(x+(300-photo.width)//2,y+(240-photo.height)//2),photo)
        draw.text((x+8,y+244),plan['code'],fill='white',font=font)
        draw.text((x+8,y+263),plan['name'][:31],fill='#cccccc',font=font)
    sheet.save(qa/f'sheet-{start//16+1:02d}.jpg',quality=90)
print(json.dumps({'ready':len(found),'expected':len(plans),'sheets':(len(found)+15)//16}))
