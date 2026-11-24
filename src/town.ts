import type { World, DepthLayer } from "./world";
import type { Inventory } from "./inventory";
import type { Activities } from "./activities";
import { TOWN_NPCS, type TownNpc } from "./town-data";
import { residentOpening, townDailyActions, townDialogues, type TownPage } from "./town-dialogue";
import { townChatTopics } from "./town-chat-topics";
import { handedLetters, letterChoice, postUnread, type LetterHandoff, type ResidentStory } from "./resident-story";
import { townResidentLayers, residentPlacement, drawResidentPortrait, townPostboxLayer, type TownAct } from "./town-acting";
import { TownResidentMap } from "./town-resident-map";
import { TownRoutines, residentTownScene } from "./town-routines";
import { prepareTownWork } from "./town-work-art";
import { prepareResidentWalk } from "./resident-walk";
import type { Hotspot, SceneId } from "./maps";
import type { Phase } from "./day";
import { townMapCovers, townOverheadDepth } from "./town-map-covers";
import { prepareMapCovers } from "./map-covers";
import plazaTreeOutlines from "./town-plaza-trees.json";
import { townScene } from "./town-map";
import { drawWishLights, townAttractionLayers } from "./town-attraction-art";
import type { GameId } from "./arcade-engines";
import { townNpcSheet } from "./scene-art";
import { isTownInterior, type TownInteriorId, type TownInteriorKey } from "./town-interior-id";
import { townInteriors, type TownArea } from "./town-interiors";
import { interiorFurniture, paintHallSideSign } from "./town-interior-art";
import { drawPartyProp } from "./party-art";
import { northStreetCanopies } from "./town-north-street-details";
import { workshopCanopies } from "./town-workshop-vegetation";
import { northEastCanopies } from "./town-northeast-foliage";
import { southWestCanopies } from "./town-southwest-foliage";
import { TownPond } from "./town-pond";
import { drawTownCrown, drawTownWeather, windAllowance } from "./scenery-wind";
import {
  southEdgeCanopies, townCanopies,
  festivalProps,
  drawFestivalGarland,
  drawFestivalProp,
} from "./town-scenery";
// The quarry painting replaces part of the original northeast hillside.
const treeCrowns = [
  ...townCanopies.filter(tree => !northEastCanopies.some(t => t.x === tree.x && t.y === tree.y)),
  ...southEdgeCanopies, ...southWestCanopies, ...northEastCanopies, ...workshopCanopies, ...northStreetCanopies,
  // The bookshop ridge and the fence cut across the two south-plaza crowns.
  ...prepareMapCovers(plazaTreeOutlines).map(cover => ({y:cover.depth, cover})),
];
export const TOWN_TALKED_KEY = "fufu-town-talked-v1";
const shiftNotes: Record<TownInteriorKey, Partial<Record<Phase, string>>> = {
  florist: { dawn: "在温室开窗", day: "在东边花阶", dusk: "在压花台" },
  baker: { dawn: "在屋里开炉", day: "在烘焙屋外", dusk: "在屋里收盘" },
  maker: { dawn: "在工坊外", day: "在试光台打样", dusk: "在东侧试灯" },
  post: { dawn: "正在街上送信", day: "在局里分信", dusk: "正在街上收信", night: "在局里封晚邮" },
  books: { dawn: "在书屋外", dusk: "在装帧桌边", night: "在阅读角夜读" },
  radio: { dawn: "在电台收播", dusk: "在溪边听水声", night: "在电台播音" },
  hall: { dawn: "在街上晨拍", day: "在馆里选片", dusk: "在馆里挂照片", night: "在街上拍夜景" },
};
interface StoryHooks {
  story: () => ResidentStory;
  mail: LetterHandoff;
  readPost: (onReturn: () => void) => void;
  save: () => void;
  notify: (text: string) => void;
  keepsakes: () => readonly TownInteriorKey[];
}

export class Town {
  private sprites = townNpcSheet;
  private visited = new Set<string>();
  private time = 0;
  private pond = new TownPond();
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  private street = new TownResidentMap(townScene);
  private interiors = new Map<TownInteriorId, TownResidentMap>();
  private area?: TownArea;
  private get residents() {
    return this.area && this.area !== "town" ? this.interiors.get(this.area)! : this.street;
  }
  private lives = new TownRoutines();
  private placement?: ReturnType<typeof residentPlacement>;
  private act?: TownAct & { npc: TownNpc; after?: TownPage["after"] };
  constructor(
    private world: World,
    private activities: Activities,
    private inventory: Inventory,
    private visitGame: (id: GameId) => void,
    private hooks: StoryHooks,
  ) {
    world.townMap = this.street.scene;
    for (const id of Object.keys(townInteriors) as TownInteriorId[]) {
      const room = new TownResidentMap(townInteriors[id].scene, id);
      this.interiors.set(id, room);
      world.townInteriorMaps.set(id, room.scene);
    }
    this.enterScene(world.scene);
    try {
      const list = JSON.parse(
        localStorage.getItem(TOWN_TALKED_KEY) || "[]",
      );
      if (Array.isArray(list))
        for (const id of list)
          if (TOWN_NPCS.some((n) => n.id === id)) this.visited.add(id);
    } catch {}
    const layers = world.getDepthLayers,
      environment = world.onEnvironment,
      tick = world.onTick;
    world.getDepthLayers = () => [...layers(), ...this.layers()];
    world.onEnvironment = (c, t) => {
      environment(c, t);
      this.drawSigns(c);
    };
    world.onTick = (dt, t) => {
      tick(dt, t);
      if (this.area) {
        this.time = world.ambientTime;
        if (!world.paused) this.updateAct(dt);
        this.lives.tick(world.paused ? 0 : dt,world.currentPhase,world.player,world.visibleArea,
          world.pendingInteractionId,this.act?.npcId,this.reducedMotion.matches,this.area);
        const performer = this.act?.npc;
        this.placement = performer && residentPlacement(performer, world.player, this.act);
        this.residents.update(world.player,performer?.id,this.placement?.foot,this.lives.people);
      }
      world.canvas.parentElement!.toggleAttribute("data-quarry-view",
        world.scene==="town" && world.player.x>1150 && world.player.y<260);
    };
  }
  get talkedIds(): ReadonlySet<string> { return this.visited; }
  doorNote(spot: Hotspot) {
    if (!spot.portal || !isTownInterior(spot.portal)) return;
    const room = townInteriors[spot.portal];
    const resident = TOWN_NPCS.find(npc => npc.id === room.resident)!;
    return resident.name + (shiftNotes[room.key][this.world.currentPhase] ?? "在休息");
  }
  syncShift() {
    this.lives.syncShift(this.world.currentPhase,this.act?.npc.id);
    this.residents.update(this.world.player,this.act?.npc.id,this.placement?.foot,this.lives.people);
  }
  enterScene(scene:SceneId) {
    this.act=undefined;
    this.placement=undefined;
    const area = scene === "town" || isTownInterior(scene) ? scene : undefined;
    if (area && !this.area) this.lives.enter(this.world.currentPhase);
    this.area = area;
    if (area) this.residents.update(this.world.player, undefined, undefined, this.lives.people);
    if (scene === "town") {
      prepareTownWork();
      for (const npc of TOWN_NPCS) {
        if (residentTownScene(npc.id, this.world.currentPhase) === "town") prepareResidentWalk(npc.id);
      }
    } else if (isTownInterior(scene)) prepareResidentWalk(townInteriors[scene].resident);
  }

  reset() {
    this.act = undefined;
    this.visited.clear();
    this.save();
  }
  interact(id: string) {
    if (!this.area || !id.startsWith("npc-")) return false;
    const npc = TOWN_NPCS.find((n) => n.id === id.slice(4));
    if (!npc || !this.residents.scene.spots.some(spot => spot.id === id)) return false;
    // A second tap on the same actor leaves their current page and shift intact.
    if (this.act?.npcId === npc.id && this.activities.dialogueOpen) return true;
    const person=this.lives.people.get(npc.id)!;
    if (residentTownScene(npc.id, this.world.currentPhase) !== this.area) return false;
    if (!this.visited.has(npc.id)) {
      this.visited.add(npc.id);
      this.save();
    }
    const at = {...npc,x:person.x,y:person.y};
    const opening = residentOpening(npc.id, this.hooks.story(), this.inventory.hasBouquet(), this.world.chats.introduced(id));
    if (opening === "daily") this.showDaily(at);
    else this.showPage(at, opening);
    return true;
  }

  private updateAct(dt: number) {
    const act = this.act;
    if (!act) return;
    const anchor = this.residents.anchor(act.npcId);
    if (Math.hypot(this.world.player.x - anchor.x, this.world.player.y - anchor.y) > 72) {
      this.act = undefined;
      return;
    }
    act.elapsed += dt;
    if (act.after && act.elapsed >= act.after.seconds) this.showPage(act.npc, act.after.next);
    else if (act.pageId === "decline" && act.elapsed >= 0.5) this.act = undefined;
  }

  private showDaily(npc: TownNpc) {
    const interior = this.area && this.area !== "town" ? townInteriors[this.area] : undefined;
    const memory = "npc-" + npc.id + (interior ? "-inside" : "");
    const topic = this.world.chats.next(memory, interior?.chat ?? townChatTopics[npc.id], this.world.currentPhase);
    const actions = (townDailyActions[npc.id] ?? []).map(([title, target]) => ({
      title, run: () => this.answer(npc, target),
    }));
    const replies = (topic.replies ?? []).map(([title, text], index) => ({
      title, run: () => {
        const pose = npc.id === "cat" && index === 0 ? "rub" : npc.id === "bunny" && index === 1 ? "hug" : "";
        this.present(npc, pose, { text }, actions);
      },
    }));
    this.present(npc, "", topic, [...replies, ...actions]);
  }

  private showPage(npc: TownNpc, pageId: string) {
    const pages = townDialogues[npc.id], page = pages[pageId];
    const options = page.letter
      ? [letterChoice(this.hooks.mail, page.letter, () => this.showPage(npc, pageId))]
      : (page.choices ?? []).flatMap(([title, target]) => {
        const letter = pages[target]?.letter;
        if (letter && this.hooks.mail.received(letter)) return [];
        return [{ title, run: () => this.answer(npc, target) }];
      });
    this.present(npc, page.pose ?? pageId, page, options);
    if (page.effect) this.applyEffect(page.effect);
    if (!page.letter && !page.after && !page.choices?.some(([, target]) => !target.startsWith("@"))) {
      this.world.chats.introduce("npc-" + npc.id);
    }
  }

  private present(npc: TownNpc, pageId: string, page: TownPage, options: {title: string; run: () => void}[]) {
    const act = { npc, npcId: npc.id, pageId, elapsed: 0, after: page.after };
    this.activities.dialogue(
      page.speaker ?? `${npc.name} · ${npc.role}`,
      page.text,
      options,
      page.speaker ? null : c => drawResidentPortrait(c, npc, this.sprites, pageId),
      this.residents.anchor(npc.id),
      () => { if (this.act === act) this.act = undefined; },
      page.hint,
    );
    this.act = act;
    if (npc.id === "photo-visitor" && pageId === "move") this.world.facing = this.world.facing === 2 ? 1 : 2;
    if (npc.id === "baker" && pageId === "eat") this.world.facing = 0;
    if (npc.id === "xiaoyou" && (pageId === "receive-orange" || pageId === "taste-orange"))
      this.world.facing = 0;
  }

  private answer(npc: TownNpc, target: string) {
    if (!target.startsWith("@")) {
      if (npc.id === "radio-host" && target === "start" && this.hooks.mail.received(handedLetters["radio-host"]))
        target = "radio-again";
      this.showPage(npc, target);
      return;
    }
    this.activities.close();
    switch (target) {
      case "@post": {
        const person = this.lives.people.get("post");
        const area = this.area;
        this.hooks.readPost(() => {
          if (this.area !== area || !person || person.scene !== area ||
              !this.residents.scene.spots.some(spot => spot.id === "npc-post")) return;
          const anchor = this.residents.anchor("post");
          if (person !== this.lives.people.get("post") ||
              this.world.busy || this.world.suspended || this.world.paused || this.activities.active ||
              !this.hooks.story().postDelivered || Math.hypot(this.world.player.x - anchor.x, this.world.player.y - anchor.y) > 72) return;
          this.showPage({...npc, x: person.x, y: person.y}, postUnread(this.hooks.story()) ? "unread" : "read");
        });
        break;
      }
      case "@bag": this.inventory.openWardrobe(); break;
      case "@bouquet": this.inventory.openBouquet(); break;
      case "@game": if (npc.game) this.visitGame(npc.game); break;
      case "@decline": this.act = { npc, npcId: npc.id, pageId: "decline", elapsed: 0 }; break;
    }
  }

  private applyEffect(effect: NonNullable<TownPage["effect"]>) {
    const state = this.hooks.story();
    switch (effect) {
      case "deliver":
        if (state.postDelivered) return;
        state.postDelivered = true;
        this.hooks.save();
        this.hooks.notify("晚安信箱里面好像多了点什么");
        break;
      case "pin":
        this.inventory.grant("anniversaryPin");
        state.welcomeReceived = true;
        this.hooks.save();
        break;
      case "bouquet":
        this.inventory.collectBouquet();
        break;
      case "reserve":
        if (state.cake !== "new") return;
        state.cake = "reserved";
        this.hooks.save();
        break;
      case "taste":
        state.cake = "eaten";
        this.hooks.save();
        break;
    }
  }

  private save() {
    try {
      localStorage.setItem(
        TOWN_TALKED_KEY,
        JSON.stringify([...this.visited]),
      );
    } catch {}
  }
  private layers(): DepthLayer[] {
    const area = this.area;
    if (!area) return [];
    const view = this.world.visibleArea;
    const visible = (x: number, y: number) =>
      x + 64 >= view.x && x - 64 <= view.x + view.w && y + 18 >= view.y && y - 76 <= view.y + view.h;
    const residents = TOWN_NPCS.flatMap(n => {
      const person = this.lives.people.get(n.id)!;
      if (person.scene !== area || person.status === "absent" || !visible(person.x, person.y)) return [];
      const placed = this.act?.npcId === n.id ? this.act.npc : { ...n, x: person.x, y: person.y };
      return townResidentLayers(placed, this.sprites, this.world, this.visited.has(n.id), this.time, this.act,
        this.act?.npcId === n.id ? this.placement : undefined, person, this.hooks.story().welcomeReceived);
    });
    if (area !== "town") {
      const image = this.world.sceneryArtwork;
      return image ? [...interiorFurniture(image, area, this.world.currentPhase, this.hooks.keepsakes(),
        this.world.townInteriorEffect(), this.reducedMotion.matches ? 0 : this.time), ...residents] : residents;
    }
    const props = festivalProps.filter(p => visible(p.x,p.y));
    const propTime = this.reducedMotion.matches ? 0 : this.time;
    const { x, y } = townInteriors["town-hall"].exterior;
    return [
      ...townMapCovers(this.world),
      { y, draw: c => paintHallSideSign(c, x, y) },
      townPostboxLayer,
      ...treeCrowns.map((t) => ({
        y: t.y,
        draw: (c: CanvasRenderingContext2D) => drawTownCrown(c, this.world, t, this.reducedMotion.matches),
      })),
      ...props.map((p) => ({
        y: p.y + 3,
        draw: (c: CanvasRenderingContext2D) =>
          drawFestivalProp(c, p, propTime, (x, y, color) =>
            drawPartyProp(
              c,
              color === "#edca8b"
                ? 1
                : ["#db9cc3", "#e9a2c4"].includes(color)
                  ? 0
                  : 2,
              x - 12,
              y - 16,
              24,
              51,
            ),
          ),
      })),
      ...props.filter(p => p.kind === "garland").map(p => ({
        y: townOverheadDepth,
        draw: (c: CanvasRenderingContext2D) => drawFestivalGarland(c, p, propTime, windAllowance(this.world)),
      })),
      ...townAttractionLayers(this.time, this.reducedMotion.matches),
      ...residents,
    ];
  }
  private drawSigns(c: CanvasRenderingContext2D) {
    if (this.world.scene !== "town") return;
    this.pond.draw(c, this.world.visibleArea, this.time, this.reducedMotion.matches);
    if (!this.reducedMotion.matches) drawTownWeather(c,this.world);
    drawWishLights(c, this.time, this.reducedMotion.matches);
  }
}
