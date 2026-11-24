import test from "node:test";
import assert from "node:assert/strict";
import { placeInteractionPrompt, promptHoverContains, type PromptBox } from "../src/interaction-prompt-layout.ts";

const overlap = (a: PromptBox, b: PromptBox) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

test("interaction labels stay inside desktop and narrow game frames at every edge", () => {
  for (const w of [288, 320, 390, 600, 1200]) {
    const viewport = { w, h: w * 2 / 3 }, size = { w: Math.min(w - 12, 176), h: 58 };
    for (const x of [0, 12, w / 2, w - 12, w])
      for (const y of [0, 12, viewport.h / 2, viewport.h - 12, viewport.h]) {
        const result = placeInteractionPrompt(viewport, size, { x, y },
          { x: x - 12, y: y + 15, w: 24, h: 45 }, { x: x - 15, y: y - 30, w: 30, h: 40 });
        assert.ok(result.x >= 5 && result.y >= 5, "label must not clip above/left");
        assert.ok(result.x + size.w <= w - 5 && result.y + size.h <= viewport.h - 5,
          `label must not clip below/right: ${JSON.stringify({ viewport, result })}`);
        const along = ["top", "bottom"].includes(result.edge) ? size.w : size.h;
        assert.ok(result.tip >= 10 && result.tip <= along - 10, "pointer stays away from rounded corners");
      }
  }
});

test("labels prefer empty space over the approaching player's head and the illustrated object", () => {
  const viewport = { w: 600, h: 400 }, size = { w: 160, h: 44 }, anchor = { x: 300, y: 170 };
  const object = { x: 280, y: 150, w: 40, h: 70 };
  for (const player of [
    { x: 330, y: 100, w: 32, h: 70 },
    { x: 230, y: 100, w: 32, h: 70 },
    { x: 280, y: 80, w: 32, h: 60 },
    { x: 280, y: 210, w: 32, h: 70 },
  ]) {
    const result = placeInteractionPrompt(viewport, size, anchor, player, object);
    const box = { ...result, ...size };
    assert.equal(overlap(box, player), 0, "an available empty side must take precedence over the player");
    assert.equal(overlap(box, object), 0, "the selected object remains visible");
  }
});

test("a long label at a right-edge NPC flips left instead of leaving the game", () => {
  const result = placeInteractionPrompt({ w: 390, h: 260 }, { w: 176, h: 58 },
    { x: 365, y: 145 }, { x: 330, y: 170, w: 25, h: 50 }, { x: 350, y: 120, w: 30, h: 50 });
  assert.ok(result.x + 176 < 350);
  assert.equal(result.edge, "right");
});

test("narrow-screen labels avoid visible map controls as well as the character", () => {
  const viewport = { w: 298, h: 198.66 }, size = { w: 139, h: 44 };
  const object = { x: 8, y: 95, w: 28, h: 20 }, player = { x: 51, y: 96, w: 18, h: 25 };
  const hud = [{ x: 7, y: 7, w: 143, h: 32 }, { x: 7, y: 46, w: 116, h: 27 },
    { x: 211, y: 7, w: 80, h: 32 }];
  const placed = placeInteractionPrompt(viewport, size, { x: 28, y: 104 }, player, object, hud);
  const box = { ...placed, ...size };
  assert.equal(overlap(box, player), 0);
  assert.equal(overlap(box, object), 0);
  for (const widget of hud) assert.equal(overlap(box, widget), 0, "a label must not sit on a HUD control when free space exists");
});

test("a touch prompt at the town workshop leaves the steps below the player's shoes tappable", () => {
  // CSS pixels measured in the 298px canvas on a 320px phone. The NPC and
  // block game are both in range, below the map title and clock.
  const viewport = { w: 298, h: 198.66 }, size = { w: 99, h: 46.58 };
  const anchor = { x: 176.57, y: 70.63 };
  const player = { x: 141.70, y: 79.57, w: 14.30, h: 20.56 };
  const npc = { x: 163.16, y: 70.18, w: 15.20, h: 21.90 };
  const occupied = [
    { x: 10, y: 10, w: 170.88, h: 33.19 }, { x: 195.30, y: 10, w: 92.70, h: 29.19 },
    { x: 0, y: 77.33, w: 44, h: 44 }, { x: 132.76, y: 20.12, w: 67.94, h: 45.59 },
  ];
  const label = { ...placeInteractionPrompt(viewport, size, anchor, player, npc, occupied, true), ...size };
  for (const item of [player, npc, ...occupied]) assert.equal(overlap(label, item), 0);
  for (const [x,y] of [[149,99],[152,116],[156,132]]) {
    assert.equal(overlap(label, { x:x-2, y:y-2, w:4, h:4 }), 0, `covered walk tap at ${x},${y}`);
  }
});

test("the same workshop steps accept a mouse click while either desktop hint is displayed", () => {
  const viewport = { w: 934, h: 622.66 }, anchor = { x: 522.57, y: 222.76 };
  const player = { x: 444.12, y: 249.38, w: 44.83, h: 64.45 };
  const npc = { x: 480.54, y: 221.36, w: 47.63, h: 68.65 };
  const occupied = [
    { x: 17, y: 17, w: 194.47, h: 37.19 }, { x: 820.30, y: 17, w: 96.70, h: 31.19 },
    { x: 0, y: 292.83, w: 37, h: 37 }, { x: 416.10, y: 63.05, w: 212.95, h: 142.90 },
  ];
  // The E keycap and mouse hint produce different button dimensions.
  for (const size of [{ w: 138, h: 35 }, { w: 109, h: 45.55 }]) {
    const label = { ...placeInteractionPrompt(viewport, size, anchor, player, npc, occupied), ...size };
    for (const item of [player, npc, ...occupied]) assert.equal(overlap(label, item), 0);
    assert.equal(overlap(label, { x: 474, y: 359, w: 5, h: 6 }), 0);
  }
});

test("hover stays attached across the empty space between a bed or cake and its displaced label", () => {
  for (const [object, label] of [
    [{ x: 650, y: 130, w: 180, h: 160 }, { x: 745, y: 300, w: 96, h: 46 }],
    [{ x: 395, y: 250, w: 120, h: 128 }, { x: 525, y: 270, w: 122, h: 46 }],
    [{ x: 210, y: 95, w: 60, h: 50 }, { x: 60, y: 40, w: 140, h: 44 }],
  ] as [PromptBox, PromptBox][]) {
    for (const from of [{ x: object.x + 4, y: object.y + 4 },
      { x: object.x + object.w / 2, y: object.y + object.h / 2 }])
      for (const to of [{ x: label.x + 4, y: label.y + 4 },
        { x: label.x + label.w / 2, y: label.y + label.h / 2 }])
        for (let step = 0; step <= 12; step++) {
          assert(promptHoverContains({ x: from.x + (to.x - from.x) * step / 12,
            y: from.y + (to.y - from.y) * step / 12 }, object, label), "the clickable sign must not disappear on the way to it");
        }
    assert.equal(promptHoverContains({ x: Math.min(object.x, label.x) - 15, y: Math.min(object.y, label.y) - 15 }, object, label), false,
      "leaving the object/sign region must still clear hover");
  }
});
