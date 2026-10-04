"""Extract the approved Lumen Hollow ImageGen kit into production PNGs."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp/imagegen/lumen-scenery-hd-transparent-v1.png"
OUTPUT = ROOT / "public/assets/graphics"

WINDOWS = {
    "lumen-home-hd-v1.png": ((0, 0, 418, 627), (160, 160)),
    "lumen-shop-hd-v1.png": ((418, 0, 836, 627), (160, 192)),
    "lumen-memory-hd-v1.png": ((836, 0, 1254, 627), (160, 160)),
    "lumen-transit-hd-v1.png": ((0, 627, 418, 1254), (160, 160)),
    "lumen-tree-hd-v1.png": ((418, 627, 836, 1254), (160, 192)),
    "lumen-pylon-hd-v1.png": ((836, 627, 1254, 1254), (64, 128)),
}
FORCED_CONTENT_SIZES = {
    # The generated weapon shop is unusually narrow inside its square cell.
    # Match the visual footprint of the newer service-building family.
    "lumen-shop-hd-v1.png": (152, 192),
}


def keep_largest_opaque_component(image: Image.Image) -> Image.Image:
    """Remove detached generation debris while preserving the main sprite."""
    alpha = image.getchannel("A")
    width, height = image.size
    visited = bytearray(width * height)
    largest: list[int] = []

    for y in range(height):
        for x in range(width):
            start = y * width + x
            if visited[start] or alpha.getpixel((x, y)) <= 12:
                continue
            visited[start] = 1
            component = [start]
            stack = [start]
            while stack:
                current = stack.pop()
                current_x = current % width
                current_y = current // width
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if next_x < 0 or next_y < 0 or next_x >= width or next_y >= height:
                        continue
                    next_index = next_y * width + next_x
                    if visited[next_index] or alpha.getpixel((next_x, next_y)) <= 12:
                        continue
                    visited[next_index] = 1
                    component.append(next_index)
                    stack.append(next_index)
            if len(component) > len(largest):
                largest = component

    cleaned_alpha = Image.new("L", image.size, 0)
    cleaned_pixels = cleaned_alpha.load()
    for index in largest:
        x = index % width
        y = index // width
        cleaned_pixels[x, y] = alpha.getpixel((x, y))
    cleaned = image.copy()
    cleaned.putalpha(cleaned_alpha)
    return cleaned


def extract(
    source: Image.Image,
    window: tuple[int, int, int, int],
    size: tuple[int, int],
    forced_content_size: tuple[int, int] | None = None,
) -> Image.Image:
    cell = source.crop(window)
    if forced_content_size is not None:
        cell = keep_largest_opaque_component(cell)
    alpha = cell.getchannel("A").point(lambda value: 255 if value > 12 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"Empty scenery window: {window}")
    asset = cell.crop(bounds)
    maximum_width, maximum_height = size
    if forced_content_size is not None:
        resized = asset.resize(forced_content_size, Image.Resampling.NEAREST)
    else:
        scale = min(maximum_width / asset.width, maximum_height / asset.height)
        resized = asset.resize(
            (max(1, round(asset.width * scale)), max(1, round(asset.height * scale))),
            Image.Resampling.NEAREST,
        )
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (maximum_width - resized.width) // 2
    y = maximum_height - resized.height
    output.alpha_composite(resized, (x, y))
    return output


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, (window, size) in WINDOWS.items():
        asset = extract(source, window, size, FORCED_CONTENT_SIZES.get(filename))
        asset.save(OUTPUT / filename, optimize=True)
        print(f"Wrote {filename} ({asset.width} x {asset.height})")


if __name__ == "__main__":
    main()
