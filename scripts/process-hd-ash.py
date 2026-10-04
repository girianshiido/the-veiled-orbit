"""Turn the approved ImageGen Ash study into a regular production sprite sheet."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp/imagegen/ash-overworld-hd-transparent-v1.png"
OUTPUT = ROOT / "public/assets/graphics/ash-overworld-hd-v1.png"

FRAME_WIDTH = 48
FRAME_HEIGHT = 64
CONTENT_WIDTH = 44
CONTENT_HEIGHT = 60

# The generated study is deliberately spacious. These windows isolate its
# regular 3 x 4 layout before each opaque figure is normalized independently.
COLUMNS = ((200, 480), (480, 770), (770, 1050))
ROWS = ((0, 320), (320, 610), (610, 900), (900, 1254))


def opaque_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value > 12 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("A sprite cell is empty.")
    return bounds


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    sheet = Image.new("RGBA", (FRAME_WIDTH * 3, FRAME_HEIGHT * 4), (0, 0, 0, 0))

    for row, (top, bottom) in enumerate(ROWS):
        for column, (left, right) in enumerate(COLUMNS):
            cell = source.crop((left, top, right, bottom))
            sprite = cell.crop(opaque_bounds(cell))
            scale = min(CONTENT_WIDTH / sprite.width, CONTENT_HEIGHT / sprite.height)
            size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
            sprite = sprite.resize(size, Image.Resampling.NEAREST)
            x = column * FRAME_WIDTH + (FRAME_WIDTH - sprite.width) // 2
            y = row * FRAME_HEIGHT + FRAME_HEIGHT - 2 - sprite.height
            sheet.alpha_composite(sprite, (x, y))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({sheet.width} x {sheet.height})")


if __name__ == "__main__":
    main()
