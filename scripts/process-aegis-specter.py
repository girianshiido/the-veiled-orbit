from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source/aegis-specter-hd-v1.png"
OUTPUT = ROOT / "public/assets/graphics/aegis-specter-hd-v1.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("The Aegis Specter source has no visible pixels.")
    image = image.crop(bounds)
    image.thumbnail((122, 122), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (128, 128))
    output.alpha_composite(image, ((128 - image.width) // 2, 128 - image.height))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT, optimize=True)


if __name__ == "__main__":
    main()
