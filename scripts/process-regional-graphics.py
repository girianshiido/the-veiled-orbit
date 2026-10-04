"""Extract the approved regional, landmark and battle ImageGen studies."""

from pathlib import Path
from collections import deque

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source"
OUTPUT = ROOT / "public/assets/graphics"

ROLES = ("memory", "transit", "inn", "weapon", "item", "clinic", "armor")
BUILDING_SIZES = {
    "memory": (128, 160),
    "transit": (128, 160),
    "inn": (160, 160),
    "weapon": (128, 160),
    "item": (128, 160),
    "clinic": (128, 160),
    "armor": (128, 160),
    "harbor": (160, 160),
}

ECHO_WINDOWS = (
    (20, 66, 376, 443),
    (399, 66, 755, 443),
    (777, 66, 1133, 443),
    (1158, 66, 1514, 443),
    (20, 518, 376, 894),
    (399, 518, 755, 894),
    (777, 518, 1133, 894),
    (1158, 518, 1514, 894),
)


def remove_magenta(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, _ = pixels[x, y]
            if min(red, blue) > 165 and min(red, blue) - green > 65:
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def reduce_rgba(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    resized = image.resize(size, Image.Resampling.LANCZOS)
    alpha = resized.getchannel("A")
    rgb = resized.convert("RGB").quantize(colors=128, dither=Image.Dither.NONE).convert("RGBA")
    rgb.putalpha(alpha)
    return rgb


def clear_connected_key_background(image: Image.Image) -> Image.Image:
    """Remove dark antialiased key fringes connected to a panel edge."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    visited = bytearray(rgba.width * rgba.height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(rgba.width):
        queue.append((x, 0))
        queue.append((x, rgba.height - 1))
    for y in range(rgba.height):
        queue.append((0, y))
        queue.append((rgba.width - 1, y))

    def is_background(x: int, y: int) -> bool:
        red, green, blue, alpha = pixels[x, y]
        return alpha == 0 or (abs(red - blue) < 120 and min(red, blue) > 24 and min(red, blue) - green > 18)

    while queue:
        x, y = queue.popleft()
        flat_index = y * rgba.width + x
        if visited[flat_index] or not is_background(x, y):
            continue
        visited[flat_index] = 1
        pixels[x, y] = (0, 0, 0, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < rgba.width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < rgba.height:
            queue.append((x, y + 1))
    return rgba


def extract_building(source: Image.Image, index: int, size: tuple[int, int]) -> Image.Image:
    column = index % 4
    row = index // 4
    cell = clear_connected_key_background(
        source.crop((column * 384, row * 512, (column + 1) * 384, (row + 1) * 512)),
    )
    bounds = cell.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Empty building cell {index}")
    sprite = cell.crop(bounds)
    max_width, max_height = size
    scale = min(max_width / sprite.width, max_height / sprite.height)
    resized = reduce_rgba(sprite, (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))))
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(resized, ((max_width - resized.width) // 2, max_height - resized.height))
    return output


def process_buildings(region: str) -> None:
    source = remove_magenta(Image.open(SOURCE / f"{region}-buildings-hd-chroma-v1.png"))
    roles = (*ROLES, "harbor") if region == "tideglass" else ROLES
    for index, role in enumerate(roles):
        asset = extract_building(source, index, BUILDING_SIZES[role])
        filename = f"{region}-{role}-hd-v1.png"
        asset.save(OUTPUT / filename, optimize=True)
        print(f"Wrote {filename} ({asset.width} x {asset.height})")


def fit_cell(source: Image.Image, bounds: tuple[int, int, int, int], size: tuple[int, int]) -> Image.Image:
    cell = clear_connected_key_background(source.crop(bounds))
    content_bounds = cell.getchannel("A").getbbox()
    if content_bounds is None:
        raise ValueError(f"Empty generated-art cell: {bounds}")
    sprite = cell.crop(content_bounds)
    scale = min(size[0] / sprite.width, size[1] / sprite.height)
    resized = reduce_rgba(sprite, (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))))
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - resized.height))
    return output


def process_southwake_landmarks() -> None:
    source = remove_magenta(Image.open(SOURCE / "southwake-landmarks-hd-chroma-v1.png"))
    cell_width = source.width // 2
    atlas = Image.new("RGBA", (2 * 96, 128), (0, 0, 0, 0))
    for index in range(2):
        right = source.width if index == 1 else (index + 1) * cell_width
        sprite = fit_cell(source, (index * cell_width, 0, right, source.height), (96, 128))
        atlas.alpha_composite(sprite, (index * 96, 0))
    atlas.save(OUTPUT / "southwake-landmarks-hd-v1.png", optimize=True)
    print(f"Wrote southwake-landmarks-hd-v1.png ({atlas.width} x {atlas.height})")


def process_southwake_enemies() -> None:
    source = remove_magenta(Image.open(SOURCE / "southwake-enemies-hd-chroma-v1.png"))
    cell_width = source.width // 2
    cell_height = source.height // 2
    atlas = Image.new("RGBA", (4 * 128, 128), (0, 0, 0, 0))
    for index in range(4):
        column = index % 2
        row = index // 2
        right = source.width if column == 1 else (column + 1) * cell_width
        bottom = source.height if row == 1 else (row + 1) * cell_height
        sprite = fit_cell(source, (column * cell_width, row * cell_height, right, bottom), (128, 128))
        atlas.alpha_composite(sprite, (index * 128, 0))
    atlas.save(OUTPUT / "southwake-enemies-hd-v1.png", optimize=True)
    print(f"Wrote southwake-enemies-hd-v1.png ({atlas.width} x {atlas.height})")


def process_echo_tiles() -> None:
    source = Image.open(SOURCE / "echo-vault-tiles-hd-sheet-v1.png").convert("RGB")
    atlas = Image.new("RGBA", (8 * 64, 64), (0, 0, 0, 0))
    for index, window in enumerate(ECHO_WINDOWS):
        tile = source.crop(window).resize((64, 64), Image.Resampling.LANCZOS)
        tile = tile.quantize(colors=128, dither=Image.Dither.NONE).convert("RGBA")
        atlas.alpha_composite(tile, (index * 64, 0))
    atlas.save(OUTPUT / "echo-vault-tiles-hd-v1.png", optimize=True)
    print(f"Wrote echo-vault-tiles-hd-v1.png ({atlas.width} x {atlas.height})")


def process_echo_guardian() -> None:
    source = remove_magenta(Image.open(SOURCE / "echo-vault-guardian-hd-chroma-v1.png"))
    frame_size = (64, 72)
    atlas = Image.new("RGBA", (frame_size[0] * 4, frame_size[1]), (0, 0, 0, 0))
    cell_width = source.width // 4
    for index in range(4):
        right = source.width if index == 3 else (index + 1) * cell_width
        cell = clear_connected_key_background(source.crop((index * cell_width, 0, right, source.height)))
        bounds = cell.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty guardian frame {index}")
        sprite = cell.crop(bounds)
        scale = min(frame_size[0] / sprite.width, frame_size[1] / sprite.height)
        resized = reduce_rgba(sprite, (round(sprite.width * scale), round(sprite.height * scale)))
        frame = Image.new("RGBA", frame_size, (0, 0, 0, 0))
        frame.alpha_composite(resized, ((frame_size[0] - resized.width) // 2, frame_size[1] - resized.height))
        atlas.alpha_composite(frame, (index * frame_size[0], 0))
    atlas.save(OUTPUT / "echo-vault-guardian-hd-v1.png", optimize=True)
    print(f"Wrote echo-vault-guardian-hd-v1.png ({atlas.width} x {atlas.height})")


def process_echo_pylon() -> None:
    source = Image.open(SOURCE / "echo-vault-pylon-hd-transparent-v1.png").convert("RGBA")
    asset = fit_cell(source, (0, 0, source.width, source.height), (80, 160))
    asset.save(OUTPUT / "echo-vault-pylon-hd-v1.png", optimize=True)
    print(f"Wrote echo-vault-pylon-hd-v1.png ({asset.width} x {asset.height})")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    process_buildings("aster")
    process_buildings("vesper")
    process_buildings("tideglass")
    process_southwake_landmarks()
    process_southwake_enemies()
    process_echo_tiles()
    process_echo_guardian()
    process_echo_pylon()


if __name__ == "__main__":
    main()
