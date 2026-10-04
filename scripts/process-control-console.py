from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source/control-array-console-hd-v1.png"
OUTPUT = ROOT / "public/assets/graphics/control-array-console-hd-v1.png"
TARGET_SIZE = (96, 128)


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("The control console source has no visible pixels.")
    image = image.crop(bounds)
    image.thumbnail((90, 124), Image.Resampling.NEAREST)

    output = Image.new("RGBA", TARGET_SIZE)
    output.alpha_composite(image, ((TARGET_SIZE[0] - image.width) // 2, TARGET_SIZE[1] - image.height))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT, optimize=True)


if __name__ == "__main__":
    main()
