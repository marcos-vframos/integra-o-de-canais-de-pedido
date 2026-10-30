"""Encode a generated PNG as WebP without changing its composition or dimensions."""
import base64
import json
import pathlib
import sys
from PIL import Image

source = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
target.parent.mkdir(parents=True, exist_ok=True)
with Image.open(source) as image:
    image.thumbnail((960, 960), Image.Resampling.LANCZOS)
    image.save(target, format='WEBP', quality=82, method=6)
    dimensions = image.size
print(json.dumps({'bytes': target.stat().st_size, 'dimensions': dimensions, 'base64Length': len(base64.b64encode(target.read_bytes()))}))
