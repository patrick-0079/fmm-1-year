import { NATURE_KEY, WORLD_CLOCK_KEY, loadWorldClock, pickedGardenEggs, readGardenBag, readWorldClock } from "./nature-save";
import { REAL_MINUTES_PER_DAY, eggAvailable, phaseNames, untilNextPhase, worldTime } from "./day";
import type { Phase } from "./day";
import { drawTownLight } from "./town-light";
import { isTownInterior } from "./town-interior-id";
import { daylightMix } from "./daylight-mix";
import { drawGardenSurfaceLight, drawSceneDaylight, drawWindowLightOnFloor } from "./scene-daylight";
import { sfx } from "./sound";
import { reservedShortcut, readingTarget } from "./input";
import type { Activities } from "./activities";
import type { Inventory } from "./inventory";
import type { World } from "./world";
import type { Hotspot } from "./maps";
import { courageBorder } from "./courage-border";
import { challengeTrees } from "./landscape";
import { drawGardenTree } from "./landscape-renderer";
import { creekDepthLayers, drawCreek } from "./creek-art";
import benchUrl from "./assets/garden-bench.webp";
import treeUrl from "./assets/apple-tree.webp";
import dewUrl from "./assets/morning-dew-flower.webp";
import roomArtUrl from "./assets/room-interactive.webp";
import { sceneImage } from "./texture-cache";
import { drawRoomWindow } from "./window-sky";
import { drawCurtainBreeze, drawFabricGround, fruitShift, windLevel } from "./scenery-wind";
import { drawKeepsake } from "./scene-art";
import { drawWildSprite } from "./wild-art";
import { drawFirefly, fireflyDrift } from "./firefly-art";
import gardenDetails from "./garden-street-details.json";
import cinemaSurroundings from "./garden-cinema-covers.json";
import roomFlowers from "./room-floral-covers.json";
import { prepareMapCovers, visibleMapCovers } from "./map-covers";
import { mapFragment } from "./map-fragment";
import { gardenForeground } from "./garden-foreground";
import { gardenGateLamp } from "./garden-gate-lamp";
import { gardenSign } from "./garden-sign";
import { roomFurniture } from "./room-furniture";
import { roomBalloons } from "./room-foreground";
// The cinema contours stop where the creek and its bridge cover the original painting.
const gardenCovers = prepareMapCovers([...gardenDetails, ...cinemaSurroundings]);
const roomFloralCovers = prepareMapCovers(roomFlowers);

export { NATURE_KEY } from "./nature-save";
export class Nature {
  private treeImage = sceneImage(treeUrl);
  private benchImage = sceneImage(benchUrl);
  private dewImage = sceneImage(dewUrl);
  private windowImage = sceneImage(roomArtUrl);
  private timeline = { origin: Date.now(), shift: 0 };
  private state = readGardenBag();
  private storage: Storage | null = null;
  private lastUi = 0;
  private lastClockLabel = "";
  private oldPhase = "";
  private previewPhase: Phase | null = null;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(
    private world: World,
    private activities: Activities,
    private toast: (text: string) => void,
    private inventory: Inventory,
    private canSave: () => boolean,
  ) {
    try {
      this.storage = window.localStorage;
      this.timeline = loadWorldClock(this.storage, Date.now());
      this.state = readGardenBag(this.storage.getItem(NATURE_KEY));
    } catch { this.storage = null; }
    window.addEventListener("storage", event => {
      if (event.key === WORLD_CLOCK_KEY || event.key === NATURE_KEY || event.key === null) this.syncGarden();
    });
    window.addEventListener("pageshow", event => { if (event.persisted) this.syncGarden(); });
    this.world.available = (spot) => this.available(spot);
    this.world.onEnvironment = c => this.draw(c);
    this.world.onLighting = (c) => this.lighting(c);
    this.world.getDepthLayers = () => this.depthLayers();
    const tick = this.world.onTick;
    this.world.onTick = (dt, t) => {
      tick(dt, t);
      this.tick();
    };
    window.addEventListener("keydown", (e) => {
      if (reservedShortcut(e) || this.world.suspended || readingTarget(e.target)) return;
      if (
        e.key.toLowerCase() === "h" &&
        !e.repeat &&
        !this.world.paused &&
        !this.world.busy &&
        !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        this.toggleCrown();
      }
    });
    this.tick();
  }
  get elapsed() {
    return Math.max(0, (Date.now() - this.timeline.origin) / 1000 + this.timeline.shift);
  }
  private get clock() {
    const time=worldTime(this.elapsed), phase=this.previewPhase;
    if(!phase) return time;
    const hours={dawn:6,day:12,dusk:18,night:22}[phase];
    return {...time,hours,phase,label:String(hours).padStart(2,"0")+":00"};
  }
  onTimeJump: () => void = () => {};
  setPreviewPhase(phase:Phase|null) {
    this.previewPhase=phase;
    this.refreshClock();
    this.onTimeJump();
  }
  get timePreview() { return this.previewPhase; }
  get pickedEggs() { return pickedGardenEggs(this.state); }
  private key(id: string, day: number) {
    return `${day}:${this.world.scene}:${id}`;
  }
  private picked(id: string) {
    return this.state.picked[this.key(id, this.clock.day)] ?? 0;
  }
  /** Take one and return the quantity available before this pickup. */
  private claim(id: string, limit: number) {
    const { day, phase } = this.clock;
    const key = this.key(id, day), count = this.state.picked[key] ?? 0;
    if (count >= limit || !eggAvailable(id, phase)) return 0;
    this.state.picked[key] = count + 1;
    return limit - count;
  }
  private syncGarden() {
    if (!this.storage) return;
    let clock;
    try {
      // A queued storage event may already have been superseded by another write.
      clock = readWorldClock(this.storage.getItem(WORLD_CLOCK_KEY), Date.now());
      this.state = readGardenBag(this.storage.getItem(NATURE_KEY));
    } catch { this.storage = null; return; }
    const jumped = clock && (clock.origin !== this.timeline.origin || clock.shift !== this.timeline.shift);
    if (clock) this.timeline = clock;
    this.refreshClock();
    if (jumped) this.onTimeJump();
  }
  private changeGarden(action: () => void) {
    const scene = this.world.scene;
    const apply = () => {
      if (this.world.scene !== scene || !this.canSave()) return;
      this.syncGarden();
      action();
    };
    // A bench jump and a harvest must agree on the day, including the final fruit
    // picked from two windows at once. Keep the lock only for the synchronous change.
    if (!this.storage || !navigator.locks) { apply(); return; }
    let acquired = false;
    void navigator.locks.request(NATURE_KEY, () => {
      acquired = true;
      apply();
    }).catch(error => {
      if (acquired) throw error;
      apply();
    });
  }
  private saveClock() {
    try { this.storage?.setItem(WORLD_CLOCK_KEY, JSON.stringify(this.timeline)); }
    catch { this.storage = null; }
  }
  private save() {
    // Only today's and yesterday's scenery state is needed; the bag is cumulative.
    for (const key of Object.keys(this.state.picked))
      if (Number(key.split(":")[0]) < this.clock.day - 1)
        delete this.state.picked[key];
    try {
      this.storage?.setItem(NATURE_KEY, JSON.stringify(this.state));
    } catch { this.storage = null; }
    this.lastUi = 0;
    this.tick();
  }
  reset() {
    this.state = readGardenBag();
    this.timeline = { origin: Date.now(), shift: 0 };
    this.previewPhase=null;
    this.oldPhase = "";
    this.lastUi = 0;
    this.saveClock();
    this.save();
    this.tick();
  }
  private available(spot: Hotspot) {
    if (spot.id === "wreath") return !this.inventory.has("wreath");
    if (spot.id === "apple" || spot.id === "flowers") return this.picked(spot.id) < 3;
    if (!eggAvailable(spot.id, this.clock.phase)) return false;
    if (["drop", "dew", "sunset", "firefly"].includes(spot.id))
      return this.picked(spot.id) === 0;
    return true;
  }
  interact(id: string) {
    if (
      ![
        "wreath",
        "apple",
        "flowers",
        "drop",
        "rest",
        "dew",
        "sunset",
        "firefly",
      ].includes(id)
    )
      return false;
    if (id === "wreath") {
      this.inventory.grant("wreath");
      this.changeGarden(() => { this.state.wreath = true; this.save(); });
      sfx("match");
      this.activities.note(
        "捡到一顶花环 · 按 H 戴上，或打开背包为芙芙搭配",
      );
      return true;
    }
    if (id === "rest") {
      const bench = this.world.config.spots.find((s) => s.id === "rest");
      if (!bench) return false;
      this.world.sit(bench, bench.approach);
      let seat = this.world.restState;
      this.activities.menu(
        `在长椅上坐下了 · 现在是${phaseNames[this.clock.phase]}，歇一会再走吧`,
        [
          {
            title: "起身继续走",
            run: () => {
              this.world.standUp();
              this.activities.close();
            },
          },
          { title: "坐着等到下一时段", run: () => {
            const elapsed = this.elapsed;
            const target = Math.round(elapsed + untilNextPhase(elapsed, this.previewPhase ?? undefined));
            this.changeGarden(() => {
              if (!seat || this.world.restState !== seat) return;
              seat = null;
              this.rest(target);
            });
          } },
          {
            title: "看看时段彩蛋",
            run: () =>
              this.activities.note(
                "清晨 05–08 点找晨露花 · 黄昏 17–20 点找小纸船 · 夜晚 20–05 点找萤火心愿",
              ),
          },
        ],
      );
      return true;
    }
    this.changeGarden(() => this.harvest(id));
    return true;
  }
  private harvest(id: string) {
    if (id === "apple") {
      this.pickApple();
      return;
    }
    if (id === "flowers") {
      this.pickFlower();
      return;
    }
    if (!this.claim(id, 1)) {
      this.toast("这份小惊喜正在等另一个时刻。去勇气花园的长椅歇一会，也许会有新发现。");
      return;
    }
    this.state.star++;
    this.save();
    if (id === "dew" || id === "sunset" || id === "firefly") this.world.onAchievementEvent(id);
    sfx("match");
    const words: Record<string, string> = {
      drop: "捡到了一颗掉落的星屑 · 地上的闪光已经收进小口袋啦",
      dew: "清晨的晨露花，只为早起的小冒险家绽放 · 星屑 +1",
      sunset: "拾起一只金色小纸船 · 愿芙芙一路顺风，黄昏也有光 · 星屑 +1",
      firefly: "萤火虫绕着你画了一个爱心，又飞回花丛 · 星夜心愿已收好，星屑 +1",
    };
    this.activities.note(words[id]);
  }
  private pickApple() {
    const remaining = this.claim("apple", 3);
    const basket = this.world.scene === "garden";
    if (remaining > 0) {
      this.state.apple++;
      sfx("flip");
      this.save();
    }
    this.activities.menu(
      remaining > 0
        ? `${basket ? "拿到" : "摘到"}一颗甜苹果！${basket ? "果篮里" : "树上"}还剩 ${remaining - 1} 颗`
        : basket ? "果篮里的苹果拿完啦 · 明天还会补上"
          : "今天树上的苹果摘完啦 · 明天会重新长出来",
      remaining > 1 ? [{ title: basket ? "再拿一颗" : "再摘一颗", run: () => this.interact("apple") }] : [],
    );
  }
  private pickFlower() {
    const remaining = this.claim("flowers", 3);
    if (remaining > 0) {
      this.state.flower++;
      this.inventory.grant("wreath");
      this.state.wreath = true;
      sfx("match");
      this.save();
    }
    this.activities.menu(
      remaining > 0
        ? "采到小花，编进花环里 · 按 H 戴上，或打开背包搭配花环"
        : "这片花今天采完啦，明天再来看看。",
      [
        ...(remaining > 1
          ? [{ title: "再采一朵", run: () => this.interact("flowers") }]
          : []),
      ],
    );
  }
  private toggleCrown() {
    if (!this.inventory.has("wreath") && this.inventory.state.equipped.head !== "wreath") return;
    this.inventory.toggle("wreath");
    this.changeGarden(() => { this.state.wearing = this.inventory.wearingWreath; this.save(); });
  }
  private rest(target: number) {
    // A second window may already have reached the boundary chosen on this bench.
    if (target > this.elapsed) {
      this.timeline = { origin: Date.now(), shift: target };
      this.saveClock();
    }
    this.previewPhase = null;
    this.refreshClock();
    this.onTimeJump();
    this.activities.note(
      `伸个懒腰，现在是${phaseNames[this.clock.phase]}啦 · 去看看花园里新出现的小惊喜吧`,
    );
    sfx("portal");
  }
  private tick() {
    const clock = this.clock;
    this.world.currentPhase = clock.phase;
    this.world.lightMix = daylightMix(clock.hours);
    const meadow = this.world.scene === "meadow";
    const ruins = this.world.scene === "ruins";
    if (this.oldPhase !== clock.phase) {
      if (this.oldPhase && !meadow && !ruins) {
        const change = this.world.scene === "room" ? "窗外换了光景" :
          this.world.scene === "town" || isTownInterior(this.world.scene) ? "小镇换了光景" : "花园里的风景悄悄变了";
        this.toast(`${phaseNames[clock.phase]}到了 · ${change}`);
      }
      this.oldPhase = clock.phase;
    }
    if (Date.now() - this.lastUi < 350 && this.lastClockLabel === clock.label) return;
    this.lastUi = Date.now();
    this.lastClockLabel = clock.label;
    const time = document.querySelector(".time-pill")!;
    this.world.canvas.parentElement!.dataset.lightScene=this.world.scene;
    (time as HTMLElement).dataset.phase=clock.phase;
    time.textContent = ruins ? "♫ 遗迹 · 长明灯" : meadow ? "☾ 花海 · 静夜" : `${{ dawn: "☀", day: "☀", dusk: "◒", night: "☾" }[clock.phase]} ${clock.label} · ${phaseNames[clock.phase]}`;
    time.setAttribute(
      "title",
      ruins ? "地底的石灯昼夜长明" : meadow ? "花海长夜，庭院的时钟仍在走动" : `第 ${clock.day} 天 · 现实 1 秒是游戏 1 分钟 · 勇气花园长椅可休息到下一时段`,
    );
    document.querySelector(".bag-count")!.textContent =
      `苹果 ${this.state.apple} · 花朵 ${this.state.flower} · 星屑 ${this.state.star}`;
    const wearing = this.inventory.state.equipped.head === "wreath";
    this.state.wearing = this.inventory.has("wreath") && wearing;
    document.querySelector(".day-hint")!.textContent = isTownInterior(this.world.scene) ? "走回门垫，从南门回小镇街道。" :
      ruins ? "石廊里的三块铭文，记着一段遗忘的晚安。" : meadow ? "草间有落星，营火旁有一只收着星光的玻璃瓶。" :
      `第 ${clock.day} 天 · ${REAL_MINUTES_PER_DAY} 分钟一昼夜 · ${clock.phase === "dawn" ? "晨露花醒来了" : clock.phase === "dusk" ? "溪边漂来一只纸船" : clock.phase === "night" ? "萤火心愿悄悄出现" : "去勇气花园的长椅休息，等一场黄昏和星夜"}`;
  }
  refreshClock() {
    this.lastUi = 0;
    this.tick();
  }
  private draw(c: CanvasRenderingContext2D) {
    const t = this.reduce.matches ? 0 : this.world.ambientTime;
    if (this.world.scene === "room") {
      const light = daylightMix(this.clock.hours);
      drawRoomWindow(c, light, this.windowImage, t);
      drawWindowLightOnFloor(c, light);
      if (!this.reduce.matches) drawCurtainBreeze(c,this.world);
      return;
    }
    if (!this.reduce.matches && (this.world.scene === "ruins" || this.world.scene === "meadow"))
      drawFabricGround(c,this.world);
    if (this.world.scene !== "garden" && this.world.scene !== "challenge") return;
    const light = daylightMix(this.clock.hours);
    drawCreek(c, this.world.creekProps, this.world.scene, t, light);
    drawGardenSurfaceLight(c, this.world.scene, light);
    const atlas = this.world.orchardSprites;
    if (this.world.scene === "challenge") {
      drawWildSprite(c, atlas, 2, 450, 110, 25);
    }
    const flowers = this.world.config.spots.find((s) => s.id === "flowers")!;
    const picked = this.picked("flowers");
    const tufts = [[9, -2, 15], [-11, 4, 17], [3, 7, 19]];
    for (let i = 0; i < tufts.length - picked; i++) {
      const [dx, dy, size] = tufts[i];
      drawWildSprite(c, atlas, 1, flowers.x + dx, flowers.y + dy, size, i === 1);
    }
    for (const spot of this.world.config.spots) {
      if (!this.available(spot)) continue;
      if (spot.id === "wreath")
        drawKeepsake(c, "wreath", spot.x, spot.y, 31);
      if (spot.id === "drop") {
        drawKeepsake(c, "star", spot.x, spot.y, 29);
      }
      if (spot.id === "dew") {
        if (this.dewImage.complete && this.dewImage.naturalWidth)
          c.drawImage(this.dewImage, spot.x - 16, spot.y - 30, 32, 40);
      }
      if (spot.id === "sunset") {
        drawWildSprite(c, atlas, 3, spot.x, spot.y + 7, 31);
      }
      if (spot.id === "firefly") {
        const time = this.reduce.matches ? 0 : t;
        const patch = [[-24,-8],[-12,-14],[2,-20],[19,-11],[-17,3],[5,1],[24,6],[-2,14],[12,-4]];
        for (const [i, [dx, dy]] of patch.entries()) {
          const phase = i * 1.73 + 2;
          const drift = fireflyDrift(time, phase, .85);
          drawFirefly(c, spot.x + dx + drift.x, spot.y + dy + drift.y,
            time, phase, .85 + i % 3 * .13, .85);
        }
      }
    }
  }
  private depthLayers() {
    if (this.world.scene === "room") return [
      ...visibleMapCovers(this.world, roomFloralCovers),
      ...roomFurniture.filter(p => p.id !== "bed" || this.world.restState?.kind !== "lying")
        .map(p => ({y:p.y, outline:mapFragment(p.points).mask, draw:(c:CanvasRenderingContext2D) => this.world.drawMapFragment(c,p.points)})),
      {y:249, draw:(c:CanvasRenderingContext2D) => this.activities.drawCake(c, performance.now() / 1000)},
      {y:377, draw:(c:CanvasRenderingContext2D) => {
        c.save();
        const feet = this.world.player;
        if (feet.x < 110 && feet.y > 295 && feet.y < 377) c.globalAlpha *= 0.68;
        for (const silhouette of roomBalloons) this.world.drawMapFragment(c, silhouette);
        c.restore();
      }},
    ];
    if (this.world.scene !== "garden" && this.world.scene !== "challenge")
      return [];
    const scene = this.world.scene,
      apple = this.world.config.spots.find((s) => s.id === "apple")!,
      bench = this.world.config.spots.find((s) => s.id === "rest");
    const creek = creekDepthLayers(scene, this.world.creekProps);
    if (scene === "garden") {
      return [
        ...creek,
        ...visibleMapCovers(this.world, gardenCovers),
        ...gardenForeground.map(part => ({y:part.y, outline:mapFragment(part.points).mask, draw:(c:CanvasRenderingContext2D) => this.world.drawMapFragment(c,part.points)})),
        { y: apple.y + 4, draw: (c: CanvasRenderingContext2D) => {
          const basket = this.world.appleBasket;
          c.fillStyle = "#294a3c48";
          c.beginPath();
          c.ellipse(apple.x, apple.y + 2, 18, 5, 0, 0, Math.PI * 2);
          c.fill();
          if (basket?.naturalWidth) c.drawImage(basket, apple.x - 21, apple.y - 15, 42, 19);
          for (let i = this.picked("apple"); i < 3; i++) {
            drawWildSprite(c, this.world.orchardSprites, 0, apple.x + [-10, 10, 0][i],
              apple.y + [-5, -6, -9][i], [12, 12, 11][i], i === 1);
          }
        } },
        { y: 479, draw: (c: CanvasRenderingContext2D) => this.world.drawMapFragment(c, gardenSign) },
        { y: 984 * 600 / 1024, draw: (c: CanvasRenderingContext2D) => {
          for (const outline of gardenGateLamp) this.world.drawMapFragment(c, outline);
        } },
      ];
    }
    return [
      ...creek,
      ...courageBorder.map(({y,points}) => ({y, outline:mapFragment(points).mask, draw:(c:CanvasRenderingContext2D) => this.world.drawMapFragment(c,points)})),
      ...challengeTrees.map((tree) => ({
        y: tree.y + 23 * tree.scale,
        draw: (c: CanvasRenderingContext2D) =>
          drawGardenTree(c, this.treeImage, tree, this.treeBreeze(tree.x,tree.y)),
      })),
      {
        y: apple.y + 23,
        draw: (c: CanvasRenderingContext2D) => {
          const breeze=this.reduce.matches ? 0 : windLevel(this.world,.95);
          drawGardenTree(c, this.treeImage, {
            x: apple.x,
            y: apple.y,
            scale: 1,
            tone: 0,
          },breeze);
          for (let i = this.picked("apple"); i < 3; i++) {
            const x = apple.x + [-19, 17, -1][i], y = apple.y + [-3, -8, -23][i];
            const stem=fruitShift(x-apple.x+36,y-apple.y+43,breeze);
            drawWildSprite(c, this.world.orchardSprites, 0, x+stem.x, y+stem.y, [14, 15, 13][i], i === 1);
          }
        },
      },
      ...(bench ? [{
        y: this.world.restState?.kind === "sitting" ? bench.y : bench.y + 17,
        draw: (c: CanvasRenderingContext2D) => {
          if (this.benchImage.complete && this.benchImage.naturalWidth)
            c.drawImage(this.benchImage, bench.x - 38, bench.y - 25, 76, 46);
        },
      }] : []),
    ];
  }
  private treeBreeze(x:number,y:number) {
    if (this.reduce.matches) return 0;
    if (x!==153 && x!==143 && x!==278) return 0;
    return windLevel(this.world,Math.max(0,(y-145)/300));
  }
  private lighting(c: CanvasRenderingContext2D) {
    const scene = this.world.scene;
    if (scene === "meadow" || scene === "ruins" || isTownInterior(scene)) return;
    const hours = this.clock.hours;
    if (scene === "town") drawTownLight(c, hours, this.world.ambientTime, this.reduce.matches);
    else drawSceneDaylight(c, scene, daylightMix(hours));
  }
}
