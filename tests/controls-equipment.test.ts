import test from "node:test";
import assert from "node:assert/strict";
import { equipmentParts, fitItem, type Facing } from "../src/equipment.ts";
import { avatarPose, costumeFrame, footwearIds, outfitIndex, outfits, poseFrame } from "../src/costume-frames.ts";
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
        const hidden = pose === "standing" && facing >= 2 && (item.slot === "body" || item.slot === "hair");
        assert.equal(equipmentParts(worn, pose, facing).length > 0,
          !hidden && !["pet","clothes","shoes"].includes(item.slot), `${id} · ${pose} · ${facing}`);
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
  assert.deepEqual(equipmentParts({body:"moonBag"}, "standing", 0).map(p=>p.style), ["straps"]);
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
  assert.equal(clothing.length,8);
  assert.deepEqual(new Set(clothing),new Set(outfits.filter(Boolean)));
  const shoes = Object.entries(ITEMS).filter(([,item])=>item.slot==="shoes").map(([id])=>id);
  assert.deepEqual(new Set(footwearIds),new Set(shoes));
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
test("rucksacks show the narrow gusset in profile and the satchel stays at the left hip", () => {
  for (const frame of [0,1,2]) {
    for (const backpack of ["moonBag","berryBag","rabbitSatchel","letterPack","bearPack","compassPack"] as const) {
      const parts = (facing: Facing) => equipmentParts({backpack}, "standing", facing, frame);
      for (const facing of [1,2] as const) {
        const profile=parts(facing), strap=profile.find(p=>p.style==="straps")!;
        const bag=profile.find(p=>p.style==="bag");
        assert.ok(strap && profile.every(p=>p.layer==="underArm"));
        if (backpack === "rabbitSatchel") {
          assert.equal(!!bag, facing === 1);
          if (bag) assert.ok(bag.y >= strap.y && bag.w > bag.h);
          continue;
        }
        assert.ok(bag && bag.w < bag.h / 2 && bag.mirror === (facing === 2));
        const gap = facing === 1 ? bag.x - (strap.x+strap.w) : strap.x - (bag.x+bag.w);
        assert.ok(Math.abs(gap)<1, "strap and gusset meet behind the shoulder");
      }
      const front = parts(0).find(p=>p.style==="bag"), rear = parts(3).find(p=>p.style==="bag")!;
      if (backpack === "rabbitSatchel") assert.ok(front && front.x > 0 && rear.x+rear.w < 0);
      else assert.ok(!front && Math.abs(rear.x + rear.w/2)<.1);
    }
  }
});
test("lapel pins turn edge-on at the near shoulder and disappear with the far lapel", () => {
  for (const body of ["anniversaryPin","echoBrooch","leafPin","tulipPin","shellPin"] as const) for (const step of [0,1,2]) {
    const [front]=equipmentParts({body},"standing",0,step);
    const [edge]=equipmentParts({body},"standing",1,step);
    assert.ok(front.x > 0 && edge.x < 0 && edge.w < front.w/2 && edge.h < front.h);
    assert.equal(edge.style,"pinEdge");
    for (const facing of [2,3] as const) assert.deepEqual(equipmentParts({body},"standing",facing,step),[]);
  }
});
test("the visible flower crown is drawn whole above every hat, band and fringe clip", () => {
  for (const pose of ["standing", "sitting", "bench"] as const) {
    for (const facing of [0, 1, 2, 3] as Facing[]) {
      for (const frame of [0, 1, 2]) {
        for (const head of ["headphones","witchHat","blueBeret","ginghamBand","strawHat"] as const) {
          const under = equipmentParts({head, hair:"heartClip"}, pose, facing, frame);
          const layered = equipmentParts({wreath:"wreath", head, hair:"heartClip"}, pose, facing, frame);
          assert.deepEqual(layered.slice(0, -1), under);
          assert.equal(layered.at(-1)?.id, "wreath");
          assert.equal(layered.at(-1)?.layer, "front");
          assert.ok(under.some(part => part.id === head));
        }
      }
    }
  }
});
test("fringe clips belong to the near temple and sit under the witch hat brim", () => {
  for (const hair of ["candyClip","starWings","heartClip","fishClip","starClip"] as const) {
    for (const frame of [0,1,2]) {
      for (const facing of [0,1] as const) {
        const parts=equipmentParts({head:"witchHat",hair},"standing",facing,frame);
        assert.deepEqual(parts.map(p=>p.id),[hair,"witchHat"]);
        const overlap=parts[1].y + parts[1].h - parts[0].y;
        assert.ok(overlap > 0 && overlap < parts[0].h / 3);
      }
      for (const facing of [2,3] as const) assert.deepEqual(equipmentParts({hair},"standing",facing,frame),[]);
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
test("clips on the near temple tuck under the headphone band and cups", () => {
  for (const hair of ["candyClip","starWings","heartClip","fishClip","starClip"] as const) {
    for (const pose of ["standing","sitting","bench"] as const) for (const step of [0,1,2]) {
      for (const facing of [0,1,2,3] as const) {
        const parts = equipmentParts({head:"headphones",hair,wreath:"wreath"}, pose, facing, step);
        const near = pose !== "standing" || facing <= 1;
        const rear = pose === "standing" && facing === 3;
        assert.deepEqual(parts.map(p => p.style ?? p.id), [
          ...(near ? [hair] : []), rear ? "rearBand" : "band", rear ? "rearEarpieces" : "earpieces", "wreath",
        ]);
      }
    }
    assert.deepEqual(equipmentParts({head:"headphones", hair, wreath:"wreath"}, "lying", 0).map(p => p.id), [hair]);
  }
});
test("headwear follows the sprite crown throughout a stride", () => {
  for (const head of ["wreath", "candyClip", "headphones", "starWings", "witchHat", "blueBeret", "ginghamBand", "strawHat"] as const) {
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
