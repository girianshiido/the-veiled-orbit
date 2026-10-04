"""Normalize generated transparent enemy art without changing its silhouette."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for name, limit, baseline in [("archive-custodian", (118, 116), 119), ("cipher-drone", (118, 90), 107)]:
    source = Image.open(ROOT / "art/source" / f"{name}-hd-v1.png").convert("RGBA")
    alpha = source.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    source.putalpha(alpha)
    sprite = source.crop(alpha.getbbox())
    sprite.thumbnail(limit, Image.Resampling.NEAREST)
    frame = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    frame.alpha_composite(sprite, ((128 - sprite.width) // 2, baseline - sprite.height))
    output = ROOT / "public/assets/graphics" / f"{name}-hd-v1.png"
    frame.save(output)
    print(output)
