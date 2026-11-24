import type { Activities } from "./activities";
import type { Hotspot } from "./maps";
import { playTownRadio, sfx, townRadioDuration } from "./sound";
import { isTownInterior, type TownInteriorId, type TownInteriorKey } from "./town-interior-id";
import { drawTownKeepsake } from "./town-keepsake-art";
import { radioTrackName, townKeepsakeInfo, type RadioTrack, type TownKeepsakes } from "./town-keepsakes";
import { townInteriors } from "./town-interiors";
import type { World } from "./world";

export type RoomEffect =
  | { kind: "window" | "oven" | "board" | "drawer" | "sort" | "blind" }
  | { kind: "shadow" | "reel"; frame: number }
  | { kind: "radio"; start: number };

type Action = { title: string; run: () => void };
interface Panel {
  show: (text: string, options?: Action[], effect?: RoomEffect, timed?: { seconds: number; run: () => void }, portrait?: boolean) => void;
  finish: (track?: RadioTrack) => void;
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

  constructor(
    private world: World,
    private activities: Activities,
    private keepsakes: () => TownKeepsakes,
    private collect: (key: TownInteriorKey, track?: RadioTrack) => void,
    private openBag: (key: TownInteriorKey) => void,
  ) {}

  get roomEffect() { return this.effect; }

  interact(spot: Hotspot) {
    const scene = this.world.scene;
    if (!isTownInterior(scene) || (spot.id !== scene + "-main" && spot.id !== scene + "-extra")) return false;
    const { key } = townInteriors[scene], { name, note } = townKeepsakeInfo[key];
    const panel: Panel = {
      show: (text, options = [], effect, timed, portrait) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        this.activities.dialogue(spot.title, text, options,
          portrait ? c => drawTownKeepsake(c, key, 0, 2) : null, spot.approach, () => {
            clearTimeout(timer);
            this.effect = undefined;
            this.stopAudio?.();
            this.stopAudio = undefined;
          });
        this.effect = effect;
        if (timed) timer = setTimeout(timed.run, timed.seconds * 1000);
      },
      finish: track => {
        const first = !this.keepsakes().items.includes(key);
        if (first) this.collect(key, track);
        panel.show(first ? `收下了${name}。${note}` : note, [
          { title: "查看纪念物", run: () => { this.activities.close(); this.openBag(key); } },
          { title: "再做一次", run: () => this.main(scene, panel) },
        ], undefined, undefined, true);
      },
      listen: (text, track, after) => {
        panel.show(text, [], { kind: "radio", start: this.world.ambientTime }, { seconds: townRadioDuration, run: after });
        this.stopAudio = playTownRadio(track);
      },
    };
    if (spot.id.endsWith("-main")) this.main(scene, panel);
    else this.extra(scene, panel);
    return true;
  }

  private main(scene: TownInteriorId, { show, finish, listen }: Panel) {
    switch (scene) {
      case "town-florist": {
        const press = (color: string) => show(`${color}花瓣躺进了透光纸。合好木板，从另一边抽出纸条。`, [
          { title: "压一下，举到光里", run: () => {
            sfx("flip");
            show("花签映着窗光，花瓣的细脉一根根透了出来。", [{ title: "收下窗光花签", run: () => finish() }], undefined, undefined, true);
          } },
        ]);
        show("压花台上放着两片自然落下的洋桔梗花瓣。挑一片夹进透光纸。", [
          { title: "挑浅紫花瓣", run: () => press("浅紫") },
          { title: "挑奶白花瓣", run: () => press("奶白") },
        ]);
        break;
      }
      case "town-baker": {
        const oven = { kind: "oven" } as const;
        const ready = () => {
          sfx("echo-bell");
          show("炉铃翻牌了。小饼边缘烤成金色，最中间那颗草莓稍微歪了一点。",
            [{ title: "把小饼装进铁盒", run: () => finish() }], oven, undefined, true);
        };
        show("木案上留了一张薄面片，旁边是一枚草莓压模。", [
          { title: "压出一盘草莓模", run: () => show("把成形的小饼排进铁盘，留一点空隙。", [
            { title: "把烤盘推进砖炉", run: () => {
              sfx("interact");
              show("炉口亮了一下。等炉铃翻牌，就能取出这一盘。", [], oven, { seconds: 1.45, run: ready });
            } },
          ]) },
        ]);
        break;
      }
      case "town-maker": {
        const turn = (frame: number) => {
          const captions = ["星影在月牙左边。", "星尖落进月牙中央，五个尖角都照亮了。", "星影已经转到月牙右边。"];
          const rotate = { title: "转动铜片", run: () => { sfx("flip"); turn((frame + 1) % 3); } };
          const options = frame === 1 ? [{ title: "收下透星铜片", run: () => finish() }, rotate] : [rotate];
          show(captions[frame], options, { kind: "shadow", frame });
        };
        turn(0);
        break;
      }
      case "town-post": {
        const choose = (place: string) => show(`把${place}的风景片放在压柄下，邮票角对准槽口。`, [
          { title: "压下月牙邮戳", run: () => {
            sfx("flip");
            show(`抬起压柄，月牙印在${place}的邮票角上。`, [{ title: "收下明信片", run: () => finish() }], undefined, undefined, true);
          } },
        ]);
        show("木匣里有两张预印的小镇风景片。", [
          { title: "选广场彩旗", run: () => choose("广场彩旗") },
          { title: "选池边街灯", run: () => choose("池边街灯") },
        ]);
        break;
      }
      case "town-books": {
        const folds = ["晨光", "午影", "灯下"];
        const fold = (index: number) => {
          const text = ["桌上有三段池岸，从左到右是晨光、午影和灯下。", "第一道水线沿折痕翻过去，露出午后的树影。", "第二折的睡莲碰到了画在最后一张上的街灯。"];
          show(text[index], [{ title: "折起" + folds[index], run: () => {
            sfx("flip");
            if (index < 2) fold(index + 1);
            else show("三折展开，晚灯、睡莲和木栏连上了同一条水岸。", [{ title: "收下池畔折页", run: () => finish() }], undefined, undefined, true);
          } }]);
        };
        fold(0);
        break;
      }
      case "town-radio": {
        const mix = (track: RadioTrack) => show(`${radioTrackName[track]}在第一轨等着。把片头的音乐推上第二轨。`, [
          { title: "推起音乐", run: () => listen(`试播灯亮了。声轨一为${radioTrackName[track]}，声轨二为晚安片头。`, track, () =>
            show("两排电平慢慢落下。台标上留着『晚安，今夜也请好梦』。", [{ title: "收下晚安试播带", run: () => finish(track) }], undefined, undefined, true)) },
        ]);
        show("选择今晚片头里最先响起的一种声音。", [
          { title: "用溪水声", run: () => mix("creek") },
          { title: "用檐铃声", run: () => mix("bells") },
        ]);
        break;
      }
      case "town-hall": {
        const captions = ["镜片暗着。影箱旁的手柄正好够到。", "第一格是空广场，石砖上还画着粉笔线。", "第二格挂上了彩旗，有人踩着小凳拉住绳尾。", "第三格亮起街灯。一张票根从影箱侧面露出一个角。"];
        const reel = (frame: number) => show(captions[frame], [frame === 3
          ? { title: "取下亮灯夜票根", run: () => finish() }
          : { title: "摇一下手柄", run: () => { sfx("flip"); reel(frame + 1); } },
        ], frame ? { kind: "reel", frame } : undefined);
        reel(0);
        break;
      }
    }
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
        const pond = { dawn: "睡莲叶上还留着水珠。", day: "正午的池光照到窗座。", dusk: "窗外的桥影落在水面。", night: "一盏街灯照着岸边的睡莲。" };
        const compare = { title: "展开折页对照", run: () => show("折页里的木栏刚好接在窗外那一段。" + pond[phase], [], { kind: "blind" }, undefined, true) };
        show("竹帘卷起来了。" + pond[phase], items.includes("books") ? [compare] : [], { kind: "blind" });
        break;
      }
      case "town-radio": {
        const title = radioTrack ? `重听${radioTrackName[radioTrack]}片头` : "试听电台台呼";
        const play = { title, run: () => listen(radioTrack ? `正在重听。声轨一为${radioTrackName[radioTrack]}，声轨二为晚安片头。` : "耳机里响起台呼。『晚安小镇，现在是试音时间。』",
          radioTrack, () => show("耳机里的余音淡了下去。", [play])) };
        show(`现在的台标是『${radioStatus[phase]}』。戴上耳机，可以试听。`, [play]);
        break;
      }
      case "town-hall": {
        const roomNames = items.map(key => townInteriors[`town-${key}`].scene.title).join("、");
        show(items.length === 0 ? "七栋小屋的窗还暗着。每收下一件小物，它来自的那栋屋子就会亮一扇窗。"
          : items.length === 7 ? "七扇窗都亮了，每栋屋前摆着一件小小的复制品。整条周年街都亮了起来。"
            : `已经亮了 ${items.length} 扇窗。${roomNames}的窗前各摆着一件小物。`);
        break;
      }
    }
  }
}
