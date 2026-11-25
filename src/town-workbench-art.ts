import type { Point } from "./core";
import type { TownInteriorKey } from "./town-interior-id";
import workshopUrl from "./assets/town-interiors/workbench.webp";
import frames from "./town-workbench-frames.json";
import { drawFinishedKeepsake, prepareTownKeepsakeArt } from "./town-keepsake-art";
import { workbenchSize, type WorkbenchStep } from "./town-workbench-steps";

type Ink = CanvasRenderingContext2D;
interface WorkbenchView {
  room: TownInteriorKey;
  step?: WorkbenchStep;
  choice?: string;
  positions: ReadonlyMap<string, Point>;
  motion: number;
  rotation: number;
  elapsed: number;
  aligned: boolean;
  reduced: boolean;
}

type Sprite = keyof typeof frames;
let sheet: HTMLImageElement | undefined;
let loading: Promise<void> | undefined;

export function prepareWorkbenchArt() {
  if (!loading) {
    const image = new Image();
    image.src = workshopUrl;
    loading = image.decode().then(() => { sheet = image; }).catch(() => { loading = undefined; });
  }
  return Promise.all([loading, prepareTownKeepsakeArt()]);
}

function path(c: Ink, shape: string, color: string, fill = false) {
  const traced = new Path2D(shape);
  if (fill) { c.fillStyle = color; c.fill(traced); }
  else { c.strokeStyle = color; c.stroke(traced); }
}

function box(c: Ink, x: number, y: number, w: number, h: number, fill: string, r: number, border: string) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  c.fillStyle = fill; c.fill(); c.strokeStyle = border; c.stroke();
}

function plate(c: Ink, key: Sprite, x: number, y: number, w: number, h: number) {
  if (!sheet) return;
  const [sx, sy, sw, sh] = frames[key];
  c.drawImage(sheet, sx, sy, sw, sh, x - w / 2, y - h / 2, w, h);
}

function item(c: Ink, key: Sprite, x: number, y: number, w: number, h: number) {
  const [, , sw, sh] = frames[key];
  const size = Math.min(w / sw, h / sh);
  plate(c, key, x, y, sw * size, sh * size);
}

function disc(c: Ink, x: number, y: number, radius: number, fill: string | CanvasGradient, stroke: string) {
  c.beginPath(); c.arc(x, y, radius, 0, 2 * Math.PI);
  c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.stroke();
}

function star(c: Ink, x: number, y: number, radius: number, color: string) {
  c.save(); c.translate(x, y); c.scale(radius / 5, radius / 5);
  path(c, "M0-5L1.5-1.6 5-1.5 2.2 1 3.1 4.6 0 2.8 -3.1 4.6 -2.2 1 -5-1.5 -1.5-1.6Z", color, true);
  c.restore();
}

function guide(c: Ink, step: WorkbenchStep, aligned: boolean) {
  if (step.kind !== "place" && step.kind !== "slide") return;
  const { x, y } = step.target;
  c.save(); c.lineWidth = 1.15; c.setLineDash([3, 3]);
  c.shadowColor = "#553a28"; c.shadowBlur = 2;
  if (step.kind === "place") {
    box(c, x - 30, y - 20, 60, 40, aligned ? "#ffe49a44" : "#fff1c308", 4, "#fff0c5");
  } else {
    const at = step.tools[0].at;
    path(c, `M${at.x} ${at.y}L${x} ${y}`, "#fff0c5");
    c.setLineDash([]); c.translate(x, y); c.rotate(Math.atan2(y - at.y, x - at.x));
    path(c, "M-5 -4L0 0 -5 4", "#fff0c5");
  }
  c.restore();
}

// Each third of the same illustration folds about a fixed paper hinge.
function foldedAlbum(c: Ink, stage: string, progress: number) {
  const left = stage === "fold-left" ? 71 * (1 - progress) : stage === "unfold" ? 71 * progress : 0;
  const right = stage === "fold-right" ? 69 * (1 - progress) : stage === "unfold" ? 69 * progress : 69;
  const [sx, sy, sw, sh] = frames.panorama;
  for (const [x, w, start, span] of [[143 - left, left, 0, 71], [143, 54, 71, 54], [197, right, 125, 69]]) {
    if (w < .8) continue;
    box(c, x, 30, w, 73, "#f0ddba", 1, "#9a7350");
    if (sheet) c.drawImage(sheet, sx + sw * start / 194, sy, sw * span / 194, sh, x + .6, 33, Math.max(.2, w - 1.2), 67);
    const shade = c.createLinearGradient(x, 0, x + w, 0);
    shade.addColorStop(0, "#563d3338"); shade.addColorStop(.19, "#ead8ab06"); shade.addColorStop(1, "#543a2829");
    c.fillStyle = shade; c.fillRect(x, 31, w, 71);
  }
  c.save(); c.setLineDash([2, 2]);
  path(c, "M143 30v73m54-73v73", "#f8e8c8"); c.restore();
}

function dial(c: Ink, x: number, y: number, angle: number, crank: boolean) {
  c.save(); c.translate(x, y); c.rotate(angle * Math.PI / 180);
  if (crank) {
    const brass = c.createLinearGradient(-18, -24, 18, 24);
    brass.addColorStop(0, "#75533b"); brass.addColorStop(.34, "#dab784");
    brass.addColorStop(.54, "#a97e53"); brass.addColorStop(1, "#765137");
    disc(c, 0, 0, 27, brass, "#e6c286");
    disc(c, 0, 0, 22, brass, "#745238");
    c.rotate(.48);
    item(c, "lever", 10, 0, 36, 16);
  } else item(c, "copper", 0, 0, 61, 61);
  c.restore();
}

function radio(c: Ink, view: WorkbenchView) {
  plate(c, "mixer", 174, 70, 185, 97);
  // The track line is also the keyboard/pointer slider's centreline.
  c.lineWidth = 3; path(c, "M107 94H243", "#44332c");
  c.lineWidth = 1; path(c, "M107 96H243M237 89v10", "#efcb85");
  const listening = view.step?.id === "listen";
  if (listening) {
    item(c, "fader", 237, 94, 24, 16);
    for (const x of [136, 208]) {
      const swing = view.reduced ? 0 : Math.sin(view.elapsed * 8 + x);
      path(c, `M${x} 58l${swing * 9} -9`, "#9f4e37");
    }
    disc(c, 253, 72, 2.7, "#ee976a", "#583a32");
  }
}

function film(c: Ink, count: number, rotation: number, ticket: boolean) {
  plate(c, "theatre", 136, 66, 163, 108);
  // The three louver images are part of the painted theatre. Lift their
  // individual velvet covers in sequence as the crank travels.
  const doors = [[62, 45, 17, 39], [95, 46, 71, 30], [180, 45, 16, 39]];
  doors.forEach(([x, y, w, h], i) => {
    if (i < count) return;
    c.fillStyle = "#402a30d6"; c.fillRect(x, y, w, h);
  });
  c.save(); c.translate(244, 68);
  for (let mark = 0; mark < 3; mark++) {
    path(c, "M0 -29v-4", "#f1c987"); c.rotate(2*Math.PI/3);
  }
  c.restore();
  dial(c, 244, 68, rotation, true);
  if (ticket) box(c, 202, 76, 5, 19, "#503a31", 1, "#d2a569");
}

const toolSizes: Partial<Record<Sprite, [number, number]>> = {
  lilac: [39, 38], cream: [39, 38], press: [104, 68], mold: [46, 48], tray: [72, 48], cookies: [65, 49],
  flags: [65, 44], lamps: [65, 44], lever: [33, 17], creek: [66, 43], bells: [66, 43], fader: [27, 16], ticket: [58, 32],
};

function tools(c: Ink, view: WorkbenchView) {
  const { step, positions, rotation } = view;
  if (!step || step.kind === "wait") return;
  for (const tool of step.tools) {
    const { x, y } = positions.get(tool.id) ?? tool.at;
    c.save();
    if (tool.id === "copper") dial(c, x, y, rotation, false);
    if (tool.id === "lever") {
      c.lineWidth = 3.8; path(c, `M268 48L${x} ${y}`, "#583d32");
      c.lineWidth = 2; path(c, `M268 47L${x} ${y - 1}`, "#d4a257");
    }
    const key = tool.id as Sprite, size = toolSizes[key];
    if (size) {
      if (key === "ticket") { c.beginPath(); c.rect(204, 42, 116, 72); c.clip(); }
      item(c, key, x, y, size[0], size[1]);
    }
    c.restore();
  }
}

export function drawWorkbench(c: Ink, view: WorkbenchView) {
  const { room, step, choice, motion, rotation, aligned } = view;
  c.clearRect(0, 0, workbenchSize.width, workbenchSize.height);
  c.lineWidth = 1; c.lineJoin = c.lineCap = "round";
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
  if (!sheet) {
    box(c, 1, 1, 334, 132, "#cfb28a", 7, "#946d4c");
    if (!step) drawFinishedKeepsake(c, room, choice, 168, 67);
    if (step && step.kind !== "wait") {
      guide(c, step, aligned);
      c.font = 'bold 11px "Microsoft YaHei", sans-serif'; c.textAlign = "center";
      for (const tool of step.tools) {
        const { x, y } = view.positions.get(tool.id) ?? tool.at;
        box(c, x - 33, y - 12, 66, 24, "#fff0d1", 4, "#7f6247");
        c.fillStyle = "#593f34"; c.fillText(tool.label, x, y + 4, 62);
      }
      c.textAlign = "start";
    }
    return;
  }
  plate(c, room, 168, 67, 336, 134);
  if (!step) { drawFinishedKeepsake(c, room, choice, 168, 67); return; }
  switch (room) {
    case "florist":
      plate(c, "paper", 218, 67, 120, 76);
      if (step.id === "press") {
        item(c, choice === "cream" ? "cream" : "lilac", 218, 67, 37, 37);
        box(c, 165, 111, 106, 7, "#71533e", 3, "#664b38");
        if (motion > 0) box(c, 167, 113, 102 * motion, 3, "#e9c385", 1, "#e9c385");
      }
      break;
    case "baker":
      if (step.id === "dough") {
        plate(c, "dough", 223, 65, 126, 83);
        c.save(); c.translate(223, 68); c.strokeStyle = "#b78455"; c.setLineDash([2, 2]);
        path(c, "M0 14Q-20 0-13-9Q-8-15 0-10Q11-16 15-8Q19 0 0 14Z", "#ac774e"); c.restore();
      } else if (step.id === "tin") item(c, "tin", 231, 69, 105, 83);
      else {
        plate(c, "oven", 237, 64, 127, 105);
        if (step.id === "baking") {
          const flame = c.createRadialGradient(237, 78, 0, 237, 78, 24);
          const intensity = view.reduced ? 0.54 : 0.52 + 0.14 * Math.sin(view.elapsed * 8);
          flame.addColorStop(0, `rgba(255,181,86,${intensity})`);
          flame.addColorStop(1, "#ffae5500"); c.fillStyle = flame; c.fillRect(209, 54, 56, 47);
        }
      }
      break;
    case "maker":
      plate(c, "mount", 227, 70, 108, 93);
      if (step.id === "align") {
        path(c, "M85 40C65 46 61 77 83 83Q100 87 109 72C89 83 73 59 85 40Z", "#e0ba7d", true);
        star(c, 86 + Math.sin(rotation * Math.PI / 180) * 30, 64, 10, aligned ? "#fff1ab" : "#e0bd89");
        path(c, "M226 30v7", "#fff0bb");
      }
      break;
    case "post":
      plate(c, "stamp", 232, 69, 130, 90);
      if (step.id === "stamp") item(c, choice === "lamps" ? "lamps" : "flags", 218, 76, 63, 40);
      break;
    case "books": foldedAlbum(c, step.id, motion); break;
    case "radio":
      if (step.id === "track") plate(c, "deck", 230, 67, 123, 79);
      else radio(c, view);
      break;
    case "hall": film(c, step.id === "ticket" ? 3 : Math.min(3, Math.floor(motion * 3 + .001)), rotation, step.id === "ticket"); break;
  }
  guide(c, step, aligned);
  tools(c, view);
}
