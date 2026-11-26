import { drawAvatar } from "../src/avatar";
import { outfits, type AvatarPose, type Facing } from "../src/costume-frames";
import { ITEMS, type ItemId } from "../src/items";

export const backpacks = (Object.keys(ITEMS) as ItemId[]).filter(id => ITEMS[id].slot === "backpack");

// Landmarks read from the bare garment art, in world units. Both side profiles are
// measured facing left. Each pair lies on the near hand or cuff during that stride.
const cuffs = {
  base:             [[-.4,-11.7], [.4,-11.7], [-5.9,-12.6]],
  roseDress:        [[-1.7,-13.3], [-1.3,-13.4], [-5.8,-13.7]],
  mintCape:         [[-2.5,-11.3], [-1.7,-11.4], [-6.8,-13.4]],
  cloudPajamas:     [[-.4,-12.1], [.1,-12.1], [-5.1,-13.3]],
  apricotNightgown: [[-1.0,-12.6], [-.75,-12.5], [-5.1,-13.3]],
  sailorSet:        [[-1.4,-13.0], [-.8,-12.9], [-5.4,-13.4]],
  honeyOveralls:    [[-1.25,-13.0], [-.8,-13.1], [-5.8,-13.8]],
  witchDress:       [[-1.7,-11.8], [-.8,-12.0], [-5.7,-13.1]],
  mikoOutfit:       [[.65,-11.25], [1.5,-11.65], [-5.35,-12.9]],
} as const;
const longHair = new Set([null, "mintCape", "cloudPajamas", "apricotNightgown", "mikoOutfit"]);
const scale = 4, width = 320, height = 208;
type Bounds = readonly [left:number, top:number, right:number, bottom:number];

export function verifyBagFits() {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const c = canvas.getContext("2d", {willReadFrequently:true})!;
  function paint(clothes: typeof outfits[number], backpack: ItemId | null, pose: AvatarPose, facing: Facing, step: number) {
    c.clearRect(0,0,width,height);
    c.save();
    c.translate(width/2, pose === "lying" ? 110 : 200);
    c.scale(scale, scale);
    drawAvatar(c, pose, facing, step, {clothes, backpack});
    c.restore();
    return c.getImageData(0,0,width,height).data;
  }
  let frames = 0;
  const angles = new Set<string>();
  for (const clothes of outfits) for (let frame = 0; frame < 15; frame++) {
    const pose = frame < 12 ? "standing" : (["sitting","bench","lying"] as const)[frame-12];
    const facing = (frame < 12 ? Math.floor(frame/3) : 0) as Facing;
    const step = frame < 12 ? frame%3 : 0;
    const bare = paint(clothes, null, pose, facing, step);
    for (const backpack of backpacks) {
      const worn = paint(clothes, backpack, pose, facing, step);
      const label = (clothes ?? "base") + "/" + backpack + "/" + frame;
      const check = (ok:boolean, message:string) => { if (!ok) throw Error(label + " · " + message); };
      // Disregard invisible antialiasing noise when counting ink. Protected interior pixels
      // must match the bare drawing exactly.
      const ink = new Uint8Array(width*height);
      let changed = 0;
      for (let i = 0; i < ink.length; i++) {
        const k = i*4;
        const delta = Math.max(Math.abs(worn[k]-bare[k]), Math.abs(worn[k+1]-bare[k+1]),
          Math.abs(worn[k+2]-bare[k+2]), Math.abs(worn[k+3]-bare[k+3]));
        if (!delta) continue;
        const x = (i%width+.5-width/2)/scale, y = (Math.floor(i/width)+.5-200)/scale;
        check(pose !== "lying" && x >= -13.5 && x <= 13.5 && y >= -24 && y <= -3.5, "背包像素越过人物躯干");
        ink[i] = delta >= 12 ? 2 : 1;
        if (ink[i] === 2) changed++;
      }
      const count = ([left,top,right,bottom]: Bounds, min = 2) => {
        let n = 0;
        for (let y=Math.ceil(200+top*scale-.5); y<200+bottom*scale-.5; y++)
          for (let x=Math.ceil(width/2+left*scale-.5); x<width/2+right*scale-.5; x++)
            if (ink[y*width+x] >= min) n++;
        return n;
      };
      frames++;
      if (pose === "lying") { check(changed === 0, "上床后身上还有包"); continue; }
      if (pose === "standing") angles.add([backpack, clothes, facing].join("/"));
      const satchel = backpack === "rabbitSatchel";
      if (facing === 1 || facing === 2) {
        const dir = facing === 1 ? 1 : -1;
        const [cx,cy] = cuffs[clothes ?? "base"][step];
        const x = dir * (cx-(facing === 2 ? .4 : 0));
        check(count([x-.38,cy-.38,x+.38,cy+.38],1) === 0, "包盖或肩带盖住了手和袖口");
        if (clothes === "mikoOutfit") {
          // In this part of the bare sprite the pale neutral fabric is the wide sleeve.
          // Test its entire interior, excluding the antialiased perimeter and red hakama.
          const white = (k:number) => bare[k+3] >= 248 && bare[k+1] > 155 &&
            bare[k]-bare[k+1] < 42 && Math.abs(bare[k+1]-bare[k+2]) < 18;
          let sampled = 0, covered = 0;
          for (let py=138; py<165; py++) for (let px=119; px<201; px++) {
            const k=(py*width+px)*4;
            if (![0,-8,8,-width*8,width*8].every(d=>white(k+d))) continue;
            sampled++;
            if (ink[k/4]) covered++;
          }
          check(sampled > 350 && covered === 0, `白袖内部被覆盖 ${covered}/${sampled} 像素`);
        }
        if (satchel && facing === 2) {
          check(count([0,-23,11,-14]) >= 12 && count([-13,-14,13,-4],1) === 0, "远侧应仅见肩带");
        } else {
          const zone: Bounds = dir === 1 ? [1,-14,12,-7] : [-12,-14,-1,-7];
          check(count(zone) >= 70, "近侧包体或双肩包侧缘缺失");
        }
      } else if (facing === 3) {
        if (satchel) {
          check(count([-10,-12.5,-5.5,-6]) >= 24, "背面的左胯缺少包的侧缘");
          if (longHair.has(clothes)) check(count([-2.4,-18,2.4,-15.2],1) === 0, "斜带盖住了背面的长发");
        } else check(count([-4,-15,4,-9]) >= 230, "背面缺少背包主体");
      } else if (satchel) {
        const top = pose === "sitting" ? -9.95 : pose === "bench" ? -12.15 : -13.25;
        check(count([4,top,12,top+5.6]) >= 24, "正面胯侧缺少斜挎包");
        check(count([-6,top-5,1,top+1]) >= 7, "斜带没有从另一侧肩膀经过胸前");
      } else {
        const top = pose === "sitting" ? -16.5 : pose === "bench" ? -19 : -22;
        for (const [left,right] of [[-9,-1],[1,9]])
          check(count([left,top,right,top+9]) >= 8, "正面缺少一边的肩带");
      }
    }
  }
  return {frames, angles:angles.size};
}
