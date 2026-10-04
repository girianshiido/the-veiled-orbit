const TILE_SIZE = 16;
const TILE_COUNT = 22;

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

export function createPixelTileset(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE * TILE_COUNT;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create the temporary tileset.");
  ctx.imageSmoothingEnabled = false;

  const tile = (id: number, painter: (x: number) => void): void => painter(id * TILE_SIZE);

  tile(1, (x) => {
    ctx.fillStyle = "#365f52"; ctx.fillRect(x, 0, 16, 16);
    for (let y = 2; y < 16; y += 4) for (let px = 1 + (y % 3); px < 16; px += 5) dot(ctx, x + px, y, "#487666");
    dot(ctx, x + 12, 4, "#203f3a"); dot(ctx, x + 3, 12, "#274c43");
  });
  tile(2, (x) => {
    ctx.fillStyle = "#b7a66c"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#8f8054"; ctx.fillRect(x, 0, 16, 1); ctx.fillRect(x, 15, 16, 1);
    for (let px = 2; px < 16; px += 5) dot(ctx, x + px, 6 + (px % 3), "#d2c183");
  });
  tile(3, (x) => {
    ctx.fillStyle = "#20314a"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#2e4962"; ctx.fillRect(x, 2, 16, 2); ctx.fillRect(x, 9, 16, 2);
    ctx.fillStyle = "#63bfd0"; ctx.fillRect(x, 5, 16, 1); ctx.fillRect(x, 13, 16, 1);
    for (let px = 0; px < 16; px += 4) dot(ctx, x + px, 6, "#8ae2df");
  });
  tile(4, (x) => {
    ctx.fillStyle = "#172139"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#465676"; ctx.fillRect(x, 0, 16, 2); ctx.fillRect(x, 14, 16, 2);
    ctx.fillStyle = "#2b3857"; ctx.fillRect(x, 7, 16, 2);
    ctx.fillStyle = "#667b98"; ctx.fillRect(x + 2, 3, 5, 3); ctx.fillRect(x + 9, 9, 5, 3);
  });
  tile(5, (x) => {
    ctx.fillStyle = "#31394b"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#48546c"; ctx.fillRect(x, 0, 16, 1); ctx.fillRect(x, 8, 16, 1);
    ctx.fillStyle = "#202839"; ctx.fillRect(x + 7, 1, 1, 7); ctx.fillRect(x + 3, 9, 1, 7); ctx.fillRect(x + 12, 9, 1, 7);
  });
  tile(6, (x) => {
    ctx.fillStyle = "#2c3546"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#39465b"; ctx.fillRect(x, 0, 16, 1); ctx.fillRect(x, 8, 16, 1); ctx.fillRect(x + 8, 0, 1, 8);
    ctx.fillStyle = "#202838"; ctx.fillRect(x, 15, 16, 1); ctx.fillRect(x + 4, 8, 1, 8);
    dot(ctx, x + 13, 3, "#607089");
  });
  tile(7, (x) => {
    ctx.fillStyle = "#111827"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#5f456b"; ctx.fillRect(x + 3, 1, 10, 15);
    ctx.fillStyle = "#211b31"; ctx.fillRect(x + 5, 3, 6, 13);
    ctx.fillStyle = "#78e0c2"; ctx.fillRect(x + 10, 8, 1, 2);
  });
  tile(8, (x) => {
    ctx.fillStyle = "#365f52"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#203d37"; ctx.fillRect(x + 5, 8, 6, 8);
    ctx.fillStyle = "#497a64"; ctx.fillRect(x + 2, 3, 12, 7);
    ctx.fillStyle = "#5d9474"; ctx.fillRect(x + 4, 1, 8, 8);
    dot(ctx, x + 3, 5, "#85b88e"); dot(ctx, x + 12, 4, "#85b88e");
  });
  tile(9, (x) => {
    ctx.fillStyle = "#365f52"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#7467a2"; ctx.fillRect(x + 4, 9, 2, 2); ctx.fillRect(x + 10, 5, 2, 2);
    dot(ctx, x + 5, 8, "#d9b5ef"); dot(ctx, x + 11, 4, "#d9b5ef");
  });
  tile(10, (x) => {
    ctx.fillStyle = "#172139"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#33445e"; ctx.fillRect(x + 2, 3, 12, 11);
    ctx.fillStyle = "#0a101d"; ctx.fillRect(x + 4, 5, 8, 5);
    ctx.fillStyle = "#78e0c2"; ctx.fillRect(x + 5, 6, 6, 1); dot(ctx, x + 10, 8, "#e9cf6a");
  });
  tile(11, (x) => {
    ctx.fillStyle = "#675f67"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#77717c"; ctx.fillRect(x, 3, 16, 1); ctx.fillRect(x, 12, 16, 1);
    ctx.fillStyle = "#4a4857"; ctx.fillRect(x + 3, 0, 1, 4); ctx.fillRect(x + 11, 4, 1, 9);
    ctx.fillStyle = "#8f8493"; ctx.fillRect(x + 4, 4, 6, 1); ctx.fillRect(x + 12, 13, 3, 1);
    dot(ctx, x + 2, 9, "#d1a66c"); dot(ctx, x + 8, 14, "#78e0c2");
  });
  tile(12, (x) => {
    ctx.fillStyle = "#2c3546"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#172334"; ctx.fillRect(x, 6, 16, 4);
    ctx.fillStyle = "#55637b"; ctx.fillRect(x, 6, 16, 1); ctx.fillRect(x, 9, 16, 1);
    ctx.fillStyle = "#78e0c2"; ctx.fillRect(x + 1, 7, 3, 2); ctx.fillRect(x + 7, 7, 2, 2); ctx.fillRect(x + 12, 7, 3, 2);
    dot(ctx, x + 5, 3, "#617089"); dot(ctx, x + 10, 13, "#617089");
  });
  tile(13, (x) => {
    ctx.fillStyle = "#0b101b"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#8192a8"; ctx.fillRect(x, 0, 16, 2);
    ctx.fillStyle = "#4e5f75"; ctx.fillRect(x, 2, 16, 4);
    ctx.fillStyle = "#202b3d"; ctx.fillRect(x, 6, 16, 7);
    ctx.fillStyle = "#121927"; ctx.fillRect(x, 13, 16, 3);
    ctx.fillStyle = "#0a0f19"; ctx.fillRect(x + 7, 6, 1, 7);
    ctx.fillStyle = "#34445a"; ctx.fillRect(x + 8, 7, 1, 5);
    ctx.fillStyle = "#78e0c2"; ctx.fillRect(x + 2, 4, 2, 1); ctx.fillRect(x + 12, 10, 1, 1);
    ctx.fillStyle = "#a9b6c8"; ctx.fillRect(x + 1, 1, 5, 1);
  });
  tile(14, (x) => {
    ctx.fillStyle = "#253f43"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#31545a"; ctx.fillRect(x, 0, 16, 1); ctx.fillRect(x, 8, 16, 1);
    for (let px = 2; px < 16; px += 5) dot(ctx, x + px, 4 + (px % 4), "#3f6768");
    dot(ctx, x + 13, 12, "#6b6581"); dot(ctx, x + 5, 14, "#182f35");
  });
  tile(15, (x) => {
    ctx.fillStyle = "#58656f"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#74818a"; ctx.fillRect(x, 0, 16, 1); ctx.fillRect(x, 8, 16, 1);
    ctx.fillStyle = "#3d4a58"; ctx.fillRect(x + 7, 1, 1, 7); ctx.fillRect(x + 3, 9, 1, 7); ctx.fillRect(x + 12, 9, 1, 7);
    ctx.fillStyle = "#78e0c2"; ctx.fillRect(x + 1, 7, 3, 1); ctx.fillRect(x + 12, 15, 3, 1);
  });
  tile(16, (x) => {
    ctx.fillStyle = "#163b58"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#235877"; ctx.fillRect(x, 3, 7, 1); ctx.fillRect(x + 9, 11, 7, 1);
    ctx.fillStyle = "#357b92"; ctx.fillRect(x + 4, 7, 8, 1); ctx.fillRect(x + 1, 15, 5, 1);
    dot(ctx, x + 13, 4, "#78c5c4"); dot(ctx, x + 2, 10, "#1e4c6b");
  });
  tile(17, (x) => {
    ctx.fillStyle = "#71805e"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#9a9b68"; ctx.fillRect(x, 0, 16, 3);
    ctx.fillStyle = "#4d6c57"; ctx.fillRect(x, 3, 16, 13);
    ctx.fillStyle = "#315346"; ctx.fillRect(x, 8, 16, 1);
    dot(ctx, x + 4, 5, "#b8aa70"); dot(ctx, x + 12, 13, "#6b8d68");
  });
  tile(18, (x) => {
    ctx.fillStyle = "#2f5148"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#263842"; ctx.fillRect(x + 1, 12, 14, 4);
    ctx.fillStyle = "#52636a";
    ctx.fillRect(x + 3, 10, 11, 3); ctx.fillRect(x + 5, 7, 8, 3); ctx.fillRect(x + 7, 4, 5, 3); ctx.fillRect(x + 9, 2, 2, 2);
    ctx.fillStyle = "#738188";
    ctx.fillRect(x + 7, 7, 3, 3); ctx.fillRect(x + 9, 4, 2, 3); ctx.fillRect(x + 10, 2, 1, 2);
    ctx.fillStyle = "#1d2a34";
    ctx.fillRect(x + 3, 13, 3, 3); ctx.fillRect(x + 11, 12, 3, 4); dot(ctx, x + 6, 11, "#9aa39c");
  });
  tile(19, (x) => {
    ctx.fillStyle = "#2f5148"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#24323d"; ctx.fillRect(x + 1, 11, 14, 5);
    ctx.fillStyle = "#5f6d73";
    ctx.fillRect(x + 2, 11, 12, 3); ctx.fillRect(x + 4, 7, 9, 4); ctx.fillRect(x + 6, 4, 6, 3); ctx.fillRect(x + 8, 1, 3, 3);
    ctx.fillStyle = "#8d9998";
    ctx.fillRect(x + 8, 2, 3, 2); ctx.fillRect(x + 7, 4, 4, 2); ctx.fillRect(x + 9, 6, 3, 3);
    ctx.fillStyle = "#d4d6c2"; ctx.fillRect(x + 9, 1, 2, 1); dot(ctx, x + 5, 10, "#aab1a7");
    ctx.fillStyle = "#19252f"; ctx.fillRect(x + 2, 14, 4, 2); ctx.fillRect(x + 12, 12, 3, 4);
  });
  tile(20, (x) => {
    ctx.fillStyle = "#365f52"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#253f3a"; ctx.fillRect(x + 1, 9, 14, 7);
    ctx.fillStyle = "#456e59"; ctx.fillRect(x + 2, 5, 5, 8); ctx.fillRect(x + 9, 3, 5, 10);
    ctx.fillStyle = "#6a9272"; ctx.fillRect(x + 3, 4, 3, 4); ctx.fillRect(x + 10, 2, 3, 5);
    dot(ctx, x + 6, 10, "#78e0c2"); dot(ctx, x + 12, 8, "#d9b5ef");
  });
  tile(21, (x) => {
    ctx.fillStyle = "#4b5b57"; ctx.fillRect(x, 0, 16, 16);
    ctx.fillStyle = "#65706a"; ctx.fillRect(x, 1, 16, 2); ctx.fillRect(x, 9, 16, 1);
    ctx.fillStyle = "#394945"; ctx.fillRect(x + 2, 4, 5, 3); ctx.fillRect(x + 10, 11, 5, 3);
    ctx.fillStyle = "#8a8a70"; ctx.fillRect(x + 3, 5, 3, 1); ctx.fillRect(x + 11, 12, 3, 1);
    dot(ctx, x + 8, 6, "#78e0c2"); dot(ctx, x + 5, 13, "#d9b5ef");
  });

  return canvas;
}
