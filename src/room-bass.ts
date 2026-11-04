import { sceneArt } from "./scene-art";
import { bassStand } from "./room-props";
import { duckMusic } from "./sound";
import { BassAudio, type BassMix } from "./bass-audio";
import {
  BassLesson,
  bassScore,
  bassSongTitle,
  bassStrings,
  type BassString,
} from "./bass-score";
import { readingTarget, reservedShortcut } from "./input";
import type { World } from "./world";

export class RoomBass {
  private lesson: BassLesson | null = null;
  private age = 2;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private panel = document.createElement("section");
  private strings: HTMLButtonElement[];
  private cells: HTMLElement[];
  private ringing = -1;
  private ringTimer?: ReturnType<typeof setTimeout>;
  private message = "";
  private voice: BassAudio;
  get active() {
    return this.lesson !== null;
  }
  constructor(
    private world: World,
    private hasPlayed: () => boolean,
    private dedicate: () => void,
    private mix: () => BassMix,
    private toggleVoice: () => void,
  ) {
    this.panel.className = "bass-hud";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "窗边的贝斯演奏");
    this.panel.tabIndex = -1;
    this.panel.innerHTML = `
      <header class="bass-head"><div><p class="bass-kicker">FUFU ♡　/　BASS SESSION 01</p><h3>${bassSongTitle}</h3></div><span class="bass-seal" aria-label="直播一周年">1<span>周年</span></span></header>
      <div class="bass-paper"><div class="bass-score-heading"><b>周年手写谱</b><span class="bass-count"></span></div>
        <ol class="bass-phrase" aria-label="当前乐句">${Array.from({ length: 4 }, () => "<li><strong></strong><span></span></li>").join("")}</ol>
        <p class="bass-bars" aria-label="乐段进度"><i></i><i></i><i></i><i></i><span></span></p></div>
      <div class="bass-fretboard" role="group" aria-label="四根可弹的琴弦">
      ${bassStrings.map((s, i) => `<button type="button" class="bass-string" data-string="${i}" aria-label="${s} 弦，快捷键 ${i + 1}" aria-keyshortcuts="${i + 1}"><kbd>${i + 1}</kbd><b>${s}</b><span class="bass-wire" aria-hidden="true"></span><span class="bass-cue" aria-hidden="true"></span></button>`).join("")}
      </div>
      <p class="bass-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
      <p class="bass-guide">点琴弦，或按 <b>1–4</b> 跟弹。慢慢来，不用抢拍。</p>
      <p class="bass-muted-tip" role="status" hidden></p>
      <div class="bass-actions"><button type="button" class="bass-listen">▷ 听示范</button><button type="button" class="bass-voice"></button><button type="button" class="bass-again">从头弹</button><button type="button" class="bass-leave">收起琴谱 <kbd>Esc</kbd></button></div>`;
    this.voice = new BassAudio(
      this.panel,
      () => this.stopDemo(),
      () => {
        this.stopDemo();
        this.message = "琴声未能播放，请再点一次琴弦或「听示范」。";
        this.render();
      },
    );
    this.panel
      .querySelector(".bass-voice")!
      .addEventListener("click", () => this.toggleVoice());
    world.canvas.parentElement!.insertBefore(
      this.panel,
      world.canvas.nextSibling,
    );
    this.strings = Array.from(
      this.panel.querySelectorAll<HTMLButtonElement>(".bass-string"),
    );
    this.cells = Array.from(
      this.panel.querySelectorAll<HTMLElement>(".bass-phrase li"),
    );
    this.strings.forEach((button, i) =>
      button.addEventListener("click", () => this.play(i as BassString)),
    );
    this.panel
      .querySelector(".bass-listen")!
      .addEventListener("click", () => this.listen());
    this.panel
      .querySelector(".bass-again")!
      .addEventListener("click", () => this.restart());
    this.panel
      .querySelector(".bass-leave")!
      .addEventListener("click", () => this.close());
    window.addEventListener(
      "keydown",
      (e) => {
        if (
          !this.active ||
          world.suspended ||
          reservedShortcut(e) ||
          readingTarget(e.target)
        )
          return;
        const index = ["1", "2", "3", "4"].indexOf(e.key);
        if (index === -1 && e.key !== "Escape") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat) {
          if (e.key === "Escape") this.close();
          else this.play(index as BassString);
        }
      },
      { capture: true },
    );
    const stop = () => {
      this.stopDemo();
      this.voice.stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
    });
    const cancel = world.onInputCancel;
    world.onInputCancel = () => {
      cancel();
      if (world.suspended) stop();
    };
    const layers = world.getDepthLayers,
      tick = world.onTick;
    world.getDepthLayers = () =>
      world.scene === "room"
        ? [...layers(), { y: bassStand.y, draw: (c) => this.draw(c) }]
        : layers();
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.age = world.scene === "room" ? Math.min(2, this.age + dt) : 2;
      if (dt > 0 && this.lesson?.preview != null) {
        const n = this.lesson.advance(this.voice.demoTime);
        if (n) this.ring(n.string);
        if (n !== undefined) this.render();
      }
    };
  }
  open() {
    if (this.active) return;
    const world = this.world;
    world.clearInput();
    world.canvas.removeAttribute("data-pointable");
    world.paused = true;
    world.canvas.parentElement!.classList.add("bass-playing");
    this.panel.hidden = false;
    this.panel.scrollTop = 0;
    this.voice.prepare();
    this.refreshSound();
    duckMusic(true, "bass");
    this.restart();
    this.panel.focus({ preventScroll: true });
  }
  close(focus = true) {
    if (!this.active) return;
    this.lesson = null;
    this.voice.stop();
    this.clearRing();
    this.age = 2;
    this.panel.hidden = true;
    this.world.canvas.parentElement!.classList.remove("bass-playing");
    this.world.paused = false;
    this.world.clearInput();
    duckMusic(false, "bass");
    if (focus && !this.world.suspended)
      this.world.canvas.focus({ preventScroll: true });
  }
  private restart() {
    this.voice.stop();
    this.clearRing();
    this.lesson = new BassLesson();
    this.age = 2;
    this.message = this.hasPlayed()
      ? "已经送给芙芙的曲子，也可以再弹一遍。"
      : "";
    this.render();
  }
  private clearRing() {
    clearTimeout(this.ringTimer);
    this.strings[this.ringing]?.classList.remove("ringing");
    this.ringing = -1;
  }
  private ring(index: BassString) {
    this.clearRing();
    this.ringing = index;
    this.age = 0;
    this.strings[index].classList.add("ringing");
    this.ringTimer = setTimeout(() => this.clearRing(), 300);
  }
  private play(index: BassString) {
    const lesson = this.lesson;
    if (!lesson || this.world.suspended) return;
    const hit = lesson.pluck(index);
    if (!hit) return;
    this.ring(index);
    this.message = "";
    if (hit.finished) this.dedicate();
    else if (!hit.matched && !lesson.complete)
      this.message = "没关系，这个音再试一次。";
    this.voice.note(hit.pitch);
    this.render();
  }
  private listen() {
    if (!this.lesson || this.world.suspended) return;
    if (this.lesson.preview !== null) {
      this.stopDemo();
      return;
    }
    this.message = "";
    this.ring(this.lesson.listen(0).string);
    this.voice.listen();
    this.render();
  }
  private stopDemo() {
    if (!this.lesson || this.lesson.preview === null) return;
    this.lesson.stopListening();
    this.voice.stop();
    this.clearRing();
    this.render();
  }
  refreshSound() {
    const mix = this.mix();
    this.voice.setMix(mix);
    const button = this.panel.querySelector<HTMLButtonElement>(".bass-voice")!;
    const audible = mix.enabled && mix.volume > 0;
    const hint = this.panel.querySelector<HTMLElement>(".bass-muted-tip")!;
    hint.hidden = audible;
    hint.textContent = audible ? "" : mix.volume === 0
      ? "总音量为零，点「恢复总音量」就能听见琴声。"
      : "琴声已关闭。点「开启琴声」后，可以再拨一次。";
    button.textContent =
      mix.volume === 0 ? "恢复总音量" : audible ? "琴声已开" : "开启琴声";
    button.setAttribute("aria-pressed", String(audible));
    button.title =
      mix.volume === 0
        ? "将总音量恢复到 45%，并开启琴声"
        : audible
          ? "关闭琴声"
          : "开启琴声";
  }
  private render() {
    const l = this.lesson;
    if (!l) return;
    const demo = l.preview !== null,
      done = !demo && l.complete,
      index = l.shown,
      bar = Math.floor(index / 4),
      next = bassScore[index];
    this.panel.dataset.mode = demo ? "demo" : done ? "complete" : "practice";
    this.panel.querySelector(".bass-count")!.textContent =
      `已弹 ${l.played} / ${bassScore.length}`;
    this.cells.forEach((cell, i) => {
      const at = bar * 4 + i,
        n = bassScore[at],
        current = at === index && !done;
      cell.querySelector("strong")!.textContent = n.word;
      cell.querySelector("span")!.textContent =
        `${n.string + 1} · ${bassStrings[n.string]}`;
      cell.classList.toggle("past", done || at < index);
      cell.classList.toggle("current", current);
      if (current) cell.setAttribute("aria-current", "step");
      else cell.removeAttribute("aria-current");
    });
    this.panel
      .querySelectorAll(".bass-bars i")
      .forEach((el, i) => el.classList.toggle("ink", i <= bar));
    this.panel.querySelector(".bass-bars span")!.textContent =
      `第 ${bar + 1} / 4 乐句`;
    this.strings.forEach((el, i) => {
      const here = !done && next.string === i;
      el.classList.toggle("expected", here);
      el.setAttribute("aria-disabled", String(demo));
      el.querySelector(".bass-cue")!.textContent = here
        ? demo
          ? "示范中"
          : "拨这根"
        : "";
    });
    const cue = done
      ? "芙芙，一周年快乐。下一个晚安，也一起。♡"
      : demo
        ? `示范 ·「${next.word}」　${bassStrings[next.string]} 弦`
        : [
            this.message,
            `「${next.word}」　${bassStrings[next.string]} 弦 · 按 ${next.string + 1}`,
          ]
            .filter(Boolean)
            .join(" ");
    this.panel.querySelector(".bass-feedback")!.textContent = cue;
    this.panel.querySelector(".bass-guide")!.innerHTML = done
      ? "这首周年小曲已记在本机。可以自由拨弦，也可以再弹一遍。"
      : "点琴弦，或按 <b>1–4</b> 跟弹。慢慢来，不用抢拍。";
    const listen = this.panel.querySelector<HTMLButtonElement>(".bass-listen")!;
    listen.textContent = demo ? "■ 停止示范" : "▷ 听示范";
    listen.setAttribute("aria-pressed", String(demo));
    this.panel.querySelector<HTMLButtonElement>(".bass-again")!.textContent =
      done ? "再弹一次" : "从头弹";
  }
  private draw(c: CanvasRenderingContext2D) {
    const image = sceneArt.bass;
    if (!image.naturalWidth) return;
    const { x, y, height } = bassStand,
      w = (height * image.naturalWidth) / image.naturalHeight;
    c.save();
    c.translate(x, y);
    c.fillStyle = "#68514645";
    c.beginPath();
    c.ellipse(1, -1, w * 0.58, 2.8, 0, 0, Math.PI * 2);
    c.fill();
    c.drawImage(image, -w / 2, -height, w, height);
    if (this.age < 1.25) {
      const t = this.age / 1.25,
        lift = this.reduced.matches ? 0 : t * 7;
      c.globalAlpha = Math.min(1, (1 - t) * 2);
      c.fillStyle = "#77516b";
      c.beginPath();
      c.ellipse(-10, -32 - lift, 2, 1.4, -0.25, 0, Math.PI * 2);
      c.fill();
      c.fillRect(-8.8, -39 - lift, 1, 7);
      c.fillRect(-8.2, -39 - lift, 3, 1.5);
    }
    c.restore();
  }
}
