import type { World } from "./world";
import { gardenFilm, gardenScreen, televisionSilhouette } from "./cinema-config";
import { drawGardenScreen } from "./cinema-screen";
import { CinemaSession, mediaTime, containVideo } from "./cinema-state";
import { duckMusic } from "./sound";
import { FilmPreloader, downloadLabel } from "./film-preloader";
import { reservedShortcut, readingTarget } from "./input";

export class GardenCinema {
  private session = new CinemaSession();
  private video: HTMLVideoElement | null = null;
  private hud = document.querySelector<HTMLElement>(".cinema-hud")!;
  private lastStage = "";
  private lastUi = 0;
  private time = 0;
  private slow = false;
  private notified = false;
  private download = new FilmPreloader(gardenFilm.src, () => this.render());
  private player = document.createElement("section");
  private expanded = false;
  constructor(
    private world: World,
    private toast: (text: string) => void,
  ) {
    const layers = world.getDepthLayers,
      tick = world.onTick,
      action = world.onAction,
      pointer = world.onPointer;
    const cancel = world.onInputCancel;
    world.onInputCancel = () => {
      cancel();
      if (world.suspended && this.active) {
        this.video?.pause();
        this.session.pause();
        duckMusic(false);
        this.render();
      }
    };
    world.getDepthLayers = () => world.scene !== "garden" ? layers() : [
      ...layers(),
      { y: 273, draw: (c) => {
        c.save();
        const feet = world.player;
        if (!this.active && feet.x > 635 && feet.x < 792 && feet.y > 169 && feet.y < 273)
          c.globalAlpha *= 0.64;
        world.drawMapFragment(c, televisionSilhouette);
        this.draw(c);
        c.restore();
      } },
    ];
    world.onTick = (dt, t) => {
      tick(dt, t);
      this.time = t;
      if (this.active && world.scene !== "garden") this.close();
      if (t - this.lastUi > 0.4) {
        this.lastUi = t;
        this.render();
      }
    };
    world.onAction = (pressed) => {
      if (!this.active) return action(pressed);
      if (pressed) this.toggle();
      return true;
    };
    world.onPointer = (type, p, pointerType) => {
      if (!this.active) return pointer(type, p, pointerType);
      if (type === "down") this.toggle();
      return true;
    };
    window.addEventListener(
      "keydown",
      (e) => {
        if (!this.active || this.world.suspended || reservedShortcut(e) || readingTarget(e.target)) return;
        if (e.key.toLowerCase() === "f" && !e.repeat) {
          e.preventDefault();
          e.stopPropagation();
          void this.fullscreen();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (this.expanded) this.shrink();
          else this.close();
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          this.seek(e.key === "ArrowLeft" ? -10 : 10);
        }
      },
      { capture: true },
    );
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.active) {
        this.video?.pause();
        this.session.pause();
        duckMusic(false);
        this.render();
      }
    });
    this.hud.innerHTML = `<div class="cinema-heading"><div><small>FUFU’S GARDEN CINEMA</small><strong></strong></div><button class="map-action cinema-leave">离开，先去逛逛 ×</button></div><p class="cinema-status" role="status" aria-live="polite"></p><p class="cinema-progress" aria-live="off"></p><div class="cinema-actions"><button class="map-action cinema-play">播放</button><button class="map-action cinema-back">−10 秒</button><button class="map-action cinema-forward">＋10 秒</button><button class="map-action cinema-restart">从头播放</button><button class="map-action cinema-mute">静音</button><button class="map-action cinema-retry" hidden>重新加载</button></div>`;
    this.hud.querySelector("strong")!.textContent = gardenFilm.title;
    const fullscreen = document.createElement("button");
    fullscreen.className = "map-action cinema-fullscreen";
    fullscreen.textContent = "全屏观看 F";
    fullscreen.addEventListener("click", () => void this.fullscreen());
    this.hud.querySelector(".cinema-actions")!.append(fullscreen);
    const hint = document.createElement("p");
    hint.className = "cinema-controls-hint";
    hint.textContent =
      "E / 空格 / 右键：播放暂停　← →：跳转　F：全屏　Esc：返回";
    this.hud.append(hint);
    this.hud
      .querySelector(".cinema-leave")!
      .addEventListener("click", () => this.close());
    this.hud
      .querySelector(".cinema-play")!
      .addEventListener("click", () => this.toggle());
    this.hud
      .querySelector(".cinema-back")!
      .addEventListener("click", () => this.seek(-10));
    this.hud
      .querySelector(".cinema-forward")!
      .addEventListener("click", () => this.seek(10));
    this.hud.querySelector(".cinema-restart")!.addEventListener("click", () => {
      if (this.video && this.video.readyState >= 1) {
        this.video.currentTime = 0;
        this.play();
      }
    });
    this.hud.querySelector(".cinema-mute")!.addEventListener("click", () => {
      if (this.video) this.video.muted = !this.video.muted;
      this.render();
    });
    this.hud
      .querySelector(".cinema-retry")!
      .addEventListener("click", () => this.retry());
    this.player.className = "cinema-player";
    this.player.hidden = true;
    this.player.setAttribute("aria-label", "周年视频全屏播放器");
    this.player.innerHTML = `<div class="cinema-player-tools"><span></span><button class="cinema-shrink">返回地图内观看</button><button class="cinema-exit">离开放映</button></div><p class="cinema-player-loading" role="status"></p>`;
    this.player.querySelector("span")!.textContent = gardenFilm.title;
    this.player
      .querySelector(".cinema-shrink")!
      .addEventListener("click", () => this.shrink());
    this.player
      .querySelector(".cinema-exit")!
      .addEventListener("click", () => this.close());
    document.querySelector(".game-window")!.append(this.player);
    document.addEventListener("fullscreenchange", () => {
      if (this.expanded && !document.fullscreenElement) this.shrink();
    });
    this.ensureVideo();
    this.preload(); // Start at page mount, before entering the game or TV.
  }
  get active() {
    return this.session.active;
  }
  open() {
    if (this.world.scene !== "garden") return;
    this.session.open();
    this.ensureVideo();
    if (this.video!.readyState >= 3) this.session.ready();
    this.hud.hidden = false;
    this.lastStage = "";
    this.world.standUp();
    this.world.clearInput();
    const phone = window.matchMedia("(max-width: 540px)").matches;
    this.world.setFocus({ x: 711, y: phone ? 231 : 250 }, phone ? 4 : 2.7);
    this.world.paused = true;
    this.world.canvas.parentElement!.classList.add("cinema-active");
    this.render();
    this.world.canvas.focus({ preventScroll: true });
    this.world.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  close() {
    if (!this.active) return;
    this.shrink();
    this.session.leave();
    this.video?.pause();
    duckMusic(false);
    this.hud.hidden = true;
    this.world.canvas.parentElement!.classList.remove("cinema-active");
    this.world.setFocus(null);
    this.world.paused = false;
    this.world.clearInput();
    this.world.canvas.focus({ preventScroll: true });
    // Keep the same fully downloaded Blob and playback position.
  }
  reset() {
    this.close();
    if (this.video?.readyState) {
      this.video.currentTime = 0;
      this.session.pause();
    }
  }
  private ensureVideo() {
    if (this.video) return;
    const v = document.createElement("video");
    this.video = v;
    v.dataset.gardenVideo = "true";
    v.tabIndex = -1;
    v.playsInline = true;
    v.preload = "auto";
    v.volume = 0.65;
    const update = () => this.render();
    v.addEventListener("loadeddata", () => {
      this.session.hasFrame = true;
      update();
    });
    v.addEventListener("canplay", () => {
      this.session.ready();
      this.slow = false;
      if (!this.active && !this.notified) {
        this.toast("花园小电视准备好啦，随时回来按播放继续看 ♡");
        this.notified = true;
      }
      update();
      if (this.active && this.session.wanted && v.paused) this.play();
    });
    v.addEventListener("play", () => {
      if (this.active && this.expanded && !this.session.wanted)
        this.session.request();
      if (!this.active || !this.session.wanted) v.pause();
    });
    v.addEventListener("playing", () => {
      if (!this.session.playing()) {
        v.pause();
        return;
      }
      this.slow = false;
      duckMusic(true);
      update();
    });
    v.addEventListener("pause", () => {
      this.session.pause();
      duckMusic(false);
      update();
    });
    v.addEventListener("waiting", () => {
      this.session.waiting();
      duckMusic(false);
      update();
    });
    v.addEventListener("stalled", () => {
      this.slow = true;
      update();
    });
    v.addEventListener("ended", () => {
      this.session.end();
      duckMusic(false);
      update();
    });
    v.addEventListener("error", () => {
      this.session.fail();
      duckMusic(false);
      update();
    });
    for (const event of [
      "loadedmetadata",
      "progress",
      "timeupdate",
      "durationchange",
      "seeked",
    ])
      v.addEventListener(event, update);
    this.player.prepend(v);
  }
  private preload() {
    this.session.retry();
    void this.download
      .start()
      .then((url) => {
        this.video!.src = url;
        this.video!.load();
      })
      .catch(() => {
        this.session.fail();
        this.render();
      });
  }
  private async fullscreen() {
    if (!this.active) return;
    if (this.expanded) return this.shrink();
    this.expanded = true;
    this.player.hidden = false;
    this.video!.controls = true;
    this.render();
    // CSS provides the same full-window player when native fullscreen is absent.
    try {
      await this.player.requestFullscreen?.();
    } catch {
      /* Full-window fallback. */
    }
  }
  private shrink() {
    if (!this.expanded) return;
    this.expanded = false;
    if (document.fullscreenElement === this.player)
      void document.exitFullscreen().catch(() => {});
    this.player.hidden = true;
    this.video!.controls = false;
    this.world.canvas.focus({ preventScroll: true });
  }
  private toggle() {
    if (this.session.wanted || this.session.stage === "playing") {
      this.video?.pause();
      this.session.pause();
      duckMusic(false);
      this.render();
    } else this.play();
  }
  private play() {
    const v = this.video;
    if (!v || !this.session.request()) return;
    if (this.download.progress.state !== "ready" || !v.src) {
      this.render();
      return;
    }
    if (v.ended) v.currentTime = 0;
    this.render();
    void v.play().catch((error: unknown) => {
      if (!this.active || !this.session.wanted) return;
      if (error instanceof DOMException && error.name === "NotSupportedError")
        this.session.fail();
      else this.session.pause();
      duckMusic(false);
      this.render();
    });
  }
  private seek(seconds: number) {
    const v = this.video;
    if (!v || v.readyState < 1 || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
    this.render();
  }
  private retry() {
    if (!this.video) return;
    this.session.retry();
    this.slow = false;
    this.notified = false;
    if (this.download.progress.state === "error") this.preload();
    else this.video.load();
    this.render();
  }
  private render() {
    const progress = downloadLabel(this.download.progress);
    const shortcut = document.querySelector(".cinema-shortcut small");
    if (shortcut) shortcut.textContent = progress;
    if (!this.active) return;
    const v = this.video,
      s = this.session.stage;
    const messages: Record<typeof s, string> = {
      idle: "正在准备花园小电视…",
      loading: "LOADING… 周年视频正在加载，可以先离开逛逛，稍后回来再看。",
      ready:
        "画面准备好了 · 按播放开始观看。离开后再回来，缓冲和观看位置都会保留。",
      playing: "正在播放 · 离开时会暂停，回来继续看。",
      paused: "已暂停 · 已保留观看位置，按播放继续。",
      buffering: "LOADING… 正在缓冲下一段画面，也可以先去花园逛逛。",
      ended: "这一段晚安已经放完啦 · 可以从头再看。",
      error: "视频暂时没能加载成功 · 可以重新加载，或先离开稍后再来。",
    };
    const key = s + this.slow;
    if (key !== this.lastStage) {
      this.lastStage = key;
      this.hud.querySelector(".cinema-status")!.textContent =
        this.slow && (s === "loading" || s === "buffering")
          ? "网络有点慢，仍在准备画面 · 可以先离开，稍后再回来。"
          : messages[s];
    }
    const time = v ? mediaTime(v.currentTime) : "00:00",
      duration = v ? mediaTime(v.duration) : "--:--";
    this.hud.querySelector(".cinema-progress")!.textContent =
      `观看 ${time} / ${duration} · ${progress}`;
    const loading = this.player.querySelector<HTMLElement>(
      ".cinema-player-loading",
    )!;
    loading.hidden =
      this.download.progress.state === "ready" && !!v?.readyState;
    loading.textContent = progress + " · 可以先返回花园，稍后回来观看";
    const button = this.hud.querySelector<HTMLButtonElement>(".cinema-play")!;
    button.textContent = this.session.wanted
      ? "暂停 / 取消等待"
      : s === "ended"
        ? "再看一遍"
        : s === "loading"
          ? "加载并播放"
          : "播放 / 继续";
    button.disabled = s === "error";
    for (const selector of [
      ".cinema-back",
      ".cinema-forward",
      ".cinema-restart",
    ])
      this.hud.querySelector<HTMLButtonElement>(selector)!.disabled =
        !v || v.readyState < 1 || s === "error";
    this.hud.querySelector<HTMLButtonElement>(".cinema-retry")!.hidden =
      s !== "error";
    const mute = this.hud.querySelector<HTMLButtonElement>(".cinema-mute")!;
    mute.textContent = v?.muted ? "开启视频声音" : "静音";
    mute.setAttribute("aria-pressed", String(v?.muted ?? false));
    this.hud.dataset.stage = s;
  }
  private draw(c: CanvasRenderingContext2D) {
    if (this.world.scene !== "garden") return;
    const box = gardenScreen,
      v = this.video,
      s = this.session.stage;
    drawGardenScreen(c, (c) => {
      c.fillStyle = "#25263d";
      c.fillRect(box.x, box.y, box.w, box.h);
      if (v && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
        const b = containVideo(v.videoWidth, v.videoHeight, box);
        c.imageSmoothingEnabled = true;
        try {
          c.drawImage(v, b.x, b.y, b.w, b.h);
        } catch {
          /* A seeking frame may briefly be unavailable. */
        }
      }
      const loading = s === "loading" || s === "buffering";
      if (!v || loading || s === "error") {
        if (v && this.session.hasFrame) c.fillStyle = "#25263ddd";
        else c.fillStyle = "#25263d";
        c.fillRect(box.x, box.y, box.w, box.h);
        c.textAlign = "center";
        c.fillStyle = "#f8dfb0";
        c.font = '7px "Microsoft YaHei","PingFang SC",sans-serif';
        c.fillText(
          s === "error" ? "画面还在路上" : v ? "LOADING…" : "芙芙 · 一周年放映",
          box.x + box.w / 2,
          box.y + 21,
        );
        c.font = '5px "Microsoft YaHei","PingFang SC",sans-serif';
        c.fillStyle = "#d6c4df";
        c.fillText(
          s === "error"
            ? "按互动重试 · 或稍后回来"
            : v
              ? "可以先去逛逛，回来再看"
              : "走近小电视，按 E / 右键",
          box.x + box.w / 2,
          box.y + 34,
        );
        if (loading)
          for (let i = 0; i < 5; i++) {
            c.fillStyle =
              i === Math.floor(this.time * 4) % 5 ? "#ffd489" : "#8e7eae";
            c.fillRect(box.x + box.w / 2 - 11 + i * 5, box.y + 40, 3, 2);
          }
      }
    });
  }
}
