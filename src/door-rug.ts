// A small floor textile, drawn once at map-pixel resolution. Its gently flared
// sides follow the room floor; the woven edge and fringe stay above y = 381.
let rug: HTMLCanvasElement | undefined;

function weaveRug() {
  const canvas = document.createElement("canvas");
  canvas.width = 80; canvas.height = 24;
  const c = canvas.getContext("2d")!;
  const pixel = (color: string, x: number, y: number, w = 1, h = 1) => {
    c.fillStyle = color; c.fillRect(x, y, w, h);
  };
  const edgeAt = (y: number) => 8 - Math.floor(y / 6);

  // A low, warm contact shadow, never a raised pedestal beneath the mat.
  pixel("#80574724", 5, 21, 70, 2);
  pixel("#80574712", 9, 23, 62);

  // Knotted short cotton fringes follow both receding side edges.
  for (let y = 4; y < 21; y += 3) {
    const edge = edgeAt(y);
    pixel("#bfa7a6", edge - 4, y + 1, 5);
    pixel("#f2e3c7", edge - 4, y, 4);
    pixel("#ddc8bd", edge - 5, y + (y % 2), 1);
    pixel("#bfa7a6", 79 - edge, y + 1, 5);
    pixel("#f2e3c7", 80 - edge, y, 4);
    pixel("#ddc8bd", 84 - edge, y + (y % 2), 1);
  }

  for (let y = 0; y < 22; y++) {
    const edge = edgeAt(y) + (y === 0 || y === 21 ? 1 : 0);
    pixel(y === 21 ? "#b496a4" : "#bba2b4", edge, y, 80 - edge * 2);
    if (y < 1 || y > 20) continue;
    pixel(y % 3 === 0 ? "#dac6ce" : "#e9d7d5", edge + 1, y, 78 - edge * 2);
    if (y < 4 || y > 17) continue;
    pixel(y % 3 === 0 ? "#e9d9c4" : "#efe1cc", edge + 4, y, 72 - edge * 2);
    // Broken, staggered warp threads: no hard checkerboard or flat fill.
    for (let x = edge + 5; x < 75 - edge; x += 3) {
      if ((x + y) % 4 === 0) pixel("#f7ecd8", x, y);
      else if ((x * 3 + y * 7) % 11 === 0) pixel("#ddcdbf", x, y);
    }
  }

  // Lilac binding, alternating cream stitches, and a rose inner running seam.
  for (const y of [2, 19]) {
    const edge = edgeAt(y);
    for (let x = edge + 2; x < 78 - edge; x += 4) {
      pixel("#c2b0c5", x, y, 2);
      pixel("#f8ead7", x + 2, y + (y === 2 ? 1 : -1));
    }
  }
  for (let y = 5; y < 18; y += 3) {
    const edge = edgeAt(y);
    pixel("#d0adb8", edge + 2, y);
    pixel("#d0adb8", 77 - edge, y);
  }

  const blossom = (x: number, y: number) => {
    pixel("#d6b0bd", x - 1, y - 1, 3, 3);
    pixel("#f8e9db", x, y - 2); pixel("#f8e9db", x, y + 2);
    pixel("#f8e9db", x - 2, y); pixel("#f8e9db", x + 2, y);
    pixel("#d6b784", x, y);
  };
  // Two little floral sprays leave the middle embroidery breathing room.
  for (const [x, direction] of [[19, -1], [60, 1]]) {
    pixel("#b3b49a", x + direction * 2, 14, 3);
    pixel("#a9af95", x + direction * 5, 12, 2);
    pixel("#c0c2a8", x + direction * 6, 11);
    blossom(x, 10);
    pixel("#cbb7d1", x + direction * 7, 16, 2);
    pixel("#e8dbe4", x + direction * 7, 15);
  }

  // A softly stitched pink fox: cream cheeks, tiny green/rose eyes and a curl.
  pixel("#c69baa", 33, 6, 3, 4); pixel("#c69baa", 44, 6, 3, 4);
  pixel("#f4ddcf", 34, 7, 1, 2); pixel("#f4ddcf", 45, 7, 1, 2);
  pixel("#d9acbb", 35, 8, 10, 2);
  pixel("#d9acbb", 34, 10, 12, 5);
  pixel("#d9acbb", 33, 11, 14, 3);
  pixel("#cba2af", 35, 15, 10);
  pixel("#ecd3ce", 38, 16, 4);
  pixel("#f7ead6", 34, 12, 4, 2); pixel("#f7ead6", 42, 12, 4, 2);
  pixel("#f4e3cf", 36, 14, 8); pixel("#f4e3cf", 38, 13, 4, 3);
  pixel("#8fa39a", 36, 11); pixel("#b47e92", 43, 11);
  pixel("#aa7a8d", 39, 13, 2);
  pixel("#e9c5ce", 39, 7, 2); pixel("#e9c5ce", 41, 8);
  return canvas;
}

export function drawDoorRug(context: CanvasRenderingContext2D) {
  rug ??= weaveRug();
  context.drawImage(rug, 260, 357);
}
