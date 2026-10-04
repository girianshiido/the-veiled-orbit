"""Extract the approved Lumen service-building sheet into transparent PNGs."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp/imagegen/lumen-services-hd-transparent-v1.png"
OUTPUT = ROOT / "public/assets/graphics"

WINDOWS = {
    "lumen-inn-hd-v1.png": (0, 0, 627, 627),
    "lumen-item-shop-hd-v1.png": (627, 0, 1254, 627),
    "lumen-clinic-hd-v1.png": (0, 627, 627, 1254),
    "lumen-armor-shop-hd-v1.png": (627, 627, 1254, 1254),
}
SIZE = (160, 160)


def extract(source: Image.Image, window: tuple[int, int, int, int]) -> Image.Image:
    cell = source.crop(window)
    alpha = cell.getchannel("A").point(lambda value: 255 if value > 12 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"Empty service-building window: {window}")
    asset = cell.crop(bounds)
    scale = min(SIZE[0] / asset.width, SIZE[1] / asset.height)
    resized = asset.resize(
        (max(1, round(asset.width * scale)), max(1, round(asset.height * scale))),
        Image.Resampling.NEAREST,
    )
    output = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    output.alpha_composite(resized, ((SIZE[0] - resized.width) // 2, SIZE[1] - resized.height))
    return output


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, window in WINDOWS.items():
        asset = extract(source, window)
        asset.save(OUTPUT / filename, optimize=True)
        print(f"Wrote {filename} ({asset.width} x {asset.height})")


if __name__ == "__main__":
    main()
