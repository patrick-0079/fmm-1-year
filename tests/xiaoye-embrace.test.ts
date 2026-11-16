import test from "node:test";
import assert from "node:assert/strict";
import { embraceFrames, EMBRACE_ART_SCALE } from "../src/xiaoye-embrace-art.ts";
import { EMBRACE_SECONDS, embracePose, boundedEmbraceFoot, isEmbraceApproach,
  EMBRACE_BODY_GAP, EMBRACE_SHOULDER_Y } from "../src/xiaoye-embrace.ts";
import { polygonContains, canStand, canTravelBetween, findPath } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { xiaoyeSpot } from "../src/xiaoye-data.ts";

test("foreground paw masks keep real pads but exclude the old ribbon and torso rectangle leaks", () => {
  assert.equal(embraceFrames[0].foreground.length,0,"resting arms must stay behind Fufu");
  for(const [frame,pad,leaks] of [
    [1,[970,485],[[906,427],[908,505],[921,529]]],
    [2,[1495,515],[[1428,445],[1425,537],[1450,544]]],
    [3,[2044,520],[[1987,474],[1990,541],[2002,548]]],
  ] as const) {
    const mask=embraceFrames[frame].foreground.map(([x,y])=>({x,y}));
    assert.ok(polygonContains({x:pad[0],y:pad[1]},mask),"missing paw pad in frame "+frame);
    for(const [x,y]of leaks)
      assert.equal(polygonContains({x,y},mask),false,`frame ${frame} leaks non-arm pixels at ${x},${y}`);
    const crop=embraceFrames[frame].paw;
    for(const point of mask)assert.ok(point.x>=crop.x && point.x<=crop.x+crop.w &&
      point.y>=crop.y && point.y<=crop.y+crop.h,"contour escapes its source crop");
  }
  assert.equal(EMBRACE_SHOULDER_Y,-19,"foreground starts below the face and head accessories");
});

test("only roomy side approaches can start profile hugs; front, rear and crowded feet must walk around", () => {
  for(const at of [xiaoyeSpot.approach,{x:306,y:318},{x:308,y:329},{x:359,y:316}])
    assert.equal(isEmbraceApproach(at,xiaoyeSpot),true,JSON.stringify(at));
  for(const at of [{x:330,y:288},{x:330,y:340},{x:345,y:318},{x:306,y:310},
    {x:354,y:340},{x:360,y:320},{x:NaN,y:327},{x:354,y:Infinity}])
    assert.equal(isEmbraceApproach(at,xiaoyeSpot),false,JSON.stringify(at));
  assert.deepEqual(findPath(scenes.garden.spawn,xiaoyeSpot.approach,scenes.garden)?.at(-1),xiaoyeSpot.approach);
});

test("both real side approaches preserve a 26 pixel body gap on accessible ground", () => {
  const room={...scenes.garden,walls:scenes.garden.walls.filter(w=>w.label!=="来宾 · 小叶子")};
  assert.equal(EMBRACE_BODY_GAP,26);
  for(const player of [xiaoyeSpot.approach,{x:306,y:318}]) {
    const side=player.x<xiaoyeSpot.x ? -1 : 1;
    const foot=boundedEmbraceFoot(xiaoyeSpot,{x:player.x-side*EMBRACE_BODY_GAP,y:player.y-4});
    assert.equal(Math.abs(player.x-foot.x),26);
    assert.ok(Math.hypot(foot.x-xiaoyeSpot.x,foot.y-xiaoyeSpot.y)<=12);
    assert.ok(canStand(foot,room.walls,room.bounds,room.floor,room.surfaces));
    assert.ok(canTravelBetween(xiaoyeSpot,foot,room));
    assert.ok(foot.y<player.y,"the full plush stays behind Fufu; only its masked paw may pass in front");
  }
});

test("embrace atlas preserves one scale, grounded feet and isolated foreground paws", () => {
  for (const [i,f] of embraceFrames.entries()) {
    assert.ok(f.x >= i*543 && f.x+f.w <= (i+1)*543);
    assert.ok(f.y >= 0 && f.y+f.h <= 724);
    assert.ok(f.footX > f.x && f.footX < f.x+f.w && f.footY < f.y+f.h);
    assert.ok(f.paw.x >= f.footX, "only the reaching forearm goes in front of Fufu");
    assert.ok(f.paw.x+f.paw.w <= f.x+f.w && f.paw.y+f.paw.h <= f.y+f.h);
    const actualHeight=(f.footY-f.y)*EMBRACE_ART_SCALE;
    assert.ok(actualHeight>57 && actualHeight<61, "crouching keeps the original proportions");
    assert.ok((f.footY-f.paw.y)*EMBRACE_ART_SCALE<26, "the paw reaches the shoulder rather than the top of the head");
  }
});

test("the embrace has a readable anticipation, opening, contact, hold and release sequence", () => {
  assert.equal(EMBRACE_SECONDS, 4.8);
  for (const [at, stage, frame] of [
    [0, "anticipate", 0], [.1199, "anticipate", 0], [.12, "open", 1],
    [.28, "close", 2], [.42, "hold", 2], [.7, "release", 1], [.86, "settle", 0], [1, "settle", 0],
  ] as const) {
    assert.equal(embracePose(at, false).stage, stage, "stage at " + at);
    assert.equal(embracePose(at, false).frame, frame, "frame at " + at);
  }
});

test("contact and both body leans ease into an embrace, then return exactly to rest", () => {
  for (const at of [0, 1]) {
    const pose = embracePose(at, false);
    assert.equal(pose.contact, 0);
    assert.equal(Math.abs(pose.lean), 0);
    assert.equal(Math.abs(pose.playerLean), 0);
    assert.equal(pose.glow, 0);
  }
  let previousContact = 0;
  for (let i = 0; i <= 42; i++) {
    const pose = embracePose(i / 100, false);
    assert.ok(pose.contact >= previousContact);
    previousContact = pose.contact;
  }
  previousContact = 1;
  for (let i = 70; i <= 100; i++) {
    const pose = embracePose(i / 100, false);
    assert.ok(pose.contact <= previousContact);
    previousContact = pose.contact;
  }
  for (const at of [.12, .28, .42, .7, .86]) {
    const before = embracePose(at - 1e-6, false), after = embracePose(at + 1e-6, false);
    for (const key of ["contact", "lean", "playerLean", "glow"] as const)
      assert.ok(Math.abs(before[key] - after[key]) < .0001, `${key} should not jump at ${at}`);
  }
});

test("the pause includes two complete gentle pats and uses the fourth sprite only during contact", () => {
  for (const at of [.42, .56, .7]) assert.ok(embracePose(at, false).pat < 1e-10);
  for (const at of [.49, .63]) {
    const pose = embracePose(at, false);
    assert.ok(pose.pat > .9999);
    assert.equal(pose.frame, 3);
    assert.equal(pose.contact, 1);
  }
  const frames = new Set<number>();
  for (let i = 0; i <= 1000; i++) {
    const pose = embracePose(i / 1000, false);
    frames.add(pose.frame);
    assert.ok(pose.contact >= 0 && pose.contact <= 1);
    assert.ok(pose.pat >= 0 && pose.pat <= 1);
    assert.ok(pose.glow >= 0 && pose.glow <= 1);
    assert.ok(pose.lean >= 0 && pose.lean <= .03);
    assert.ok(pose.playerLean >= -.045 && pose.playerLean <= 0);
    if (pose.frame === 3) assert.equal(pose.stage, "hold");
  }
  assert.deepEqual([...frames].sort(), [0, 1, 2, 3]);
});

test("reduced motion holds a single readable pose without frame swaps, tilts or pulsing", () => {
  const still = embracePose(0, true);
  assert.deepEqual(still, { stage: "hold", frame: 2, contact: 1, lean: 0, playerLean: 0, pat: 0, glow: .65 });
  for (const progress of [0, .12, .3, .49, .7, 1, -2, 3, NaN, Infinity])
    assert.deepEqual(embracePose(progress, true), still);
});

test("invalid progress cannot create nonfinite render transforms or advance an animation", () => {
  for (const progress of [-1, NaN, Infinity, -Infinity])
    assert.deepEqual(embracePose(progress, false), embracePose(0, false));
  assert.deepEqual(embracePose(2, false), embracePose(1, false));
});

test("visual approach is bounded, does not overshoot or mutate points, and rejects unusable coordinates", () => {
  const origin = { x: 330, y: 315 }, target = { x: 354, y: 327 };
  const point = boundedEmbraceFoot(origin, target);
  assert.ok(Math.abs(Math.hypot(point.x - origin.x, point.y - origin.y) - 12) < 1e-10);
  assert.ok(point.x > origin.x && point.x < target.x && point.y > origin.y && point.y < target.y);
  assert.deepEqual(boundedEmbraceFoot(origin, { x: 333, y: 319 }), { x: 333, y: 319 });
  assert.deepEqual(boundedEmbraceFoot(origin, origin), origin);
  for (const limit of [0, -1, NaN, Infinity]) assert.deepEqual(boundedEmbraceFoot(origin, target, limit), origin);
  for (const invalid of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }])
    assert.deepEqual(boundedEmbraceFoot(origin, invalid), origin);
  assert.deepEqual(boundedEmbraceFoot({ x: NaN, y: 315 }, target), { x: 0, y: 315 });
  assert.deepEqual(boundedEmbraceFoot({ x: 1e308, y: 0 }, { x: -1e308, y: 0 }), { x: 1e308, y: 0 });
  assert.deepEqual(origin, { x: 330, y: 315 });
  assert.deepEqual(target, { x: 354, y: 327 });
});
