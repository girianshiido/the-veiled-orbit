"""Extract the approved ImageGen battle sheets into transparent game atlases."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source"
OUTPUT = ROOT / "public/assets/graphics"

PARTY_FRAME = (96, 112)
ENEMY_FRAME = (128, 128)
ENEMY_SCALE = (0.56, 0.70, 0.82, 0.78, 0.92, 0.86, 0.92)
TOWER_ENEMY_SCALE = (0.72, 0.82, 0.94, 1.0)


def remove_key(image: Image.Image, remove_enclosed: bool = False) -> Image.Image:
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

    if remove_enclosed:
        # Some large enemies enclose pockets of the original flat chroma key
        # between their limbs. Seed those exact background-colour islands too,
        # while preserving the darker violet/magenta energy accents.
        for y in range(rgba.height):
            for x in range(rgba.width):
                red, green, blue, alpha = pixels[x, y]
                if alpha > 0 and abs(red - 246) <= 9 and green <= 14 and abs(blue - 238) <= 9:
                    queue.append((x, y))

    def is_key(x: int, y: int) -> bool:
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0:
            return True
        return red > 120 and blue > 120 and red + blue - green * 2 > 100

    while queue:
        x, y = queue.popleft()
        offset = y * rgba.width + x
        if visited[offset] or not is_key(x, y):
            continue
        visited[offset] = 1
        pixels[x, y] = (0, 0, 0, 0)
        if x:
            queue.append((x - 1, y))
        if x + 1 < rgba.width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < rgba.height:
            queue.append((x, y + 1))
    return rgba


def reduce_rgba(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    resized = image.resize(size, Image.Resampling.LANCZOS)
    alpha = resized.getchannel("A")
    color = resized.convert("RGB").quantize(colors=160, dither=Image.Dither.NONE).convert("RGBA")
    color.putalpha(alpha)
    return color


def keep_largest_component(image: Image.Image) -> Image.Image:
    """Discard isolated chroma-key remnants without changing the actual sprite."""
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


def extract_cell(
    source: Image.Image,
    column: int,
    row: int,
    columns: int,
    rows: int,
    remove_enclosed_key: bool = False,
) -> Image.Image:
    left = round(source.width * column / columns)
    top = round(source.height * row / rows)
    right = round(source.width * (column + 1) / columns)
    bottom = round(source.height * (row + 1) / rows)
    cell = remove_key(source.crop((left, top, right, bottom)), remove_enclosed_key)
    bounds = cell.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Empty cell at {column}, {row}")
    return cell.crop(bounds)


def place_sprite(
    sprite: Image.Image,
    frame_size: tuple[int, int],
    fill: float = 1.0,
) -> Image.Image:
    max_width = round(frame_size[0] * fill)
    max_height = round(frame_size[1] * fill)
    scale = min(max_width / sprite.width, max_height / sprite.height)
    resized = reduce_rgba(
        sprite,
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
    )
    frame = Image.new("RGBA", frame_size, (0, 0, 0, 0))
    frame.alpha_composite(
        resized,
        ((frame_size[0] - resized.width) // 2, frame_size[1] - resized.height),
    )
    return frame


def process_party() -> None:
    source = Image.open(SOURCE / "battle-party-hd-chroma-v1.png")
    atlas = Image.new(
        "RGBA",
        (PARTY_FRAME[0] * 4, PARTY_FRAME[1] * 4),
        (0, 0, 0, 0),
    )
    for row in range(3):
        for column in range(4):
            sprite = extract_cell(source, column, row, 4, 3)
            frame = place_sprite(sprite, PARTY_FRAME, 0.94)
            atlas.alpha_composite(frame, (column * PARTY_FRAME[0], row * PARTY_FRAME[1]))
    sera = Image.open(ROOT / "tmp/imagegen/sera-venn-hd-transparent-v1.png").convert("RGBA")
    cell_width = sera.width // 4
    # The generated sheet reserves row two for Sera's four rear battle poses.
    for column in range(4):
        cell = sera.crop((column * cell_width, sera.height // 3, (column + 1) * cell_width, sera.height * 2 // 3))
        bounds = cell.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty Sera battle pose {column}")
        frame = place_sprite(cell.crop(bounds), PARTY_FRAME, 0.94)
        atlas.alpha_composite(frame, (column * PARTY_FRAME[0], 3 * PARTY_FRAME[1]))
    atlas.save(OUTPUT / "battle-party-hd-v1.png", optimize=True)
    print(f"Wrote battle-party-hd-v1.png ({atlas.width} x {atlas.height})")


def process_nox_carbine_fire() -> None:
    source = Image.open(SOURCE / "battle-nox-carbine-fire-hd-v1.png").convert("RGBA")
    bounds = source.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Nox's carbine firing pose is empty.")
    frame = place_sprite(source.crop(bounds), PARTY_FRAME, 0.94)
    frame.save(OUTPUT / "battle-nox-carbine-fire-hd-v1.png", optimize=True)
    print(f"Wrote battle-nox-carbine-fire-hd-v1.png ({frame.width} x {frame.height})")


def process_enemies() -> None:
    source = Image.open(SOURCE / "battle-enemies-hd-chroma-v1.png")
    atlas = Image.new(
        "RGBA",
        (ENEMY_FRAME[0] * 4, ENEMY_FRAME[1] * 2),
        (0, 0, 0, 0),
    )
    for index, fill in enumerate(ENEMY_SCALE):
        column = index % 4
        row = index // 4
        if index == 6:
            # Storm Colossus was generated across both horizontal edges of its
            # original atlas cell. Use the outpainted, complete silhouette so
            # its shoulders and fists remain visible in battle.
            sprite = remove_key(Image.open(SOURCE / "storm-colossus-hd-chroma-v2.png"), True)
            bounds = sprite.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError("Empty Storm Colossus source")
            sprite = sprite.crop(bounds)
        else:
            sprite = extract_cell(source, column, row, 4, 2, remove_enclosed_key=index in (2, 3, 5))
        if index in (0, 2):
            # Prism Mite and Dust Sentinel both carried tiny detached pixels at
            # the bottom of their generated cells. Besides being visible beside
            # the shadow, those remnants prevented the real feet from being
            # aligned to the frame baseline.
            sprite = keep_largest_component(sprite)
        frame = place_sprite(sprite, ENEMY_FRAME, fill)
        if index == 5:
            # The generated Rift Hunter includes a tiny disconnected blade sliver
            # at the extreme right of its cell. It reads as a slicing artefact
            # once three copies are placed close together in a formation.
            frame.paste((0, 0, 0, 0), (110, 0, ENEMY_FRAME[0], ENEMY_FRAME[1]))
        atlas.alpha_composite(frame, (column * ENEMY_FRAME[0], row * ENEMY_FRAME[1]))
    atlas.save(OUTPUT / "battle-enemies-hd-v1.png", optimize=True)
    print(f"Wrote battle-enemies-hd-v1.png ({atlas.width} x {atlas.height})")


def process_tower_enemies() -> None:
    source = Image.open(SOURCE / "tower-enemies-hd-chroma-v1.png")
    atlas = Image.new(
        "RGBA",
        (ENEMY_FRAME[0] * 2, ENEMY_FRAME[1] * 2),
        (0, 0, 0, 0),
    )
    for index, fill in enumerate(TOWER_ENEMY_SCALE):
        column = index % 2
        row = index // 2
        # Coil Knight has magenta chroma islands trapped between the coils and
        # armour plating; treat them as key background just like the larger
        # enemy atlas does for enclosed pockets.
        sprite = extract_cell(source, column, row, 2, 2, remove_enclosed_key=index == 2)
        frame = place_sprite(sprite, ENEMY_FRAME, fill)
        atlas.alpha_composite(frame, (column * ENEMY_FRAME[0], row * ENEMY_FRAME[1]))
    atlas.save(OUTPUT / "tower-enemies-hd-v1.png", optimize=True)
    print(f"Wrote tower-enemies-hd-v1.png ({atlas.width} x {atlas.height})")


def process_undertide_enemies() -> None:
    source = Image.open(ROOT / "tmp/imagegen/undertide-enemies-hd-transparent-v1.png").convert("RGBA")
    atlas = Image.new("RGBA", (ENEMY_FRAME[0] * 4, ENEMY_FRAME[1]), (0, 0, 0, 0))
    for index in range(4):
        column = index % 2
        row = index // 2
        left = round(source.width * column / 2)
        top = round(source.height * row / 2)
        right = round(source.width * (column + 1) / 2)
        bottom = round(source.height * (row + 1) / 2)
        cell = source.crop((left, top, right, bottom))
        bounds = cell.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"Empty Undertide enemy {index}")
        frame = place_sprite(cell.crop(bounds), ENEMY_FRAME, (0.94, 0.9, 0.9, 0.98)[index])
        atlas.alpha_composite(frame, (index * ENEMY_FRAME[0], 0))
    atlas.save(OUTPUT / "undertide-enemies-hd-v1.png", optimize=True)
    print(f"Wrote undertide-enemies-hd-v1.png ({atlas.width} x {atlas.height})")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    process_party()
    process_nox_carbine_fire()
    process_enemies()
    process_tower_enemies()
    process_undertide_enemies()


if __name__ == "__main__":
    main()
