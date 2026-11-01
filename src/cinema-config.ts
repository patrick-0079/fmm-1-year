export const gardenFilm = {
  title: "芙芙的周年放映",
  src: "https://cdn.xn--nemu-k77ja176r.space/1-year/2026-08-30%2000-28-58.mp4",
};
// Local display coordinates. The painted TV is tilted, so its world placement
// comes from all four inner corners, rather than an axis-aligned rectangle.
export const gardenScreen = { x: 0, y: 0, w: 105, h: 47 };
const artScale = 900 / 1536;
export const gardenScreenCorners = [
  [1130, 343], // top left, measured on garden-colorful.webp (1536 × 1024)
  [1309, 352], // top right
  [1309, 431], // bottom right
  [1130, 420], // bottom left
].map(([x, y]) => ({ x: x * artScale, y: y * artScale }));
