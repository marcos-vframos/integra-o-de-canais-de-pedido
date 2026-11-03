"""Encode delivery variants without altering image content."""
from PIL import Image
from pathlib import Path
import sys
source=Path(sys.argv[1]);target=Path(sys.argv[2]);target.parent.mkdir(parents=True,exist_ok=True)
with Image.open(source) as image:
    image.thumbnail((960,960),Image.Resampling.LANCZOS)
    image.save(target,format='WEBP',quality=82,method=6)
    image.thumbnail((384,384),Image.Resampling.LANCZOS)
    image.save(target.with_name(target.stem+'-thumb.webp'),format='WEBP',quality=77,method=6)
