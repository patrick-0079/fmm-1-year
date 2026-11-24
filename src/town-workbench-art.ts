import type { Point } from "./core";
import type { TownInteriorKey } from "./town-interior-id";
import { drawTownKeepsake } from "./town-keepsake-art";
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

const ink = "#654b50", cream = "#f1d7ae", gold = "#dbad75";
const palettes: Record<TownInteriorKey, [string, string, string]> = {
  florist: ["#a98864", "#7b9076", "#dac0a1"],
  baker: ["#be8665", "#b56d67", "#e5bc91"],
  maker: ["#8c7189", "#66526e", "#c7a1a7"],
  post: ["#a38468", "#6c8b77", "#d3b794"],
  books: ["#a28265", "#719589", "#d7bf9f"],
  radio: ["#707990", "#535e76", "#b3a2a7"],
  hall: ["#ae826e", "#965e72", "#ddba94"],
};

function box(c: Ink, x: number, y: number, w: number, h: number, fill: string, r = 3, border = ink) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = border;
  c.stroke();
}

function path(c: Ink, shape: string, color: string, fill = false) {
  const traced = new Path2D(shape);
  if (fill) {
    c.fillStyle = color;
    c.fill(traced);
  } else {
    c.strokeStyle = color;
    c.stroke(traced);
  }
}

function ellipse(c: Ink, x: number, y: number, rx: number, ry: number, fill: string, border?: string) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (border) { c.strokeStyle = border; c.stroke(); }
}

function text(c: Ink, value: string, x: number, y: number, color = ink) {
  c.fillStyle = color;
  c.font = '600 11px "Microsoft YaHei", "PingFang SC", sans-serif';
  c.fillText(value, x, y);
}

function desk(c: Ink, room: TownInteriorKey) {
  const [wood, inset, edge] = palettes[room];
  const light = c.createLinearGradient(0, 0, 0, workbenchSize.height);
  light.addColorStop(0, edge);
  light.addColorStop(.12, wood);
  light.addColorStop(1, "#614e59");
  box(c, .6, .6, 335, 133, edge, 8);
  c.fillStyle = light;
  c.beginPath(); c.roundRect(2, 2, 332, 130, 7); c.fill();
  box(c, 8, 9, 320, 116, inset, 6);
  c.save();
  c.globalAlpha = .22;
  for (let y = 17; y < 124; y += 11) {
    path(c, `M12 ${y}q36 -1.5 83 0t108 .5t120 -1`, edge);
  }
  c.restore();
  path(c, "M14 120V14H321M15 124H321", edge);
  for (const x of [16, 320]) for (const y of [17, 117]) ellipse(c, x, y, 1.35, 1.35, gold, ink);
}

function star(c: Ink, x: number, y: number, r: number, fill: string) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? .44 * r : r;
    c.lineTo(x + Math.cos(angle) * d, y + Math.sin(angle) * d);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function petal(c: Ink, x: number, y: number, pale: boolean) {
  c.save(); c.translate(x, y);
  const shape = "M-13 8C-17-2-8-16 1-13C8-17 17-8 14 1C10 11-5 14-13 8Z";
  path(c, shape, pale ? "#f6e4b8" : "#c89bbd", true);
  path(c, shape, "#805e76");
  path(c, "M-10 8Q-4 0 9-8M-3 3l-4-6m8 4 6 .5", pale ? "#b99772" : "#e9c7dc");
  c.restore();
}

function strawberry(c: Ink, x: number, y: number, color: string) {
  c.save(); c.translate(x, y);
  const shape = "M-13-5Q-10-11 0-8Q9-12 13-5Q14 3 2 13Q0 15-3 12Q-15 4-13-5Z";
  path(c, shape, color, true); path(c, shape, "#884f4a");
  path(c, "M-5-8q1-5 5-3q4-2 5 3l-5 3Z", "#809163", true);
  path(c, "M-8-2l1 2m4-2 1 2m5-1 1 2m-5 5 1 2m7-6 1 1", "#f0cc9c");
  c.restore();
}

function card(c: Ink, x: number, y: number, night: boolean, stamped = false) {
  box(c, x - 28, y - 18, 56, 36, cream, 2);
  box(c, x - 24, y - 14, 30, 28, night ? "#686982" : "#a8b1a1", 1, "#b89271");
  c.save(); c.translate(x - 24, y - 14);
  ellipse(c, 20, 8, 3.3, 3.3, "#f6d49a");
  path(c, "M0 17Q7 10 14 15t16-1v14H0Z", night ? "#748481" : "#809477", true);
  path(c, "M2 10q12 5 25 0", "#f3cf99");
  if (night) path(c, "M8 19v-6m-2 0h4m13 9v-6m-2 0h4", "#f5d48e");
  else path(c, "M6 12l4 1-2 4Zm7 2h4l-2 4Zm7-1 4-1-1 4Z", "#c07980", true);
  c.restore();
  box(c, x + 13, y - 13, 10, 9, "#bf8185", .7);
  path(c, `M${x + 10} ${y + 5}h13m-13 5h11`, "#ac8d74");
  if (stamped) {
    ellipse(c, x + 19, y - 9, 7, 6, "#a65b58", ink);
    c.save(); c.translate(x + 19, y - 9); path(c, "M0-4C-6-2-4 5 3 3C-1 3-2-1 0-4Z", "#f1d3a3", true); c.restore();
  }
}

function tape(c: Ink, x: number, y: number, creek: boolean) {
  box(c, x - 25, y - 13, 50, 26, creek ? "#91b09c" : "#bf8998", 3);
  box(c, x - 20, y - 9, 40, 12, cream, 1);
  box(c, x - 12, y - 5, 24, 5, "#5b4e66", 1);
  for (const dx of [-8, 8]) ellipse(c, x + dx, y - 2.5, 1.7, 1.5, "#f1cb8d");
  path(c, `M${x - 13} ${y + 12}l3-6h20l3 6Z`, "#726271", true);
}

function showTools(c: Ink, {step, positions, rotation}: WorkbenchView) {
  if (!step || step.kind === "wait") return;
  for (const {id, at} of step.tools) {
    const {x, y} = positions.get(id) ?? at;
    switch (id) {
      case "lilac": case "cream": petal(c, x, y, id === "cream"); break;
      case "mold":
        strawberry(c, x, y, "#d8b097");
        path(c, `M${x - 10} ${y - 3}q2-6 8-4`, "#fff0c7");
        break;
      case "tray": case "cookies":
        box(c, x - 29, y - 17, 58, 34, id === "tray" ? "#92757b" : "#d9a280", 4);
        for (const dx of [-17, 0, 17]) {
          ellipse(c, x + dx, y, 6.5, 7.4, id === "tray" ? "#dcbb9a" : "#ecbc7c", "#996453");
          ellipse(c, x + dx, y - 1, 2.5, 2.2, "#b97669");
        }
        break;
      case "copper":
        c.save(); c.translate(x, y); c.rotate(rotation * Math.PI / 180);
        ellipse(c, 0, 0, 31, 31, "#d2a370", "#5b4758");
        ellipse(c, 0, 0, 27, 27, "#e7bb7a", "#f0d4a0");
        star(c, 0, 0, 13, "#73596d");
        path(c, "M0-27v-5m27 32h5M0 27v5m-27-32h-5", "#794f59");
        ellipse(c, 0, -27, 3, 3, "#f4e0b0", ink);
        c.restore();
        break;
      case "flags": case "lamps": card(c, x, y, id === "lamps"); break;
      case "creek": case "bells": tape(c, x, y, id === "creek"); break;
      case "fader":
        box(c, x - 11, y - 9, 22, 18, "#d5a2a9", 3);
        path(c, `M${x - 3} ${y - 6}v12m6-12v12`, "#f8d4ae");
        break;
      case "lever":
        path(c, `M263 47L${x} ${y}`, "#e9bd88");
        box(c, x - 13, y - 6, 26, 12, "#c87d78", 4);
        break;
      case "press":
        box(c, x - 52, y - 24, 104, 48, "#ba8f70", 5);
        box(c, x - 42, y - 15, 84, 30, "#d5ab85", 4);
        path(c, `M${x - 37} ${y + 9}h74m-67-18h54`, "#f0ce9e");
        box(c, x - 19, y - 6, 38, 12, "#876751", 3);
        break;
      case "ticket":
        c.save();
        c.beginPath(); c.rect(215, 39, 105, 72); c.clip();
        drawTownKeepsake(c, "hall", x - 25, y - 30, 53);
        c.restore();
        break;
    }
  }
}

function targetGuide(c: Ink, step: WorkbenchStep, aligned: boolean) {
  if (step.kind !== "place" && step.kind !== "slide") return;
  const {x, y} = step.target;
  c.save();
  c.setLineDash([3, 3]);
  if (step.kind === "place") {
    box(c, x - 33, y - 23, 66, 46, aligned ? "#f3d7b34a" : "#fff1c313", 5, "#ffe1b0");
  } else {
    const at = step.tools[0].at;
    path(c, `M${at.x} ${at.y}L${x} ${y}`, "#ffe2ab");
    c.setLineDash([]);
    const a = Math.atan2(y - at.y, x - at.x);
    c.translate(x, y); c.rotate(a);
    path(c, "M-5-5L0 0L-5 5", "#ffe0ad");
  }
  c.restore();
}

function bookPaper(c: Ink, id: string, progress: number) {
  const left = id === "fold-left" ? 71 * (1 - progress) : id === "unfold" ? 71 * progress : 0;
  const right = id === "fold-right" ? 69 * (1 - progress) : id === "unfold" ? 69 * progress : 69;
  const colors = ["#d9ad90", "#a6b9a0", "#7d849d"];
  for (const [index, x, w] of [[0, 143 - left, left], [1, 143, 54], [2, 197, right]]) {
    if (w < 1) continue;
    box(c, x, 31, w, 71, cream, 1);
    c.save(); c.translate(x, 0); c.scale(w / 60, 1);
    path(c, "M1 34H59V74H1Z", colors[index], true);
    ellipse(c, 42, 53, 5, 5, "#f1d297");
    path(c, "M1 70Q15 60 26 67T59 67V89H1Z", "#859880", true);
    path(c, "M1 77Q15 75 31 77T59 77V99H1Z", "#7da4a3", true);
    path(c, "M1 84h58M8 91h11m16 2h14", "#e6ceaa");
    c.restore();
  }
  c.save(); c.setLineDash([3, 2]); path(c, "M143 30v74m54-74v74", "#f8daa3"); c.restore();
}

function oven(c: Ink, flame: boolean, elapsed: number, reduced: boolean) {
  const outside = "M176 106V59Q177 22 235 22Q296 22 296 60v46Z";
  path(c, outside, "#b27861", true); path(c, outside, ink);
  path(c, "M179 75h114m-101-32h89m-76 20h62m-90 27h115", "#e2a980");
  const opening = "M197 100V67Q198 43 236 43Q273 43 274 67v33Z";
  path(c, opening, "#5c4346", true); path(c, opening, ink);
  path(c, "M197 98h77", "#f3c290");
  if (flame) {
    c.save(); c.translate(237, 94);
    if (!reduced) c.scale(1, .9 + .11 * Math.sin(elapsed * 8));
    path(c, "M-15 1Q-21-11-7-22Q-9-8-2-8Q3-18 3-29Q19-14 16 0Z", "#eca45f", true);
    path(c, "M-8 0q2-12 8-15q-2 9 5 6q5 5 3 9Z", "#ffdaa0", true);
    c.restore();
  }
}

function radioMeter(c: Ink, view: WorkbenchView) {
  box(c, 83, 27, 213, 81, "#464d65", 5);
  const playing = view.step?.id === "listen";
  box(c, 92, 36, 124, 25, "#344e52", 2);
  text(c, view.choice === "bells" ? "第一轨  檐铃" : "第一轨  溪水", 99, 53, "#eed5ac");
  text(c, "第二轨  晚安片头", 97, 76, cream);
  for (const y of [43, 65]) for (let i = 0; i < 8; i++) {
    const level = view.reduced ? 5 : 5 + Math.sin(view.elapsed * 10 + y) * 2;
    const active = playing && i < level;
    box(c, 224 + i * 6, y, 4, 6, active ? "#ecc380" : "#777288", .7, "#494458");
  }
  path(c, "M105 94h158m-133-6v3m24-3v3m24-3v3m24-3v3m35-5v12", "#d4b591");
  ellipse(c, 284, 91, 4.2, 4.2, playing ? "#ec8a78" : "#826775", ink);
  if (playing) text(c, "播出", 263, 105, "#f5ceac");
}

function film(c: Ink, frame: number, angle: number, ticket: boolean) {
  box(c, 42, 20, 236, 96, "#a97c72", 6);
  box(c, 52, 30, 144, 76, "#654b59", 4);
  box(c, 58, 36, 132, 64, frame ? "#d6ac8c" : "#514654", 2);
  if (frame) {
    path(c, "M59 82L95 66H163L189 82v17H59Z", "#aa8c7e", true);
    path(c, "M64 83V63l14-12 13 12v16m59-2V61l14-9 17 10v20", "#7c5e64");
    if (frame >= 2) {
      path(c, "M81 57q42 23 84 0", "#8f6672");
      path(c, "M94 63l9 2-7 7Zm18 4 9 1-6 7Zm19 1 9-2-4 8Zm17-3 9-3-3 8Z", "#b56f77", true);
    }
    if (frame >= 3) {
      ellipse(c, 124, 74, 8, 8, "#e7b980");
      path(c, "M124 92V74m-4-1h8m-7 0v-4h6v4", "#ffe1a6");
    }
  }
  ellipse(c, 244, 68, 30, 30, "#785863", ink);
  ellipse(c, 244, 68, 26, 26, "#99747a", "#d3aa87");
  c.save(); c.translate(244, 68);
  for (const a of [0, 1, 2]) {
    c.save(); c.rotate(a * Math.PI * 2 / 3); path(c, "M0-25v-4", cream); c.restore();
  }
  c.rotate(angle * Math.PI / 180);
  path(c, "M0 0l19 13", "#edc28d"); ellipse(c, 20, 13, 5.2, 5.2, gold, ink);
  c.restore();
  if (ticket) box(c, 206, 74, 11, 20, "#584453", 2);
}

function meter(c: Ink, value: number) {
  box(c, 145, 106, 146, 9, "#5b4d55", 3);
  if (value > 0) box(c, 147, 108, 142 * value, 5, "#f3c88d", 2, "#f3c88d");
}

export function drawWorkbench(c: Ink, view: WorkbenchView) {
  const {room, step, choice, motion, rotation, elapsed, aligned, reduced} = view;
  c.clearRect(0, 0, workbenchSize.width, workbenchSize.height);
  c.lineWidth = 1;
  c.lineJoin = c.lineCap = "round";
  desk(c, room);
  if (!step) {
    if (room === "books") { bookPaper(c, "unfold", 1); return; }
    if (room === "florist") {
      box(c, 125, 26, 86, 83, "#f0dec0", 5, "#bc9b7c");
      path(c, "M131 31h74v72h-74Z", "#fcf1d397", true);
      petal(c, 168, 68, choice === "cream");
      path(c, "M155 87q8-14 22-24m-18 20-2-9m8 1 10-2", "#889176");
      path(c, "M168 26q-14-12-7-15q6-3 7 9q5-11 10-6q4 5-10 12Z", "#ca919a", true);
      return;
    }
    if (room === "post") {
      c.save();
      c.translate(168, 67); c.scale(2.2, 2.2);
      card(c, 0, 0, choice === "lamps", true);
      c.restore();
      return;
    }
    ellipse(c, 168, 108, 46, 8, "#59465555");
    box(c, 113, 16, 110, 101, "#dac096", 8, "#a27b68");
    drawTownKeepsake(c, room, 123, 13, 90);
    for (const x of [86, 250]) star(c, x, 61, 8, "#f1c58f");
    return;
  }
  switch (room) {
    case "florist":
      box(c, 166, 32, 104, 69, "#ad8165", 6);
      box(c, 182, 41, 72, 51, "#f0dfba", 3, "#a58b73");
      path(c, "M194 45v42m48-42v42M194 75h47", "#d2b99a");
      if (step.id === "press") { petal(c, 218, 67, choice === "cream"); meter(c, motion); }
      break;
    case "baker":
      if (step.id === "dough") {
        box(c, 164, 35, 118, 66, "#cea67b", 5);
        ellipse(c, 223, 68, 44, 24, "#f0d4a7", "#a68670");
        for (const x of [199, 223, 247]) ellipse(c, x, 68, 8, 8, "#dfbd95", "#b99376");
      } else if (step.id === "tin") {
        ellipse(c, 231, 75, 49, 29, "#ab6666", ink);
        ellipse(c, 231, 67, 47, 26, "#e4bf93", "#925d58");
        ellipse(c, 231, 67, 40, 20, "#b5937a", "#f5d8a5");
        strawberry(c, 291, 39, "#c57872");
      } else oven(c, step.id === "baking", elapsed, reduced);
      break;
    case "maker": {
      box(c, 37, 24, 94, 83, "#504655", 6);
      ellipse(c, 227, 67, 38, 38, "#5d4b60", "#d8ac7e");
      ellipse(c, 227, 67, 8, 8, "#bd976e", ink);
      path(c, "M84 40C63 46 61 78 83 83Q100 87 110 71C90 83 72 59 84 40Z", "#d2ae7e");
      if (step.id === "align") {
        ellipse(c, 86, 63, 12, 12, "#866c7c", "#eac68d");
        star(c, 86 + Math.sin(rotation * Math.PI / 180) * 30, 63, 10, aligned ? "#fff1ae" : "#e2be8e");
        path(c, "M227 24v9", "#f4d3a1");
      }
      break;
    }
    case "post":
      box(c, 177, 42, 88, 66, "#978478", 5);
      path(c, "M185 98v-48h72v30", "#eac896");
      if (step.id === "stamp") card(c, 218, 71, choice === "lamps");
      box(c, 261, 30, 34, 68, "#b68170", 4);
      box(c, 226, 71, 15, 20, "#8d665d", 2);
      break;
    case "books": bookPaper(c, step.id, motion); break;
    case "radio":
      if (step.id === "track") {
        box(c, 181, 31, 119, 65, "#424c64", 5);
        text(c, "第一轨", 187, 45, cream);
      } else radioMeter(c, view);
      break;
    case "hall": film(c, step.id === "ticket" ? 3 : Math.min(3, Math.floor(motion * 3 + .001)), rotation, step.id === "ticket"); break;
  }
  targetGuide(c, step, aligned);
  showTools(c, view);
}
