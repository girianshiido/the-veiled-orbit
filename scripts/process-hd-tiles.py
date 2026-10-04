"""Reduce the approved ImageGen ground study to a native 32 px tile strip."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source/lumen-tiles-hd-sheet-v1.png"
OUTPUT = ROOT / "public/assets/graphics/lumen-tiles-hd-v1.png"

TILE_SIZE = 32
WINDOWS = (
    (8, 8, 437, 438),
    (450, 8, 881, 438),
    (893, 8, 1324, 438),
    (1336, 8, 1766, 438),
    (8, 449, 437, 879),
    (450, 449, 881, 879),
    (893, 449, 1324, 879),
    (1336, 449, 1766, 879),
)


def normalize_tile(source: Image.Image, window: tuple[int, int, int, int]) -> Image.Image:
    tile = source.crop(window).resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
    # The source study is already pixel art. A compact palette keeps the reduced
    # tiles crisp while retaining the richer colour range of the new direction.
    return tile.quantize(colors=64, dither=Image.Dither.NONE).convert("RGBA")


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    atlas = Image.new("RGBA", (TILE_SIZE * len(WINDOWS), TILE_SIZE), (0, 0, 0, 0))
    for index, window in enumerate(WINDOWS):
        atlas.alpha_composite(normalize_tile(source, window), (index * TILE_SIZE, 0))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, optimize=True)
    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({atlas.width} x {atlas.height})")


if __name__ == "__main__":
    main()
