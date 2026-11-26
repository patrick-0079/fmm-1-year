import type { Activities } from "./activities";
import type { Hotspot } from "./maps";
import { playTownRadio, sfx, townRadioDuration } from "./sound";
import { isTownInterior, townInteriorId, townInteriorKeys, type TownInteriorId, type TownInteriorKey } from "./town-interior-id";
import { drawTownKeepsake, prepareTownKeepsakeArt } from "./town-keepsake-art";
import { radioTrackName, townKeepsakeChoice, townKeepsakeInfo, type RadioTrack, type TownKeepsakes } from "./town-keepsakes";
import { townInteriors } from "./town-interiors";
import { TownWorkbench } from "./town-workbench";
import { anniversary } from "./launch/anniversary";
import { copperTolerance } from "./town-workbench-steps";
import type { World } from "./world";

export type RoomEffect =
  | { kind: "window" | "oven" | "board" | "drawer" | "sort" | "blind" }
  | { kind: "shadow" | "reel"; frame: number }
  | { kind: "radio"; start: number };

type Action = { title: string; run: () => void };
interface Panel {
  show: (text: string, options?: Action[], effect?: RoomEffect, timed?: { seconds: number; run: () => void }, portrait?: boolean) => void;
  listen: (text: string, track: RadioTrack | undefined, after: () => void) => void;
}

const phaseBoard = {
  dawn: "一排小圆旁是一排大圆，栗栗在中间画了支胖箭头。",
  day: "白板上是三只草莓压模。最后一只旁边添了个小勾。",
  dusk: "最后一盘小饼出炉了。栗栗把两颗烤歪的草莓也画了上去。",
  night: "东灯照着收工的白板，最底下画了一个等到明早的小烤盘。",
};
const mailRoutes = {
  dawn: "晨邮 · 邮局出门向东，送过广场再上北街。",
  day: "分信 · 短柜是小镇回信，长格留给晚安小屋。",
  dusk: "收信 · 经过南边的池塘，再收溪边最后一筒。",
  night: "晚邮 · 在台灯下封好信，明早沿花阶送出去。",
};
const radioStatus = { dawn: "已收播", day: "待机", dusk: "预听", night: "播出" };

export class TownInteriorActivities {
  private effect?: RoomEffect;
  private stopAudio?: () => void;
  private refreshDisplay?: () => void;

  constructor(
    private world: World,
    private activities: Activities,
    private keepsakes: () => TownKeepsakes,
    private collect: (key: TownInteriorKey, choice?: string) => boolean,
    private openBag: (key: TownInteriorKey) => void,
  ) {}

  get roomEffect() { return this.effect; }
  refreshCollection() { this.refreshDisplay?.(); }

  private portrait(key: TownInteriorKey) {
    return {
      ready: prepareTownKeepsakeArt(),
      draw: (c: CanvasRenderingContext2D) => drawTownKeepsake(c, key, townKeepsakeChoice(this.keepsakes(), key)),
    };
  }

  interact(spot: Hotspot) {
    const scene = this.world.scene;
    if (!isTownInterior(scene) || (spot.id !== scene + "-main" && spot.id !== scene + "-extra")) return false;
    const { key } = townInteriors[scene];
    if (spot.id.endsWith("-main")) {
      this.workbench(spot, key);
      return true;
    }
    if (key === "hall") {
      this.collection(spot);
      return true;
    }
    const panel: Panel = {
      show: (text, options = [], effect, timed, portrait) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        this.activities.dialogue(spot.title, text, options,
          portrait ? this.portrait(key) : null, spot.approach, () => {
            clearTimeout(timer);
            this.effect = undefined;
            this.stopAudio?.();
            this.stopAudio = undefined;
          });
        this.effect = effect;
        if (timed) timer = setTimeout(timed.run, timed.seconds * 1000);
      },
      listen: (text, track, after) => {
        panel.show(text, [], { kind: "radio", start: this.world.ambientTime }, { seconds: townRadioDuration, run: after });
        this.stopAudio = playTownRadio(track);
      },
    };
    this.extra(scene, panel);
    return true;
  }

  private workbench(spot: Hotspot, key: TownInteriorKey) {
    const { name, note } = townKeepsakeInfo[key];
    this.activities.workbench(spot.title, (root, status) => {
      const bench = new TownWorkbench(key, root, status, {
        preview: (step, rotation) => {
          if (key === "baker" && (step === "baking" || step === "tin")) this.effect = { kind: "oven" };
          else if (key === "maker" && step === "align") this.effect = {
            kind: "shadow", frame: Math.abs(rotation) <= copperTolerance ? 1 : rotation < 0 ? 0 : 2,
          };
          else if (key === "radio" && step === "listen") {
            if (this.effect?.kind !== "radio") this.effect = { kind: "radio", start: this.world.ambientTime };
          } else if (key === "hall" && (step === "reel" || step === "ticket")) {
            this.effect = { kind: "reel", frame: step === "ticket" ? 3 : Math.floor(rotation / 120) };
          } else this.effect = undefined;
        },
        collect: choice => {
          const first = this.collect(key, choice);
          this.activities.dialogue(spot.title, first ? "收下了" + name + "。" + note : note, [
            { title: "查看纪念物", run: () => { this.activities.close(); this.openBag(key); } },
            { title: "再做一次", run: () => this.workbench(spot, key) },
          ], this.portrait(key), spot.approach);
        },
      });
      return {
        cancelInput: () => bench.cancelInput(),
        dispose: () => { bench.dispose(); this.effect = undefined; },
      };
    });
  }

  private collection(spot: Hotspot) {
    const content = document.createElement("section");
    content.className = "town-collection-list";
    content.setAttribute("aria-label", "小镇纪念品收藏清单");
    const count = document.createElement("strong");
    count.className = "collection-count";
    count.setAttribute("role", "status");
    const list = document.createElement("ul");
    const rows = townInteriorKeys.map(key => {
      const row = document.createElement("li"), identity = document.createElement("span"), state = document.createElement("span");
      identity.textContent = townInteriors[townInteriorId(key)].scene.title + " · " + townKeepsakeInfo[key].name;
      state.className = "collection-state";
      row.append(identity, state);
      list.append(row);
      return { key, state };
    });
    const update = () => {
      const { items } = this.keepsakes();
      count.textContent = "已收集 " + items.length + " / " + townInteriorKeys.length;
      for (const { key, state } of rows) {
        const collected = items.includes(key);
        state.dataset.collected = String(collected);
        state.textContent = collected ? "已收集" : "待收集";
      }
    };
    const dates = document.createElement("small");
    dates.textContent = `${anniversary.start} — ${anniversary.end}`;
    const note = document.createElement("p");
    note.textContent = "「七件小物都收齐了？白昼或黄昏来馆里找我，给你留了套女巫戏服。」——暖栗";
    content.append(count, dates, list, note);
    update();
    this.activities.dialogue(spot.title, "", [], null, spot.approach, () => {
      this.refreshDisplay = undefined;
    }, undefined, content);
    this.refreshDisplay = update;
  }

  private extra(scene: TownInteriorId, { show, listen }: Panel) {
    const { items, radioTrack } = this.keepsakes();
    const phase = this.world.currentPhase;
    switch (scene) {
      case "town-florist":
        sfx("echo-bell");
        show("气窗抬起来了。吊铃碰了一下，叶影慢慢扫过花桶。",
          [{ title: "放回窗把", run: () => this.activities.close() }], { kind: "window" });
        break;
      case "town-baker":
        show(phaseBoard[phase], [{ title: "翻到背面", run: () => {
          sfx("flip");
          show(phase === "dawn" ? phaseBoard.dusk : phaseBoard.dawn, [{ title: "放回白板", run: () => this.activities.close() }], { kind: "board" });
        } }]);
        break;
      case "town-maker":
        sfx("flip");
        show("左边的黄铜保留一圈圈锤纹，右边那一片磨得平整，能映出灯罩的边。",
          [{ title: "合上抽屉", run: () => this.activities.close() }], { kind: "drawer" });
        break;
      case "town-post":
        sfx("flip");
        show("木牌翻到这一班。" + mailRoutes[phase], [{ title: "把木牌放回去", run: () => this.activities.close() }], { kind: "sort" });
        break;
      case "town-books": {
        sfx("flip");
        const view = { dawn: "对街的青瓦上闪着晨露。", day: "树梢在青瓦前轻轻摇晃。", dusk: "斜阳给屋檐描了一条金边。", night: "树影后面，街灯已经亮了。" };
        const compare = { title: "展开折页对照", run: () => show("折页里池岸边的屋顶，和窗外的青瓦是同一种颜色。" + view[phase], [], { kind: "blind" }, undefined, true) };
        show("竹帘卷起来了。" + view[phase], items.includes("books") ? [compare] : [], { kind: "blind" });
        break;
      }
      case "town-radio": {
        const title = radioTrack ? `重听${radioTrackName[radioTrack]}片头` : "试听电台台呼";
        const play = { title, run: () => listen(radioTrack ? `正在重听。声轨一为${radioTrackName[radioTrack]}，声轨二为晚安片头。` : "耳机里响起台呼。『晚安小镇，现在是试音时间。』",
          radioTrack, () => show("耳机里的余音淡了下去。", [play])) };
        show(`现在的台标是『${radioStatus[phase]}』。戴上耳机，可以试听。`, [play]);
        break;
      }
    }
  }
}
