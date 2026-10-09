"""Normalize the generated RGBA sentinel for the game's 128px battle frames."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'art/source/crown-judicator-hd-v1.png').convert('RGBA')
alpha = source.getchannel('A').point(lambda value: 255 if value >= 128 else 0)
source.putalpha(alpha)
sprite = source.crop(alpha.getbbox())
sprite.thumbnail((116, 116), Image.Resampling.NEAREST)
frame = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
frame.alpha_composite(sprite, ((128 - sprite.width) // 2, 122 - sprite.height))
frame.save(root / 'public/assets/graphics/crown-judicator-hd-v1.png')
