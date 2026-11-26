import test from "node:test";
import assert from "node:assert/strict";
import { equipmentParts, fitItem, type Facing } from "../src/equipment.ts";
import { avatarPose, costumeFrame, outfitIndex, outfits, poseFrame } from "../src/costume-frames.ts";
import { ITEMS, type ItemId } from "../src/items.ts";
import { scenes } from "../src/maps.ts";
import { canStand, canTravelBetween } from "../src/core.ts";
import { clickedInteraction } from "../src/interaction.ts";
import { townGates, gateSignFoot } from "../src/gate-layout.ts";
import { wishAtBurst, wishOpacity } from "../src/celebration.ts";
import { spriteFrames } from "../src/sprite-frames.ts";

test("directional attachments stay on the body and only hair clips are worn in bed", () => {
  for (const [id, item] of Object.entries(ITEMS)) {
    const worn = { [item.slot]: id as ItemId };
    for (const facing of [0, 1, 2, 3] as Facing[])
      for (const pose of ["standing", "sitting", "bench"] as const) {
        if (!["pet","clothes","shoes"].includes(item.slot) && !(item.slot === "body" && facing === 3 && pose === "standing"))
          assert.ok(
            equipmentParts(worn, pose, facing).length > 0,
            `${id} has an attachment`,
          );
        for (const p of equipmentParts(worn, pose, facing)) {
          assert.equal(p.id, id);
          assert.ok(p.w > 0 && p.h > 0);
          assert.ok(
            p.x >= -40 && p.x + p.w <= 40 && p.y >= -55 && p.y + p.h <= 5,
            id + " stays attached to the character",
          );
        }
        assert.deepEqual(equipmentParts(worn, "lying", facing).map(p => p.id), item.slot === "hair" ? [id] : []);
      }
  }
  assert.ok(
    equipmentParts({ head: null, body: "moonBag" }, "standing", 0)
      .filter((p) => !p.style)
      .every((p) => p.layer === "behind"),
  );
  assert.ok(
    equipmentParts({ head: null, body: "moonBag" }, "standing", 3).some(
      (p) => p.layer === "front",
    ),
  );
  assert.deepEqual(
    equipmentParts({ head: null, body: "anniversaryPin" }, "standing", 3),
    [],
  );
});
test("every clothing design selects its own complete pose atlas including both seats and bed", () => {
  assert.equal(avatarPose(null), "standing");
  assert.equal(avatarPose({kind:"sitting",scene:"meadow"}), "sitting");
  assert.equal(avatarPose({kind:"sitting",scene:"challenge"}), "bench");
  assert.equal(avatarPose({kind:"lying",scene:"room"}), "lying");
  const clothing = Object.entries(ITEMS).filter(([,i])=>i.slot==="clothes").map(([id])=>id);
  assert.equal(clothing.length,7);
  assert.deepEqual(new Set(clothing),new Set(outfits.filter(Boolean)));
  for (const [row, outfit] of outfits.entries()) {
    assert.equal(outfitIndex(outfit),row);
    const columns = [0,1,2,3].flatMap(dir=>[0,1,2].map(step=>poseFrame("standing",dir as Facing,step)));
    for (const pose of ["sitting","bench","lying"] as const) columns.push(poseFrame(pose,2,1));
    assert.equal(new Set(columns).size,15);
    const last = costumeFrame(row,14);
    assert.equal(last.w,costumeFrame(row,13).w*2);
    assert.equal(last.y,row*last.h);
  }
});
test("each side-view pack meets the blouse at the shoulder across all six profile frames", () => {
  // Back edge of the lavender sleeve at y = -16.6, measured on the base sprites.
  // Comparing with the blouse keeps a bag resting on loose hair from passing.
  const sleeve = {1: [.1, .5, .4], 2: [1, .6, -.2]} as const;
  for (const facing of [1, 2] as const) {
    for (const [frame, seam] of sleeve[facing].entries()) {
      for (const backpack of ["moonBag", "berryBag", "rabbitSatchel"] as const) {
        const bag = equipmentParts({backpack}, "standing", facing, frame).find(p => p.style === "bag")!;
        assert.equal(bag.mirror, facing === 2);
        const overlap = facing === 1 ? seam - bag.x : bag.x + bag.w - seam;
        assert.ok(overlap >= .5 && overlap <= 2, `${backpack}, facing ${facing}, step ${frame}: shoulder overlap ${overlap}`);
        assert.ok(bag.y < -18 && bag.y + bag.h > -13 && bag.y + bag.h < -9);
      }
    }
  }
});
test("flower crowns wrap behind and in front of the hair without rescaling either half", () => {
  for (const pose of ["standing", "sitting", "bench"] as const) {
    for (const facing of [0, 1, 2, 3] as Facing[]) {
      for (const frame of [0, 1, 2]) {
        const parts = equipmentParts({head: "wreath"}, pose, facing, frame);
        assert.equal(parts.length, 2, "a crown is one far arc and one near arc");
        const far = parts.find(p => p.style === "wreathFar")!;
        const near = parts.find(p => p.style === "wreathNear")!;
        assert.ok(far && near, "both arcs must remain available to the renderer");
        assert.equal(far.layer, "behind", "hair conceals the far arc");
        assert.equal(near.layer, "front", "the near arc rests over the hair");
        const geometry = (p: typeof far) => [p.x, p.y, p.w, p.h, p.mirror];
        assert.deepEqual(geometry(far), geometry(near), "both clips use the same fitted crown, avoiding a seam or doubled flowers");
      }
    }
  }
});
test("fringe-mounted clips remain small and are occluded by the hair when facing away", () => {
  for (const head of ["candyClip", "starWings", "heartClip", "fishClip", "starClip"] as const) {
    for (const frame of [0, 1, 2]) {
      const front = equipmentParts({[ITEMS[head].slot]:head}, "standing", 0, frame);
      const rear = equipmentParts({[ITEMS[head].slot]:head}, "standing", 3, frame);
      assert.equal(front.length, 1);
      assert.equal(rear.length, 1);
      assert.equal(front[0].layer, "front");
      assert.equal(rear[0].layer, "behind", `${head} must not be pasted over the back hair`);
      assert.equal(rear[0].w, front[0].w, `${head} must not enlarge when turning away`);
      assert.equal(rear[0].h, front[0].h);
      const center = rear[0].x + rear[0].w / 2;
      assert.ok(Math.abs(center) >= rear[0].w / 2, `${head} remains on the side rather than becoming a central back ornament`);
    }
  }
});
test("headphones expose rear shells only in the back view, with front cups retained elsewhere", () => {
  for (const frame of [0, 1, 2]) {
    const rear = equipmentParts({head: "headphones"}, "standing", 3, frame);
    assert.deepEqual(new Set(rear.map(p => p.style)), new Set(["rearBand", "rearEarpieces"]));
    assert.ok(rear.every(p => p.layer === "front"), "the rear band and shells remain visible over the back hair");
    for (const facing of [0, 1, 2] as Facing[]) {
      assert.deepEqual(
        new Set(equipmentParts({head: "headphones"}, "standing", facing, frame).map(p => p.style)),
        new Set(["band", "earpieces"]),
      );
    }
    assert.deepEqual(
      new Set(equipmentParts({head: "headphones"}, "sitting", 3, frame).map(p => p.style)),
      new Set(["band", "earpieces"]),
      "the seated avatar is front-facing even after looking away",
    );
  }
});
test("headwear follows the sprite crown throughout a stride", () => {
  for (const head of ["wreath", "candyClip", "headphones", "starWings", "witchHat"] as const) {
    for (const facing of [0, 1, 2, 3] as Facing[]) {
      const rest = equipmentParts({[ITEMS[head].slot]:head}, "standing", facing, 0);
      const restingCrown = -spriteFrames[facing * 3].h * 43 / 330;
      for (const frame of [0, 1, 2]) {
        const moving = equipmentParts({[ITEMS[head].slot]:head}, "standing", facing, frame);
        const movingCrown = -spriteFrames[facing * 3 + frame].h * 43 / 330;
        assert.equal(moving.length, rest.length);
        moving.forEach((part, index) => {
          assert.ok(Math.abs((part.y - movingCrown) - (rest[index].y - restingCrown)) < 1e-8,
            `${head}, facing ${facing}, step ${frame}: attachment must move with the top of the actual sprite`);
          assert.deepEqual(
            [part.x, part.w, part.h, part.style, part.layer, part.mirror],
            [rest[index].x, rest[index].w, rest[index].h, rest[index].style, rest[index].layer, rest[index].mirror],
            "walking must not change the size, side or occlusion of a head accessory",
          );
        });

      }
    }
  }
});
test("item art keeps its original aspect ratio within both small wearables and inventory icons", () => {
  for (const [w, h] of [
    [239, 76],
    [493, 416],
    [546, 555],
    [598, 604],
    [585, 411],
  ])
    for (const size of [11, 42]) {
      const box = fitItem(w, h, 3, 5, size, size);
      assert.ok(Math.abs(box.w / box.h - w / h) < 1e-8);
      assert.ok(
        box.x >= 3 &&
          box.y >= 5 &&
          box.x + box.w <= 3 + size + 1e-8 &&
          box.y + box.h <= 5 + size + 1e-8,
      );
    }
});
test("physical map exits are reciprocal and lead to safe, reachable arrival points", () => {
  for (const [id, scene] of Object.entries(scenes))
    for (const portal of scene.spots.filter((s) => s.portal)) {
      const target = scenes[portal.portal!],
        exit = target.spots.find((s) => s.id === portal.portalExit);
      assert.ok(exit, `${id}/${portal.id} has a real opposite entrance`);
      assert.equal(exit.portal, id);
      assert.equal(exit.portalExit, portal.id);
      assert.ok(
        canStand(
          exit.approach,
          target.walls,
          target.bounds,
          target.floor,
          target.surfaces,
        ),
      );
    }
  const s = scenes.town,
    p = s.spots.find((s) => s.id === "town-return")!;
  assert.ok(
    canTravelBetween(p.approach, { x: 450, y: 875 }, s),
    "town arrival faces the open street, clear of the overhead arch",
  );
});
test("mouse interaction hits both a raised marker and the actual NPC, rather than empty ground", () => {
  const s = scenes.town.spots.find((s) => s.id === "npc-welcome")!;
  const marker = (p: typeof s) => p.y - (p.markerOffset ?? 12);
  assert.equal(
    clickedInteraction({ x: s.x, y: marker(s) }, [s], marker)?.id,
    s.id,
  );
  assert.equal(
    clickedInteraction({ x: s.x, y: s.y - 20 }, [s], marker)?.id,
    s.id,
  );
  assert.equal(
    clickedInteraction({ x: s.x + 120, y: s.y }, [s], marker),
    undefined,
  );
  const gate = scenes.garden.spots.find((s) => s.id === "town-gate")!;
  const sign = gateSignFoot(townGates[0]);
  assert.equal(
    clickedInteraction({ x: sign.x, y: sign.y-16 }, [gate], marker)?.id,
    gate.id,
    "the low sign attached to the post is clickable",
  );
  assert.equal(clickedInteraction({x:gate.x,y:gate.y-48},[gate],marker), undefined, "empty sky above the gate stays walkable");
});
test("firework wishes cycle through anniversary messages and fade in and out", () => {
  assert.match(wishAtBurst(0), /一周年/);
  assert.equal(wishAtBurst(5), wishAtBurst(0));
  assert.equal(wishOpacity(3.4, 3.4), 0);
  assert.equal(wishOpacity(2, 3.4), 1);
  assert.equal(wishOpacity(0, 3.4), 0);
  assert.ok(wishOpacity(0.3, 3.4) > 0 && wishOpacity(0.3, 3.4) < 1);
});
