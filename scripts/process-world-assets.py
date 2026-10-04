"""Extract the approved ImageGen overworld studies into production atlases."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TERRAIN_SOURCE = ROOT / "art/source/world-terrain-hd-sheet-v1.png"
LANDMARK_SOURCE = ROOT / "art/source/world-landmarks-hd-chroma-v1.png"
TOWER_SOURCE = ROOT / "art/source/control-towers-hd-chroma-v1.png"
OUTPUT = ROOT / "public/assets/graphics"

TERRAIN_SIZE = 64
TERRAIN_WINDOWS = (
    (29, 29, 436, 430),
    (466, 29, 873, 430),
    (902, 29, 1308, 430),
    (1337, 29, 1744, 430),
    (29, 459, 436, 858),
    (466, 459, 873, 858),
    (902, 459, 1308, 858),
    (1337, 459, 1744, 858),
)

LANDMARK_CELL_WIDTH = 1774 // 4
LANDMARK_SIZE = (96, 128)


def quantized_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    resized = image.resize(size, Image.Resampling.LANCZOS)
    return resized.quantize(colors=128, dither=Image.Dither.NONE).convert("RGBA")


def remove_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, _ = pixels[x, y]
            magenta_distance = abs(red - 255) + green + abs(blue - 255)
            if magenta_distance < 110 or (red > 210 and blue > 180 and green < 90):
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def keep_largest_component(image: Image.Image) -> Image.Image:
    """Remove separator strokes and detached generation debris from a cell."""
    rgba = image.copy()
    alpha = rgba.getchannel("A")
    pixels = alpha.load()
    visited = bytearray(rgba.width * rgba.height)
    components: list[list[tuple[int, int]]] = []

    for start_y in range(rgba.height):
        for start_x in range(rgba.width):
            offset = start_y * rgba.width + start_x
            if visited[offset] or pixels[start_x, start_y] <= 8:
                continue
            visited[offset] = 1
            queue = deque([(start_x, start_y)])
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= next_x < rgba.width and 0 <= next_y < rgba.height):
                        continue
                    next_offset = next_y * rgba.width + next_x
                    if visited[next_offset] or pixels[next_x, next_y] <= 8:
                        continue
                    visited[next_offset] = 1
                    queue.append((next_x, next_y))
            components.append(component)

    if not components:
        return rgba
    keep = set(max(components, key=len))
    output = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if (x, y) not in keep:
                output[x, y] = (0, 0, 0, 0)
    bounds = rgba.getchannel("A").getbbox()
    return rgba.crop(bounds) if bounds else rgba


def extract_landmark(source: Image.Image, index: int) -> Image.Image:
    left = index * LANDMARK_CELL_WIDTH
    right = source.width if index == 3 else (index + 1) * LANDMARK_CELL_WIDTH
    cell = keep_largest_component(source.crop((left, 0, right, source.height)))
    bounds = cell.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Empty landmark cell {index}")
    sprite = cell.crop(bounds)
    maximum_width, maximum_height = LANDMARK_SIZE
    scale = min(maximum_width / sprite.width, maximum_height / sprite.height)
    resized = quantized_resize(sprite, (round(sprite.width * scale), round(sprite.height * scale)))
    output = Image.new("RGBA", LANDMARK_SIZE, (0, 0, 0, 0))
    output.alpha_composite(resized, ((maximum_width - resized.width) // 2, maximum_height - resized.height))
    return output


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    terrain_source = Image.open(TERRAIN_SOURCE).convert("RGB")
    terrain_atlas = Image.new("RGBA", (TERRAIN_SIZE * len(TERRAIN_WINDOWS), TERRAIN_SIZE), (0, 0, 0, 0))
    for index, window in enumerate(TERRAIN_WINDOWS):
        tile = quantized_resize(terrain_source.crop(window), (TERRAIN_SIZE, TERRAIN_SIZE))
        terrain_atlas.alpha_composite(tile, (index * TERRAIN_SIZE, 0))
    terrain_atlas.save(OUTPUT / "world-terrain-hd-v1.png", optimize=True)

    landmark_source = remove_magenta(Image.open(LANDMARK_SOURCE))
    landmark_atlas = Image.new("RGBA", (LANDMARK_SIZE[0] * 4, LANDMARK_SIZE[1]), (0, 0, 0, 0))
    for index in range(4):
        landmark_atlas.alpha_composite(extract_landmark(landmark_source, index), (index * LANDMARK_SIZE[0], 0))
    landmark_atlas.save(OUTPUT / "world-landmarks-hd-v1.png", optimize=True)

    tower_source = remove_magenta(Image.open(TOWER_SOURCE))
    tower_cell_width = tower_source.width // 3
    tower_atlas = Image.new("RGBA", (LANDMARK_SIZE[0] * 3, LANDMARK_SIZE[1]), (0, 0, 0, 0))
    for index in range(3):
        left = index * tower_cell_width
        right = tower_source.width if index == 2 else (index + 1) * tower_cell_width
        cell = keep_largest_component(tower_source.crop((left, 0, right, tower_source.height)))
        bounds = cell.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty control tower cell {index}")
        sprite = cell.crop(bounds)
        scale = min(LANDMARK_SIZE[0] / sprite.width, LANDMARK_SIZE[1] / sprite.height)
        resized = quantized_resize(sprite, (round(sprite.width * scale), round(sprite.height * scale)))
        frame = Image.new("RGBA", LANDMARK_SIZE, (0, 0, 0, 0))
        frame.alpha_composite(resized, ((LANDMARK_SIZE[0] - resized.width) // 2, LANDMARK_SIZE[1] - resized.height))
        tower_atlas.alpha_composite(frame, (index * LANDMARK_SIZE[0], 0))
    tower_atlas.save(OUTPUT / "control-towers-hd-v1.png", optimize=True)

    print(f"Wrote world-terrain-hd-v1.png ({terrain_atlas.width} x {terrain_atlas.height})")
    print(f"Wrote world-landmarks-hd-v1.png ({landmark_atlas.width} x {landmark_atlas.height})")
    print(f"Wrote control-towers-hd-v1.png ({tower_atlas.width} x {tower_atlas.height})")


if __name__ == "__main__":
    main()
