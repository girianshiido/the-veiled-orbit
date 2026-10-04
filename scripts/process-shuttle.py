"""Crop and normalize the transparent shuttle into its production frame."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / "art/source/cradle-shuttle-hd-v1.png").convert("RGBA")
alpha = source.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
source.putalpha(alpha)
sprite = source.crop(alpha.getbbox())
sprite.thumbnail((180, 148), Image.Resampling.NEAREST)
frame = Image.new("RGBA", (192, 160), (0, 0, 0, 0))
frame.alpha_composite(sprite, ((192-sprite.width)//2, 155-sprite.height))
frame.save(root / "public/assets/graphics/cradle-shuttle-hd-v1.png")
