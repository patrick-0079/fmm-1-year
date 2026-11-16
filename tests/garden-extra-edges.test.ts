import test from "node:test";
import assert from "node:assert/strict";
import { polygonContains } from "../src/core.ts";
import { gardenForeground } from "../src/garden-foreground.ts";

const pixel = (x: number,y: number) => ({x:(x+.5)*900/1536,y:(y+.5)*900/1536});

test("garden lantern cutouts keep the metal and glass without the surrounding paving or grass", () => {
  // Independently inspected source-pixel landmarks, not vertices copied from
  // the profiles: these bright stone/grass wedges used to cover a passing actor.
  const cases = [
    {id:"northwest-path-lamp",solid:[[672,325],[667,333],[670,347],[672,362]],clear:[[668,318],[661,329],[659,345],[679,362]]},
    {id:"northeast-path-lamp",solid:[[833,325],[830,334],[832,347],[833,363]],clear:[[829,318],[823,328],[820,345],[839,328]]},
    {id:"southwest-square-lamp",solid:[[657,668],[654,680],[656,695]],clear:[[659,659],[668,674],[672,686]]},
    {id:"southeast-square-lamp",solid:[[848,668],[844,680],[849,695]],clear:[[842,659],[836,674],[834,687]]},
    {id:"west-alcove-arch",solid:[[199,503],[175,507],[229,519]],clear:[[192,494],[201,494],[217,503],[224,506]]},
  ];
  for (const {id,solid,clear} of cases) {
    const shape=gardenForeground.find(part=>part.id===id)!;
    for (const [x,y] of solid) assert.ok(polygonContains(pixel(x,y),shape.points),`${id}: lost lamp/flower at ${x},${y}`);
    for (const [x,y] of clear) assert.ok(!polygonContains(pixel(x,y),shape.points),`${id}: retained background at ${x},${y}`);
  }
});
