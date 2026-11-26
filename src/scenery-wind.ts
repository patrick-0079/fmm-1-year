import type { Point } from "./core";
import type { World } from "./world";
import { breezePulse, chimneyPhase, gustAge } from "./breeze.ts";
import { artScale, cellHeight, cellWidth } from "./costume-frames.ts";

type Rect = { x: number; y: number; w: number; h: number };
// World-space ovals describe the soft part of a twig or fold and its travel at
// the crest. Outside those ovals the original painted pixels stay registered.
type Fold = readonly [x: number, y: number, rx: number, ry: number, dx: number, dy: number];
interface Patch {
  folds: readonly Fold[];
  material?: "leaves" | "wheat";
}
interface Tile extends Rect {
  pixels: ImageData;
  dx: Float32Array;
  dy: Float32Array;
  light: Float32Array;
  poses: Map<number, HTMLCanvasElement>;
}
const patch = (...folds: Fold[]): Patch => ({ folds });
const curtain = patch([223.3, 78.8, 9.1, 8.6, 1.35, -0.85], [216.8, 75.7, 4.8, 8.7, 0.5, -0.28]);
const tent = patch([188.5, 146.1, 7.5, 8.2, 1.45, -1.75], [183.1, 140.2, 5, 7, 0.5, -0.55]);
const ivy = patch([417.5, 491.1, 4.8, 7.8, 1.35, -0.48], [484.8, 493.9, 4.1, 7.2, 1.1, -0.54]);
const ivyForeground = { ...ivy };
// Native 1536px art: the little blue openings between individual trailing
// leaves are narrower than the polygon describing the whole stone lintel.
const vineTips = [
  [693, 794, 39, 58],
  [805, 790, 34, 64],
] as const;
const ivySilhouettes = [
  [
    [699, 792],
    [729, 791],
    [730, 799],
    [725, 810],
    [722, 814],
    [719, 818],
    [720, 824],
    [717, 830],
    [716, 840],
    [713, 845],
    [709, 844],
    [709, 835],
    [707, 829],
    [703, 825],
    [704, 820],
    [708, 816],
    [702, 814],
    [701, 809],
    [702, 803],
    [703, 800],
  ],
  [
    [807, 790],
    [839, 789],
    [839, 797],
    [832, 803],
    [835, 809],
    [831, 816],
    [832, 820],
    [836, 825],
    [833, 829],
    [829, 831],
    [830, 845],
    [830, 850],
    [826, 852],
    [824, 849],
    [823, 843],
    [821, 841],
    [820, 835],
    [821, 831],
    [818, 830],
    [816, 826],
    [818, 816],
    [811, 817],
    [806, 814],
    [806, 805],
  ],
];
const wheat: Patch[] = [
  [79, 831],
  [110, 817],
  [151, 799],
].map(([x, y]) => ({
  material: "wheat",
  folds: [
    [x, y, 12, 6, 1.85, -0.52],
    [x + 5, y + 3, 7, 4, 1, -0.3],
  ],
}));
const canopyPatches = new Map<number, Patch>(
  [339, 659, 578].map((x, i) => {
    const y = [432, 359, 839][i];
    return [
      x,
      {
        material: "leaves",
        folds: [
          [x - 12, y - 55, 12, 9, -1.25, 0.45],
          [x + 11, y - 51, 10, 7, 1.65, -0.72],
        ],
      },
    ];
  }),
);
const gardenCrown = patch(
  [17, 26, 19, 22, 1.45, -0.58],
  [46, 15, 19, 20, 1.12, -0.8],
  [59, 38, 15, 15, 1.1, 0.38],
);
gardenCrown.material = "leaves";
const silhouetteBounds = new WeakMap<Point[], Rect>();
export function sceneryBounds(points: Point[]) {
  let area = silhouetteBounds.get(points);
  if (!area) {
    const x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y));
    area = { x, y, w: Math.max(...points.map((p) => p.x)) - x, h: Math.max(...points.map((p) => p.y)) - y };
    silhouetteBounds.set(points, area);
  }
  return area;
}
const overlaps = (a: Rect, b: Rect) => a.x + a.w > b.x && b.x + b.w > a.x && a.y + a.h > b.y && b.y + b.h > a.y;

/** Fractional branch deflection at each fruit stem on the separate apple layer. */
export function fruitShift(x: number, y: number, amount: number) {
  let dx = 0,
    dy = 0;
  for (const [cx, cy, rx, ry, mx, my] of gardenCrown.folds) {
    const weight = Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2);
    dx += mx * weight * weight;
    dy += my * weight * weight;
  }
  return { x: amount * dx, y: amount * dy };
}

const tiles = new WeakMap<HTMLImageElement, Map<Patch, Tile>>();
function makeTile(
  art: HTMLImageElement,
  width: number,
  height: number,
  recipe: Patch,
  outline?: Point[],
): Tile {
  const sx = art.naturalWidth / width,
    sy = art.naturalHeight / height;
  const full = recipe === gardenCrown ? { x: 0, y: 0, w: width, h: height } : outline && sceneryBounds(outline);
  const x0 = full ? full.x : Math.min(...recipe.folds.map(([x, , rx]) => x - rx));
  const y0 = full ? full.y : Math.min(...recipe.folds.map(([, y, , ry]) => y - ry));
  const x1 = full ? full.x + full.w : Math.max(...recipe.folds.map(([x, , rx]) => x + rx));
  const y1 = full
    ? Math.max(full.y + full.h, recipe === ivyForeground ? (854 * 600) / 1024 : 0)
    : Math.max(...recipe.folds.map(([, y, , ry]) => y + ry));
  const left = Math.max(0, Math.floor(sx * x0) - 2),
    top = Math.max(0, Math.floor(sy * y0) - 2);
  const w = Math.min(art.naturalWidth, Math.ceil(sx * x1) + 2) - left;
  const h = Math.min(art.naturalHeight, Math.ceil(sy * y1) + 2) - top;
  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const c = source.getContext("2d", { willReadFrequently: true })!;
  if (outline) {
    c.setTransform(sx, 0, 0, sy, -left, -top);
    c.beginPath();
    outline.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    if (recipe === ivyForeground) {
      for (const tip of ivySilhouettes) {
        tip.forEach(([x, y], i) =>
          i
            ? c.lineTo((x * width) / 1536, (y * height) / 1024)
            : c.moveTo((x * width) / 1536, (y * height) / 1024),
        );
        c.closePath();
      }
    }
    c.clip();
    c.resetTransform();
  }
  c.drawImage(art, left, top, w, h, 0, 0, w, h);
  const pixels = c.getImageData(0, 0, w, h),
    data = pixels.data;
  if (recipe === ivyForeground) {
    for (const [x, y, dw, dh] of vineTips) {
      for (
        let v = Math.floor((y * art.naturalHeight) / 1024) - top;
        v < Math.ceil(((y + dh) * art.naturalHeight) / 1024) - top;
        v++
      )
        for (
          let u = Math.floor((x * art.naturalWidth) / 1536) - left;
          u < Math.ceil(((x + dw) * art.naturalWidth) / 1536) - left;
          u++
        ) {
          const i = 4 * (v * w + u),
            r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          if (g - r > 7 && b > r - 1) data[i + 3] *= Math.max(0, Math.min(1, (g - b - 5) / 15));
        }
    }
  }
  const dx = new Float32Array(w * h),
    dy = new Float32Array(w * h),
    light = new Float32Array(w * h);
  for (let v = 0; v < h; v++)
    for (let u = 0; u < w; u++) {
      const i = v * w + u,
        x = (left + u + 0.5) / sx,
        y = (top + v + 0.5) / sy;
      const red = data[4 * i],
        green = data[4 * i + 1],
        blue = data[4 * i + 2];
      // Grass, rose petals and the fence share the field's rectangle. Only
      // amber grain and its painted shadows belong to the swaying ears.
      if (recipe.material === "wheat" && !(red > green && green > 1.4 * blue)) continue;
      for (const [cx, cy, rx, ry, mx, my] of recipe.folds) {
        const weight = Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2);
        if (!weight) continue;
        dx[i] += sx * mx * weight * weight;
        dy[i] += sy * my * weight * weight;
        if (recipe.material && data[i * 4 + 3]) {
          const sunlit = recipe.material === "wheat" || (green > red * 0.96 && green > blue * 1.13);
          if (sunlit) light[i] += weight * weight * Math.max(0, Math.min(1, (green - 35) / 120));
        }
      }
    }
  return { x: left / sx, y: top / sy, w: w / sx, h: h / sy, pixels, dx, dy, light, poses: new Map() };
}

// Inverse-map the actual brushstrokes. Premultiplying before interpolation
// protects transparent ivy tips/leaf edges from dark fringes. A pose is built
// once, then reused on subsequent gusts, with no per-frame canvas readback.
function pose(tile: Tile, step: number) {
  const saved = tile.poses.get(step);
  if (saved) return saved;
  const { data, width: w, height: h } = tile.pixels;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!,
    image = c.createImageData(w, h),
    out = image.data;
  const amount = step / 6;
  out.set(data);
  for (let v = 1; v < h - 1; v++)
    for (let u = 1; u < w - 1; u++) {
      const i = v * w + u;
      if (!tile.dx[i] && !tile.dy[i]) continue;
      const x = Math.max(0, Math.min(w - 1.001, u - tile.dx[i] * amount));
      const y = Math.max(0, Math.min(h - 1.001, v - tile.dy[i] * amount));
      const a = Math.floor(x),
        b = Math.floor(y),
        fx = x - a,
        fy = y - b;
      const tl = 4 * (b * w + a),
        tr = tl + 4,
        bl = tl + 4 * w,
        br = bl + 4;
      const p = (1 - fx) * (1 - fy) * data[tl + 3],
        q = fx * (1 - fy) * data[tr + 3];
      const r = (1 - fx) * fy * data[bl + 3],
        s = fx * fy * data[br + 3];
      const alpha = p + q + r + s,
        base = i * 4,
        glint = tile.light[i] * amount;
      for (let k = 0; k < 3; k++) {
        const color = alpha
          ? (data[tl + k] * p + data[tr + k] * q + data[bl + k] * r + data[br + k] * s) / alpha
          : 0;
        out[base + k] = color + (k === 0 ? 9 : k === 1 ? 6 : 2) * glint;
      }
      out[base + 3] = alpha;
    }
  c.putImageData(image, 0, 0);
  tile.poses.set(step, canvas);
  return canvas;
}

function tileFor(art: HTMLImageElement, width: number, height: number, recipe: Patch, outline?: Point[]) {
  let collection = tiles.get(art);
  if (!collection) {
    collection = new Map();
    tiles.set(art, collection);
  }
  let tile = collection.get(recipe);
  if (!tile) {
    tile = makeTile(art, width, height, recipe, outline);
    collection.set(recipe, tile);
  }
  return tile;
}

const modes = new WeakMap<World, { scene: string; last: number; strength: number; defer: boolean }>();
export function windAllowance(world: World) {
  const time = world.ambientTime;
  let mode = modes.get(world);
  if (!mode || mode.scene !== world.scene) {
    mode = { scene: world.scene, last: time, strength: 1, defer: false };
    modes.set(world, mode);
  }
  const dt = Math.max(0, Math.min(0.12, time - mode.last));
  mode.last = time;
  if (world.isPresentingDialogue()) {
    mode.defer = true;
    mode.strength = Math.max(0, mode.strength - dt * 2.5);
  } else {
    if (gustAge(time) < 0) mode.defer = false;
    if (!mode.defer) mode.strength = Math.min(1, mode.strength + dt * 2.5);
    else mode.strength = Math.max(0, mode.strength - dt * 2.5);
  }
  return mode.strength;
}
export function windLevel(world: World, delay: number) {
  return windAllowance(world) * breezePulse(world.ambientTime, delay);
}

function drawTile(c: CanvasRenderingContext2D, tile: Tile, step: number) {
  c.drawImage(pose(tile, step), tile.x, tile.y, tile.w, tile.h);
}
function drawMapTile(c: CanvasRenderingContext2D, world: World, tile: Tile, step: number) {
  c.save();
  if (world.scene === "town" && world.canvas.width / world.visibleArea.w < tile.pixels.width / tile.w) {
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
  }
  drawTile(c, tile, step);
  c.restore();
}
export function drawTreeInBreeze(c: CanvasRenderingContext2D, art: HTMLImageElement, wind: number) {
  const step = Math.round(wind * 6);
  if (!step) {
    c.drawImage(art, 0, 0, 72, 80);
    return;
  }
  const tile = tileFor(art, 72, 80, gardenCrown);
  // Draw all transparent branches exactly once, including the actor visible
  // through the gaps. The roots and lower trunk always use the standing pose.
  drawTile(c, tile, step);
}
function mapTile(c: CanvasRenderingContext2D, world: World, recipe: Patch, strength: number) {
  const art = world.sceneryArtwork,
    step = Math.round(strength * 6);
  if (!step || !art?.naturalWidth) return;
  drawMapTile(c, world, tileFor(art, world.config.width, world.config.height, recipe), step);
}
export function drawCurtainBreeze(c: CanvasRenderingContext2D, world: World) {
  mapTile(c, world, curtain, windLevel(world, 0.35));
}

// The roof and lintel paint over actors behind them. Composite the complete
// native silhouette once so its bent tips stay transparent over the actor.
// Also warp the ground pass, which shows through the space a lifted hem leaves.
const foregroundCopies = new Map<Patch, Patch>([[ivy, ivyForeground]]);
export function drawFabricGround(c: CanvasRenderingContext2D, world: World) {
  const recipe = world.scene === "ruins" ? ivy : tent;
  mapTile(c, world, recipe, windLevel(world, 0.5));
}
export function drawFlexibleCover(c: CanvasRenderingContext2D, world: World, outline: Point[], still: boolean) {
  if (!overlaps(sceneryBounds(outline), world.visibleArea)) return;
  const step = still ? 0 : Math.round(windLevel(world, 0.5) * 6),
    art = world.sceneryArtwork;
  if (!art?.naturalWidth || (!step && world.scene !== "ruins")) {
    world.drawMapFragment(c, outline);
    return;
  }
  const recipe = world.scene === "ruins" ? ivy : tent;
  movingCover(c, world, outline, art, recipe, step);
}
function movingCover(
  c: CanvasRenderingContext2D,
  world: World,
  outline: Point[],
  art: HTMLImageElement,
  recipe: Patch,
  step: number,
) {
  let copy = foregroundCopies.get(recipe);
  if (!copy) {
    copy = { ...recipe };
    foregroundCopies.set(recipe, copy);
  }
  const tile = tileFor(art, world.config.width, world.config.height, copy, outline);
  drawMapTile(c, world, tile, step);
}

let playerCutout: CanvasRenderingContext2D | undefined;

export function drawTownCrown(
  c: CanvasRenderingContext2D,
  world: World,
  tree: (Point & { points: Point[] }) | { y: number; cover: Rect & { mask: Path2D } },
  still: boolean,
) {
  const bounds = "cover" in tree ? tree.cover : sceneryBounds(tree.points);
  if (!overlaps(bounds, world.visibleArea)) return;
  const paint = () => {
    if ("cover" in tree) {
      world.drawMapCover(c, tree.cover, tree.cover.mask);
      return;
    }
    const recipe = canopyPatches.get(tree.x), art = world.sceneryArtwork;
    const step = recipe && !still ? Math.round(windLevel(world, tree.x === 339 ? 0 : tree.x === 659 ? .48 : .86) * 6) : 0;
    if (recipe && art?.naturalWidth && step) movingCover(c, world, tree.points, art, recipe, step);
    else world.drawMapFragment(c, tree.points);
  };
  if (world.actorHidden || world.player.y >= tree.y || c.canvas !== world.canvas) {
    paint();
    return;
  }
  // Leave room around the standing frame for hats and walking poses. The
  // actual dressed sprite supplies the alpha, including gaps between limbs.
  const w = cellWidth / artScale + 12, h = cellHeight / artScale + 12;
  const frame = { x: Math.round(world.player.x) - w / 2, y: Math.round(world.player.y) + 4 - h, w, h };
  if (!overlaps(bounds, frame)) {
    paint();
    return;
  }
  const t = c.getTransform();
  const left = Math.floor(frame.x * t.a + t.e), top = Math.floor(frame.y * t.d + t.f);
  const width = Math.ceil(w * t.a) + 1, height = Math.ceil(h * t.d) + 1;
  const cutout = playerCutout ??= document.createElement("canvas").getContext("2d")!;
  if (cutout.canvas.width !== width) cutout.canvas.width = width;
  if (cutout.canvas.height !== height) cutout.canvas.height = height;
  cutout.clearRect(0, 0, width, height);
  cutout.save();
  cutout.setTransform(t.a, 0, 0, t.d, t.e - left, t.f - top);
  world.drawPlayerSprite(cutout);
  cutout.restore();
  // Keep the pixels already on screen at the player's depth, including any
  // intervening props. Copy at device resolution so exposed edges stay sharp.
  cutout.globalCompositeOperation = "source-in";
  cutout.drawImage(c.canvas, left, top, width, height, 0, 0, width, height);
  cutout.globalCompositeOperation = "source-over";
  paint();
  c.save();
  c.resetTransform();
  c.globalAlpha *= .5;
  c.drawImage(cutout.canvas, left, top);
  c.restore();
}
function smoke(c: CanvasRenderingContext2D, x: number, y: number, time: number, bakery: boolean, gust: number) {
  // The farther wisp starts before the smaller, denser foreground curl.
  for (const [offset, duration, size] of bakery
    ? [
        [0.9, 4.6, 1],
        [2.05, 3.8, 0.72],
      ]
    : [[1.8, 4.1, 0.84]]) {
    const a = (((time + (bakery ? 0 : 3)) % (bakery ? 10.6 : 12.2)) - offset) / duration;
    if (a <= 0 || a >= 1) continue;
    const strength = Math.sin(Math.PI * a) ** 0.72;
    const rise = (bakery ? 30 : 26) * a,
      lean = a * a * (5 + 6 * gust);
    c.save();
    const cy = y - 1.4 - rise,
      cx = x + lean + 1.8 * a * Math.sin(a * 6 + offset);
    // The plume is connected to the dark mouth at first. Its tail pinches out
    // and lifts after half a stroke while the head keeps uncurling in the wind.
    const tail = Math.max(0, (a - 0.42) / 0.58);
    const tx = x + tail * lean * 0.72,
      ty = y - 1 - tail * tail * rise;
    const thread = c.createLinearGradient(tx, ty, cx, cy - 1);
    thread.addColorStop(0, bakery ? "#fff0cd25" : "#cbdef52a");
    thread.addColorStop(0.48, bakery ? "#eedbc2ab" : "#b5c9e2a0");
    thread.addColorStop(1, bakery ? "#f4e4c535" : "#c8d6e833");
    c.globalAlpha = strength * 0.69;
    c.fillStyle = thread;
    const broad = (1.1 + a * 2.2) * size;
    c.beginPath();
    c.moveTo(tx - 0.65, ty);
    c.bezierCurveTo(tx - 1.9, ty - rise * 0.22, cx + broad * 0.7, cy + 3, cx - broad, cy);
    c.quadraticCurveTo(cx, cy - 2.9 * size, cx + broad, cy);
    c.bezierCurveTo(cx + broad * 2.3, cy + 3, tx - 0.3, ty - rise * 0.22, tx + 0.75, ty);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    c.translate(cx, cy);
    c.scale(size * (0.46 + 0.95 * a), size * (0.55 + 0.95 * a));
    const grad = c.createRadialGradient(-0.9, 0, 0.2, 0, 0, 7.4);
    grad.addColorStop(0, bakery ? "#fff0cf" : "#ced9e5");
    grad.addColorStop(0.48, bakery ? "#e8d6be" : "#a8bed6");
    grad.addColorStop(1, bakery ? "#e7d8c500" : "#a1b5c800");
    c.globalAlpha *= strength * (bakery ? 0.35 : 0.28);
    c.fillStyle = grad;
    c.beginPath();
    c.ellipse(0, 0, 6.6, 6.2, -0.18, 0, 2 * Math.PI);
    c.fill();
    c.globalAlpha *= 0.65;
    c.strokeStyle = bakery ? "#fff5db" : "#e4e9ed";
    c.lineWidth = 1.3;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-0.6, 3.3);
    c.bezierCurveTo(-2.6, 1.8, -2.9, -1.8, -0.6, -2.7);
    c.stroke();
    c.restore();
  }
}
export function drawTownWeather(c: CanvasRenderingContext2D, world: World) {
  const view = world.visibleArea;
  if (view.x < 182 && view.y + view.h > 785)
    wheat.forEach((recipe, i) => mapTile(c, world, recipe, windLevel(world, 0.32 + i * 0.38)));
  const bakery = chimneyPhase(world.currentPhase) === "bakery";
  const x = bakery ? 795 : 810,
    y = bakery ? 72 : 600;
  if (x + 20 < view.x || x - 12 > view.x + view.w || y < view.y || y - 43 > view.y + view.h) return;
  c.save();
  // The bottom edge sits behind the near brick rim throughout the emission.
  c.beginPath();
  c.rect(x - 15, y - 45, 42, 45);
  c.clip();
  smoke(c, x, y, world.ambientTime, bakery, windLevel(world, 0.36));
  c.restore();
}
