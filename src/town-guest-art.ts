const cell = 128;
const baseline = 126;

export function townGuestPose(page: string) {
  return page === "receive-orange" || page === "orange-letter" || page === "show-card";
}

/** Both rows share the same scale and foot anchor. The apple is shorter within its cell. */
export function drawTownGuest(
  c: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  column: number,
  x: number,
  y: number,
  size: number,
  gesture = false,
) {
  if (!sheet.complete || !sheet.naturalWidth) return;
  c.drawImage(
    sheet, column * cell, gesture ? cell : 0, cell, cell,
    x - size / 2, y - size * baseline / cell, size, size,
  );
}
