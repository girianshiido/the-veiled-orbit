"""Normalize generated village sprites and portraits into production atlases."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
TEMP = ROOT / "tmp/imagegen"
SOURCE = ROOT / "art/source"
OUTPUT = ROOT / "public/assets/graphics"


def keep_largest_opaque_component(image: Image.Image) -> Image.Image:
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
                    (current_x - 1, current_y), (current_x + 1, current_y),
                    (current_x, current_y - 1), (current_x, current_y + 1),
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


def remove_connected_light_background(image: Image.Image) -> Image.Image:
    """Remove a generated light checkerboard without erasing enclosed costume whites."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    visited = bytearray(width * height)
    stack = [
        *(x for x in range(width)),
        *(x + (height - 1) * width for x in range(width)),
        *(y * width for y in range(1, height - 1)),
        *((width - 1) + y * width for y in range(1, height - 1)),
    ]

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return min(red, green, blue) >= 205 and max(red, green, blue) - min(red, green, blue) <= 18

    while stack:
        index = stack.pop()
        if visited[index]:
            continue
        visited[index] = 1
        x = index % width
        y = index // width
        if not is_background(x, y):
            continue
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            stack.append(index - 1)
        if x + 1 < width:
            stack.append(index + 1)
        if y > 0:
            stack.append(index - width)
        if y + 1 < height:
            stack.append(index + width)
    return rgba


def remove_connected_dark_background(image: Image.Image) -> Image.Image:
    """Make ImageGen's flat near-black staging background transparent.

    The walkable NPC silhouettes are deliberately kept away from the source
    image boundary, so a boundary flood preserves their dark one-pixel outlines
    while removing the otherwise visible staging rectangle.
    """
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    visited = bytearray(width * height)
    stack = [
        *(x for x in range(width)),
        *(x + (height - 1) * width for x in range(width)),
        *(y * width for y in range(1, height - 1)),
        *((width - 1) + y * width for y in range(1, height - 1)),
    ]

    def is_background(x: int, y: int) -> bool:
        red, green, blue, opacity = pixels[x, y]
        return opacity > 0 and max(red, green, blue) <= 38

    while stack:
        index = stack.pop()
        if visited[index]:
            continue
        visited[index] = 1
        x = index % width
        y = index // width
        if not is_background(x, y):
            continue
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        if x > 0:
            stack.append(index - 1)
        if x + 1 < width:
            stack.append(index + 1)
        if y > 0:
            stack.append(index - width)
        if y + 1 < height:
            stack.append(index + width)
    return rgba


def remove_light_edge_halo(image: Image.Image) -> Image.Image:
    """Trim neutral checkerboard remnants that touch the transparent edge."""
    rgba = image.convert("RGBA")
    width, height = rgba.size
    for _ in range(2):
        alpha = rgba.getchannel("A")
        pixels = rgba.load()
        trim: list[tuple[int, int]] = []
        for y in range(height):
            for x in range(width):
                red, green, blue, opacity = pixels[x, y]
                if opacity == 0 or min(red, green, blue) < 224 or max(red, green, blue) - min(red, green, blue) > 20:
                    continue
                if any(
                    alpha.getpixel((near_x, near_y)) == 0
                    for near_x, near_y in (
                        (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1),
                        (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1), (x + 1, y + 1),
                    )
                    if 0 <= near_x < width and 0 <= near_y < height
                ):
                    trim.append((x, y))
        for x, y in trim:
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)
    return rgba


def opaque_crop(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A").point(lambda value: 255 if value > 12 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Generated character cell is empty.")
    return cell.crop(bounds)


def contained(cell: Image.Image, size: tuple[int, int], padding: int = 0) -> Image.Image:
    asset = opaque_crop(cell)
    content_size = (size[0] - padding * 2, size[1] - padding * 2)
    asset.thumbnail(content_size, Image.Resampling.NEAREST)
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    result.alpha_composite(asset, ((size[0] - asset.width) // 2, size[1] - padding - asset.height))
    return result


def opaque_axis_spans(image: Image.Image, axis: str, expected: int) -> list[tuple[int, int]]:
    alpha = image.getchannel("A")
    length = image.width if axis == "x" else image.height
    cross_length = image.height if axis == "x" else image.width
    active = []
    for position in range(length):
        active.append(any(
            alpha.getpixel((position, cross)) > 12 if axis == "x" else alpha.getpixel((cross, position)) > 12
            for cross in range(cross_length)
        ))
    spans: list[tuple[int, int]] = []
    start: int | None = None
    for position, occupied in enumerate([*active, False]):
        if occupied and start is None:
            start = position
        elif not occupied and start is not None:
            spans.append((start, position))
            start = None
    if len(spans) != expected:
        raise ValueError(f"Expected {expected} transparent sprite bands on {axis}, found {len(spans)}.")
    return spans


def process_npcs() -> None:
    source = Image.open(TEMP / "village-npcs-hd-transparent-v1.png").convert("RGBA")
    source_cell = (source.width // 4, source.height // 6)
    target_cell = (48, 64)
    atlas = Image.new("RGBA", (target_cell[0] * 4, target_cell[1] * 7), (0, 0, 0, 0))
    for row in range(6):
        for column in range(4):
            # Image generation occasionally returns the same facing for both
            # profile cells.  Keep column 2 as the canonical left-facing pose
            # and derive a guaranteed right-facing pose from it.
            source_column = 2 if column == 3 else column
            cell = source.crop((
                source_column * source_cell[0], row * source_cell[1],
                (source_column + 1) * source_cell[0], (row + 1) * source_cell[1],
            ))
            cell = keep_largest_opaque_component(cell)
            if column == 3:
                cell = ImageOps.mirror(cell)
            atlas.alpha_composite(contained(cell, target_cell, 2), (column * 48, row * 64))

    surveyor = Image.open(TEMP / "surveyor-leth-hd-transparent-v1.png").convert("RGBA")
    surveyor_cell_width = surveyor.width // 3
    for column in range(4):
        source_column = 2 if column == 3 else column
        cell = surveyor.crop((
            source_column * surveyor_cell_width,
            0,
            (source_column + 1) * surveyor_cell_width,
            surveyor.height,
        ))
        cell = keep_largest_opaque_component(cell)
        if column == 3:
            cell = ImageOps.mirror(cell)
        atlas.alpha_composite(contained(cell, target_cell, 2), (column * 48, 6 * 64))
    atlas.save(OUTPUT / "village-npcs-hd-v3.png", optimize=True)


def process_regional_npcs() -> None:
    target_cell = (48, 64)
    atlas = Image.new("RGBA", (target_cell[0] * 4, target_cell[1] * 4), (0, 0, 0, 0))
    sources = (
        "npc-botanist-vale-hd-v3.png",
        "npc-courier-pell-hd-v3.png",
        "npc-boatman-ors-hd-v3.png",
        "npc-engineer-rhea-hd-v3.png",
    )
    for row, source_name in enumerate(sources):
        # The dedicated regional sheets already carry real alpha.  Running a
        # dark-colour flood on them would mistake their near-black ink lines
        # for staging background, particularly in the front-facing pose.
        source = Image.open(SOURCE / source_name).convert("RGBA")
        column_spans = opaque_axis_spans(source, "x", 4)
        for column in range(4):
            # A mirrored canonical profile is less error-prone than asking the
            # generator for two distinct but occasionally mismatched profiles.
            source_column = 2 if column == 3 else column
            left, right = column_spans[source_column]
            cell = source.crop((left, 0, right, source.height))
            if column == 3:
                cell = ImageOps.mirror(cell)
            # The old regional sheet had more detail than the normal town
            # residents and was visibly downscaled.  This shared compact frame
            # gives Vale, Pell, Ors and Rhea the same perceived scale as Mae.
            atlas.alpha_composite(contained(cell, target_cell, 3), (column * 48, row * 64))
    atlas.save(OUTPUT / "village-npcs-regional-hd-v3.png", optimize=True)


def process_service_portraits() -> None:
    source = Image.open(TEMP / "service-portraits-hd-transparent-v1.png").convert("RGBA")
    source_cell = (source.width // 4, source.height // 2)
    # Keep enough source detail for the real 640 x 480 canvas.  The renderer
    # reduces these portraits once; it must never enlarge a tiny pre-scaled
    # thumbnail.
    target_cell = (384, 432)
    atlas = Image.new("RGBA", (target_cell[0] * 4, target_cell[1] * 2), (0, 0, 0, 0))
    for row in range(2):
        for column in range(4):
            cell = opaque_crop(source.crop((
                column * source_cell[0], row * source_cell[1],
                (column + 1) * source_cell[0], (row + 1) * source_cell[1],
            )))
            portrait = ImageOps.fit(cell, target_cell, Image.Resampling.LANCZOS, centering=(0.5, 0.32))
            atlas.alpha_composite(portrait, (column * target_cell[0], row * target_cell[1]))
    atlas.save(OUTPUT / "service-portraits-hd-v1.png", optimize=True)


def process_party_portraits() -> None:
    source = Image.open(TEMP / "party-portraits-hd-transparent-v1.png").convert("RGBA")
    source_cell_width = source.width // 3
    target_cell = (512, 512)
    atlas = Image.new("RGBA", (target_cell[0] * 4, target_cell[1]), (0, 0, 0, 0))
    for column in range(3):
        cell = opaque_crop(source.crop((
            column * source_cell_width, 0,
            source.width if column == 2 else (column + 1) * source_cell_width, source.height,
        )))
        portrait = ImageOps.fit(cell, target_cell, Image.Resampling.LANCZOS, centering=(0.5, 0.34))
        atlas.alpha_composite(portrait, (column * target_cell[0], 0))
    sera = Image.open(TEMP / "sera-venn-hd-transparent-v1.png").convert("RGBA")
    portrait_cell = sera.crop((0, sera.height * 2 // 3, sera.width // 3, sera.height))
    portrait = ImageOps.fit(opaque_crop(portrait_cell), target_cell, Image.Resampling.LANCZOS, centering=(0.5, 0.34))
    atlas.alpha_composite(portrait, (3 * target_cell[0], 0))
    atlas.save(OUTPUT / "party-portraits-hd-v1.png", optimize=True)


def process_sera_overworld() -> None:
    source = Image.open(TEMP / "sera-venn-hd-transparent-v1.png").convert("RGBA")
    cell_width = source.width // 4
    row_height = source.height // 3
    atlas = Image.new("RGBA", (48 * 4, 64), (0, 0, 0, 0))
    for column in range(4):
        cell = source.crop((column * cell_width, 0, (column + 1) * cell_width, row_height))
        atlas.alpha_composite(contained(cell, (48, 64), 2), (column * 48, 0))
    atlas.save(OUTPUT / "sera-overworld-hd-v1.png", optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    process_npcs()
    process_regional_npcs()
    process_service_portraits()
    process_party_portraits()
    process_sera_overworld()
    print("Wrote village NPC and service/party portrait atlases.")


if __name__ == "__main__":
    main()
