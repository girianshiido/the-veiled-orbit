import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const outputDirectory = new URL("../public/assets/graphics/", import.meta.url);

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(surface) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(surface.width, 0);
  header.writeUInt32BE(surface.height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = surface.width * 4;
  const raw = Buffer.alloc((stride + 1) * surface.height);
  for (let y = 0; y < surface.height; y += 1) {
    const row = y * (stride + 1);
    raw[row] = 0;
    surface.pixels.copy(raw, row + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function surface(width, height) {
  const pixels = Buffer.alloc(width * height * 4);
  const paletteCache = new Map();
  const rgba = (hex) => {
    const cached = paletteCache.get(hex);
    if (cached) return cached;
    const source = hex.replace("#", "");
    const value = source.length === 6
      ? [Number.parseInt(source.slice(0, 2), 16), Number.parseInt(source.slice(2, 4), 16), Number.parseInt(source.slice(4, 6), 16), 255]
      : [Number.parseInt(source.slice(0, 2), 16), Number.parseInt(source.slice(2, 4), 16), Number.parseInt(source.slice(4, 6), 16), Number.parseInt(source.slice(6, 8), 16)];
    paletteCache.set(hex, value);
    return value;
  };
  const pixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (Math.floor(y) * width + Math.floor(x)) * 4;
    const [red, green, blue, alpha] = rgba(color);
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
    pixels[offset + 3] = alpha;
  };
  const rect = (x, y, rectWidth, rectHeight, color) => {
    for (let py = y; py < y + rectHeight; py += 1) {
      for (let px = x; px < x + rectWidth; px += 1) pixel(px, py, color);
    }
  };
  return { width, height, pixels, pixel, rect };
}

const ashPalette = {
  outline: "#081522",
  hairDark: "#0c382f",
  hair: "#176348",
  hairLight: "#3a9a66",
  skinDark: "#a96759",
  skin: "#d49373",
  skinLight: "#efb18d",
  navy: "#10234a",
  blue: "#1d4d8d",
  blueLight: "#4778ad",
  ivoryShade: "#9aa4ac",
  ivory: "#e1e2dc",
  cyan: "#55d8c0",
  gold: "#d5a444",
};

function drawAshFront(sheet, originX, originY, frame) {
  const { rect, pixel } = sheet;
  const p = ashPalette;
  const step = frame - 1;
  rect(originX + 4, originY + 1, 8, 1, p.outline);
  rect(originX + 3, originY + 2, 10, 4, p.outline);
  pixel(originX + 2, originY + 4, p.outline); pixel(originX + 13, originY + 4, p.outline);
  rect(originX + 4, originY + 2, 8, 3, p.hair);
  rect(originX + 5, originY + 1, 3, 2, p.hairLight);
  pixel(originX + 3, originY + 3, p.hairDark); pixel(originX + 11, originY + 2, p.hairDark);
  rect(originX + 5, originY + 5, 6, 4, p.skin);
  rect(originX + 6, originY + 5, 4, 1, p.skinLight);
  pixel(originX + 5, originY + 6, p.hairDark); pixel(originX + 10, originY + 6, p.hairDark);
  pixel(originX + 6, originY + 7, p.outline); pixel(originX + 9, originY + 7, p.outline);
  rect(originX + 3, originY + 9, 10, 2, p.outline);
  rect(originX + 2, originY + 10, 3, 7, p.ivoryShade); rect(originX + 11, originY + 10, 3, 7, p.ivoryShade);
  rect(originX + 3, originY + 10, 10, 8, p.navy);
  rect(originX + 5, originY + 10, 6, 7, p.blue);
  rect(originX + 3, originY + 10, 2, 3, p.ivory); rect(originX + 11, originY + 10, 2, 3, p.ivory);
  rect(originX + 7, originY + 11, 2, 3, p.cyan); pixel(originX + 7, originY + 14, p.gold);
  rect(originX + 2, originY + 15, 3, 4, p.blue); rect(originX + 11, originY + 15, 3, 4, p.blue);
  rect(originX + 5, originY + 17, 6, 2, p.ivoryShade); rect(originX + 6, originY + 17, 4, 1, p.gold);
  const left = step < 0 ? 4 : 5;
  const right = step > 0 ? 9 : 8;
  rect(originX + left, originY + 19, 3, 4, p.ivory);
  rect(originX + right, originY + 19, 3, 4, p.ivory);
  rect(originX + left - (step < 0 ? 1 : 0), originY + 22, 4, 2, p.navy);
  rect(originX + right, originY + 22, 4, 2, p.navy);
  pixel(originX + left, originY + 22, p.gold); pixel(originX + right + 2, originY + 22, p.gold);
}

function drawAshBack(sheet, originX, originY, frame) {
  drawAshFront(sheet, originX, originY, frame);
  const { rect, pixel } = sheet;
  const p = ashPalette;
  rect(originX + 4, originY + 4, 8, 5, p.hairDark);
  rect(originX + 5, originY + 2, 7, 5, p.hair);
  rect(originX + 6, originY + 2, 3, 2, p.hairLight);
  rect(originX + 4, originY + 9, 8, 8, p.blue);
  rect(originX + 6, originY + 10, 4, 5, p.navy);
  rect(originX + 7, originY + 11, 2, 3, p.cyan);
  pixel(originX + 4, originY + 13, p.gold); pixel(originX + 11, originY + 13, p.gold);
}

function drawAshSide(sheet, originX, originY, frame, facingRight) {
  const { rect, pixel } = sheet;
  const p = ashPalette;
  const mirror = (x, width = 1) => facingRight ? originX + x : originX + 16 - x - width;
  rect(mirror(4, 8), originY + 1, 8, 1, p.outline);
  rect(mirror(3, 9), originY + 2, 9, 5, p.outline);
  rect(mirror(4, 7), originY + 2, 7, 4, p.hair);
  rect(mirror(6, 3), originY + 1, 3, 2, p.hairLight);
  rect(mirror(9, 3), originY + 5, 3, 4, p.skin);
  pixel(mirror(11), originY + 6, p.skinLight); pixel(mirror(11), originY + 7, p.outline);
  rect(mirror(4, 8), originY + 9, 8, 9, p.navy);
  rect(mirror(5, 5), originY + 10, 5, 7, p.blue);
  rect(mirror(3, 3), originY + 10, 3, 4, p.ivory);
  rect(mirror(9, 3), originY + 10, 3, 3, p.ivoryShade);
  rect(mirror(10, 3), originY + 13, 3, 6, p.blue);
  pixel(mirror(10), originY + 14, p.cyan);
  rect(mirror(5, 6), originY + 17, 6, 2, p.ivoryShade);
  pixel(mirror(7), originY + 17, p.gold);
  const lead = frame === 0 ? 3 : frame === 2 ? 8 : 5;
  const trail = frame === 0 ? 8 : frame === 2 ? 4 : 8;
  rect(mirror(lead, 3), originY + 19, 3, 4, p.ivory);
  rect(mirror(trail, 3), originY + 19, 3, 4, p.ivoryShade);
  rect(mirror(lead + 1, 4), originY + 22, 4, 2, p.navy);
  rect(mirror(trail, 4), originY + 22, 4, 2, p.navy);
}

function drawAshFrontDetailed(sheet, originX, originY, frame) {
  const { rect, pixel } = sheet;
  const p = ashPalette;
  const leftStep = frame === 0 ? -1 : 0;
  const rightStep = frame === 2 ? 1 : 0;
  // Hair silhouette and layered spikes.
  rect(originX + 7, originY, 6, 1, p.outline);
  rect(originX + 5, originY + 1, 10, 1, p.outline);
  rect(originX + 4, originY + 2, 12, 5, p.outline);
  pixel(originX + 3, originY + 3, p.outline); pixel(originX + 2, originY + 5, p.outline);
  pixel(originX + 16, originY + 3, p.outline); pixel(originX + 17, originY + 5, p.outline);
  rect(originX + 5, originY + 2, 10, 4, p.hair);
  rect(originX + 7, originY + 1, 5, 2, p.hairLight);
  rect(originX + 4, originY + 4, 3, 3, p.hairDark); rect(originX + 13, originY + 4, 3, 3, p.hairDark);
  pixel(originX + 3, originY + 4, p.hair); pixel(originX + 16, originY + 4, p.hair);
  pixel(originX + 5, originY + 6, p.hair); pixel(originX + 7, originY + 6, p.hairDark);
  pixel(originX + 12, originY + 6, p.hairDark); pixel(originX + 14, originY + 6, p.hair);
  // Face with a narrow chin and readable eyes.
  rect(originX + 6, originY + 6, 8, 5, p.skin);
  rect(originX + 7, originY + 6, 6, 1, p.skinLight);
  pixel(originX + 6, originY + 7, p.hairDark); pixel(originX + 13, originY + 7, p.hairDark);
  pixel(originX + 8, originY + 8, p.outline); pixel(originX + 11, originY + 8, p.outline);
  pixel(originX + 7, originY + 9, p.skinDark); pixel(originX + 12, originY + 9, p.skinDark);
  rect(originX + 8, originY + 10, 4, 1, p.skin); rect(originX + 9, originY + 11, 2, 1, p.skinDark);
  // Collar, torso and distinct shoulder armor.
  rect(originX + 7, originY + 11, 6, 2, p.outline);
  rect(originX + 3, originY + 12, 4, 2, p.outline); rect(originX + 13, originY + 12, 4, 2, p.outline);
  rect(originX + 2, originY + 13, 5, 4, p.ivoryShade); rect(originX + 13, originY + 13, 5, 4, p.ivoryShade);
  rect(originX + 3, originY + 13, 3, 2, p.ivory); rect(originX + 14, originY + 13, 3, 2, p.ivory);
  rect(originX + 6, originY + 12, 8, 9, p.navy);
  rect(originX + 7, originY + 13, 6, 7, p.blue);
  pixel(originX + 7, originY + 13, p.blueLight); pixel(originX + 12, originY + 13, p.blueLight);
  rect(originX + 9, originY + 13, 2, 2, p.cyan); pixel(originX + 9, originY + 15, p.gold);
  // Arms and gloves are separated from the torso by outline pixels.
  rect(originX + 2, originY + 16, 4, 6, p.outline); rect(originX + 14, originY + 16, 4, 6, p.outline);
  rect(originX + 3, originY + 16, 3, 4, p.blue); rect(originX + 14, originY + 16, 3, 4, p.blue);
  rect(originX + 3, originY + 20, 3, 2, p.skin); rect(originX + 14, originY + 20, 3, 2, p.skin);
  pixel(originX + 3, originY + 17, p.gold); pixel(originX + 16, originY + 17, p.gold);
  // Belt, split legs and offset boots.
  rect(originX + 6, originY + 20, 8, 2, p.ivoryShade); rect(originX + 8, originY + 20, 4, 1, p.gold);
  rect(originX + 6 + leftStep, originY + 22, 3, 5, p.ivory);
  rect(originX + 11 + rightStep, originY + 22, 3, 5, p.ivory);
  pixel(originX + 8 + leftStep, originY + 23, p.blueLight); pixel(originX + 11 + rightStep, originY + 23, p.blueLight);
  rect(originX + 5 + leftStep, originY + 26, 4, 2, p.navy);
  rect(originX + 11 + rightStep, originY + 26, 4, 2, p.navy);
  pixel(originX + 6 + leftStep, originY + 26, p.gold); pixel(originX + 13 + rightStep, originY + 26, p.gold);
}

function drawAshBackDetailed(sheet, originX, originY, frame) {
  drawAshFrontDetailed(sheet, originX, originY, frame);
  const { rect, pixel } = sheet;
  const p = ashPalette;
  rect(originX + 5, originY + 5, 10, 7, p.hairDark);
  rect(originX + 6, originY + 2, 9, 6, p.hair);
  rect(originX + 8, originY + 1, 5, 3, p.hairLight);
  pixel(originX + 4, originY + 5, p.hair); pixel(originX + 15, originY + 5, p.hairDark);
  rect(originX + 6, originY + 12, 8, 9, p.blue);
  rect(originX + 7, originY + 13, 6, 6, p.navy);
  rect(originX + 9, originY + 14, 2, 3, p.cyan);
  pixel(originX + 6, originY + 18, p.gold); pixel(originX + 13, originY + 18, p.gold);
}

function drawAshSideDetailed(sheet, originX, originY, frame, facingRight) {
  const { rect, pixel } = sheet;
  const p = ashPalette;
  const mirror = (x, width = 1) => facingRight ? originX + x : originX + 20 - x - width;
  rect(mirror(7, 6), originY, 6, 1, p.outline);
  rect(mirror(5, 10), originY + 1, 10, 1, p.outline);
  rect(mirror(4, 12), originY + 2, 12, 5, p.outline);
  pixel(mirror(3), originY + 4, p.outline); pixel(mirror(16), originY + 5, p.outline);
  rect(mirror(5, 10), originY + 2, 10, 4, p.hair);
  rect(mirror(7, 5), originY + 1, 5, 2, p.hairLight);
  rect(mirror(4, 4), originY + 4, 4, 4, p.hairDark);
  pixel(mirror(14), originY + 4, p.hair); pixel(mirror(15), originY + 5, p.hair);
  rect(mirror(12, 4), originY + 6, 4, 5, p.skin);
  pixel(mirror(15), originY + 7, p.skinLight); pixel(mirror(15), originY + 8, p.outline);
  pixel(mirror(13), originY + 10, p.skinDark);
  rect(mirror(6, 8), originY + 11, 8, 2, p.outline);
  rect(mirror(4, 5), originY + 12, 5, 5, p.ivoryShade);
  rect(mirror(5, 3), originY + 12, 3, 3, p.ivory);
  rect(mirror(7, 7), originY + 12, 7, 9, p.navy);
  rect(mirror(8, 5), originY + 13, 5, 7, p.blue);
  rect(mirror(11, 2), originY + 13, 2, 2, p.cyan); pixel(mirror(11), originY + 15, p.gold);
  rect(mirror(12, 4), originY + 15, 4, 7, p.outline);
  rect(mirror(12, 3), originY + 16, 3, 4, p.blue); rect(mirror(13, 3), originY + 20, 3, 2, p.skin);
  pixel(mirror(14), originY + 17, p.gold);
  rect(mirror(7, 7), originY + 20, 7, 2, p.ivoryShade); pixel(mirror(10), originY + 20, p.gold);
  const leading = frame === 0 ? 4 : frame === 2 ? 11 : 7;
  const trailing = frame === 0 ? 10 : frame === 2 ? 6 : 11;
  rect(mirror(leading, 3), originY + 22, 3, 5, p.ivory);
  rect(mirror(trailing, 3), originY + 22, 3, 5, p.ivoryShade);
  rect(mirror(leading + 1, 5), originY + 26, 5, 2, p.navy);
  rect(mirror(trailing, 4), originY + 26, 4, 2, p.navy);
  pixel(mirror(leading + 2), originY + 26, p.gold); pixel(mirror(trailing + 1), originY + 26, p.gold);
}

function createAshSheet() {
  const sheet = surface(60, 112);
  for (let frame = 0; frame < 3; frame += 1) {
    drawAshFrontDetailed(sheet, frame * 20, 0, frame);
    drawAshSideDetailed(sheet, frame * 20, 28, frame, false);
    drawAshSideDetailed(sheet, frame * 20, 56, frame, true);
    drawAshBackDetailed(sheet, frame * 20, 84, frame);
  }
  return sheet;
}

function createLumenTiles() {
  const image = surface(64, 16);
  const { rect, pixel } = image;
  rect(0, 0, 16, 16, "#3e7651");
  rect(0, 0, 16, 1, "#4f8c61");
  for (const [x, y, color] of [[2, 4, "#68a46d"], [11, 2, "#2e5d43"], [6, 10, "#76ad73"], [14, 13, "#294f3c"], [3, 15, "#568e5e"]]) pixel(x, y, color);
  rect(16, 0, 16, 16, "#737982");
  rect(16, 0, 16, 1, "#a0a4a5"); rect(16, 8, 16, 1, "#555e6a");
  rect(23, 1, 1, 7, "#4a5460"); rect(19, 9, 1, 7, "#4a5460"); rect(28, 9, 1, 7, "#4a5460");
  rect(17, 7, 3, 1, "#59cbb9"); rect(29, 15, 2, 1, "#59cbb9");
  rect(32, 0, 16, 16, "#3e7651");
  rect(37, 8, 2, 5, "#244b38"); rect(42, 5, 2, 8, "#2b5d40");
  rect(35, 5, 6, 5, "#538d58"); rect(40, 2, 6, 6, "#68a567");
  pixel(36, 4, "#9bd47d"); pixel(44, 3, "#85c879"); pixel(46, 11, "#b899d5");
  rect(48, 0, 16, 16, "#25313d");
  rect(54, 0, 5, 16, "#184c66"); rect(55, 0, 3, 16, "#287c91");
  rect(56, 0, 1, 16, "#67d6cb"); rect(48, 7, 6, 2, "#55606c"); rect(59, 7, 5, 2, "#55606c");
  pixel(50, 4, "#7f8790"); pixel(61, 12, "#8c93a0");
  return image;
}

function createLumenScenery() {
  const image = surface(192, 80);
  const { rect, pixel } = image;
  // Ash's house: 80 x 80, door centred on the 16-pixel threshold.
  rect(3, 75, 74, 4, "#07101799");
  rect(5, 29, 70, 47, "#263746"); rect(9, 34, 62, 36, "#455866");
  rect(2, 23, 76, 10, "#162534"); rect(8, 16, 64, 9, "#64727b"); rect(17, 10, 46, 8, "#7d8789");
  rect(26, 4, 28, 8, "#344956"); rect(31, 1, 18, 5, "#526a72");
  rect(7, 25, 68, 2, "#55d8c0");
  rect(14, 41, 13, 12, "#13232f"); rect(16, 43, 9, 4, "#55d8c0");
  rect(53, 41, 13, 12, "#13232f"); rect(55, 43, 9, 4, "#55d8c0");
  rect(30, 46, 20, 30, "#101b29"); rect(32, 48, 16, 28, "#1c3150"); rect(35, 51, 10, 25, "#48606c");
  rect(37, 53, 6, 23, "#2d6d71"); rect(38, 55, 4, 17, "#55d8c0"); pixel(44, 62, "#d5a444");
  rect(11, 67, 18, 5, "#32434e"); rect(51, 67, 18, 5, "#32434e");
  // Signal tree: 48 x 64 at x=80.
  rect(85, 58, 38, 5, "#07101799");
  rect(99, 28, 11, 31, "#233a34"); rect(102, 29, 6, 30, "#6d6551"); rect(105, 31, 2, 25, "#a08a5e");
  rect(91, 17, 29, 20, "#204d35"); rect(84, 20, 18, 15, "#2d6640"); rect(104, 14, 20, 20, "#317246");
  rect(89, 10, 24, 17, "#3d8550"); rect(99, 5, 18, 15, "#4e9859"); rect(86, 16, 10, 7, "#65aa65");
  pixel(105, 8, "#8bcf78"); pixel(116, 18, "#55d8c0"); pixel(92, 21, "#d2b5df");
  rect(96, 40, 7, 3, "#254133"); rect(108, 38, 8, 3, "#254133"); rect(100, 50, 12, 3, "#17302a");
  // Compact weapon shop: 64 x 80 at x=128.
  rect(130, 75, 60, 4, "#07101799"); rect(133, 29, 54, 47, "#2b3946"); rect(137, 34, 46, 36, "#4b5861");
  rect(129, 23, 62, 10, "#172431"); rect(135, 16, 50, 9, "#52626c"); rect(143, 10, 34, 8, "#68757b");
  rect(134, 25, 52, 2, "#d5a444");
  rect(140, 41, 15, 12, "#111d29"); rect(142, 43, 11, 3, "#55d8c0"); rect(165, 41, 15, 12, "#111d29"); rect(167, 43, 11, 3, "#55d8c0");
  rect(152, 47, 16, 29, "#121d2b"); rect(154, 50, 12, 26, "#314860"); rect(157, 53, 6, 23, "#1e7580"); pixel(164, 62, "#d5a444");
  rect(151, 4, 18, 16, "#182635"); rect(153, 6, 14, 12, "#314758");
  for (let offset = 0; offset < 9; offset += 1) pixel(156 + offset, 15 - offset, "#e1e2dc");
  rect(155, 14, 5, 2, "#e1e2dc"); rect(163, 6, 4, 2, "#55d8c0");
  return image;
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(new URL("ash-overworld-v2.png", outputDirectory), encodePng(createAshSheet())),
  writeFile(new URL("lumen-study-tiles-v1.png", outputDirectory), encodePng(createLumenTiles())),
  writeFile(new URL("lumen-study-scenery-v1.png", outputDirectory), encodePng(createLumenScenery())),
]);
