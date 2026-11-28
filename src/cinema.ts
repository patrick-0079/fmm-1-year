import type { World } from "./world";
import type { GardenTape } from "./core";
import { gardenFilm, gardenScreen, televisionSilhouette } from "./cinema-config";
import { anniversaryPoster } from "./cinema-poster";
import { drawGardenScreen } from "./cinema-screen";
import { CinemaSession, mediaTime, containVideo, gardenScreeningHint } from "./cinema-state";
import { setCinemaMuted } from "./sound";
import { FilmPreloader, downloadLabel, filmDownloadAmount } from "./film-preloader";
import { traffic } from "./network-debug";
import { reservedShortcut, readingTarget } from "./input";
import { revealGame } from "./game-viewport";

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
  private preparing = false;
  private resourcesReady = false;
  private resourcesFailed = false;
  constructor(
    private world: World,
    private toast: (text: string) => void,
    private prepareResources: () => Promise<void>,
    private getTape: () => GardenTape,
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
      if (this.active && (world.scene !== "garden" || this.getTape() !== "inserted")) this.close();
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
    this.player.innerHTML = `<div class="cinema-player-tools"><span></span><button class="cinema-shrink">返回地图内观看</button><button class="cinema-exit">离开放映</button></div><div class="cinema-player-feedback"><p class="cinema-player-loading" role="status"></p></div>`;
    this.player.querySelector("span")!.textContent = gardenFilm.title;
    for (const label of [this.hud.querySelector(".cinema-progress")!, this.player.querySelector(".cinema-player-loading")!]) {
      const meter = document.createElement("progress");
      meter.className = "cinema-download-meter";
      meter.setAttribute("aria-label", "周年视频下载进度");
      meter.hidden = true;
      label.after(meter);
    }
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
    const filmRate = traffic?.film;
    if (filmRate) this.download.onBytes = bytes => filmRate.add(bytes, performance.now());
    window.addEventListener("online", () => this.prepare());
    this.render();
  }
  prepare() {
    if (this.preparing || this.resourcesReady) return;
    this.preparing = true;
    this.resourcesFailed = false;
    this.session.retry();
    void this.prepareResources().then(() => {
      this.resourcesReady = true;
      this.ensureVideo();
      this.preload();
    }, () => {
      this.resourcesFailed = true;
      this.session.fail();
    }).finally(() => { this.preparing = false; this.render(); });
  }
  get active() {
    return this.session.active;
  }
  open() {
    if (this.world.scene !== "garden" || !this.session.open(this.getTape())) return;
    this.ensureVideo();
    this.prepare();
    if (this.video!.readyState >= 3) this.session.ready();
    this.hud.hidden = false;
    this.world.onAchievementEvent("cinema-opened");
    this.lastStage = "";
    this.world.standUp();
    this.world.clearInput();
    const phone = window.matchMedia("(max-width: 540px)").matches;
    this.world.setFocus({ x: 711, y: phone ? 231 : 250 }, phone ? 4 : 2.7);
    this.world.paused = true;
    this.world.canvas.parentElement!.classList.add("cinema-active");
    this.render();
    this.world.canvas.focus({ preventScroll: true });
    revealGame(this.world.canvas);
  }
  close() {
    if (!this.active) return;
    this.shrink();
    this.session.leave();
    this.video?.pause();
    this.render();
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
    this.refreshTapeHint();
    this.notified = false;
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
      if (!this.active && !this.notified && this.getTape() === "inserted") {
        this.toast("花园大屏准备好啦，随时回来按播放继续看 ♡");
        this.notified = true;
      }
      update();
      if (this.active && this.session.wanted && v.paused) this.play();
    });
    v.addEventListener("play", () => {
      if (this.active && this.expanded && !this.session.wanted)
        this.session.request();
      if (!this.active || !this.session.wanted || this.getTape() !== "inserted") v.pause();
    });
    v.addEventListener("playing", () => {
      if (this.getTape() !== "inserted" || !this.session.playing()) {
        v.pause();
        return;
      }
      this.world.onAchievementEvent("cinema-opened");
      this.slow = false;
      update();
    });
    v.addEventListener("pause", () => {
      this.session.pause();
      update();
    });
    v.addEventListener("waiting", () => {
      if (v.paused || v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
      this.session.waiting();
      update();
    });
    v.addEventListener("stalled", () => {
      this.slow = true;
      update();
    });
    v.addEventListener("ended", () => {
      this.session.end();
      update();
    });
    v.addEventListener("error", () => {
      if (!v.error) return;
      if (v.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED && this.useStreamFallback(v)) return;
      this.session.fail();
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
  private useStreamFallback(video: HTMLVideoElement) {
    if (!video.src.startsWith("blob:")) return false;
    URL.revokeObjectURL(video.src);
    video.crossOrigin = "anonymous";
    video.src = gardenFilm.src;
    return true;
  }
  private preload(replaceUnplayable = false) {
    void this.download
      .start(replaceUnplayable)
      .then((url) => {
        const video = this.video!;
        const previous = video.src;
        video.src = url;
        video.load();
        if (previous.startsWith("blob:") && previous !== url) URL.revokeObjectURL(previous);
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
    if (this.expanded) this.video!.focus({ preventScroll: true });
  }
  private shrink() {
    if (!this.expanded) return;
    this.expanded = false;
    if (document.fullscreenElement === this.player)
      void document.exitFullscreen().catch(() => {});
    this.player.hidden = true;
    this.video!.controls = false;
    this.render();
    this.world.canvas.focus({ preventScroll: true });
  }
  private toggle() {
    if (this.session.stage === "error") {
      this.retry();
      this.play();
      return;
    }
    if (this.session.wanted || this.session.stage === "playing") {
      this.video?.pause();
      this.session.pause();
      this.render();
    } else this.play();
  }
  private play() {
    const v = this.video;
    if (!v || this.getTape() !== "inserted" || !this.session.request()) return;
    if (this.download.progress.state !== "ready" || !v.src) {
      this.render();
      return;
    }
    if (v.ended) v.currentTime = 0;
    this.render();
    const source = v.src;
    void v.play().catch((error: unknown) => {
      if (v.src !== source || !this.active || !this.session.wanted) return;
      if (error instanceof DOMException && error.name === "NotSupportedError") {
        if (this.useStreamFallback(v)) return;
        this.session.fail();
      } else this.session.pause();
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
    if (!this.resourcesReady) { this.prepare(); return; }
    this.slow = false;
    this.notified = false;
    if (this.video.error) this.preload(true);
    else if (this.download.progress.state === "error") this.preload();
    else this.video.load();
    this.render();
  }
  private get downloadStatus() {
    return this.resourcesFailed ? "游戏资源未载齐，进入放映可重试" : downloadLabel(this.download.progress);
  }
  refreshTapeHint() {
    const shortcut = document.querySelector(".cinema-shortcut small");
    if (!shortcut) return;
    const tape = this.getTape();
    shortcut.textContent = gardenScreeningHint[tape] + (tape === "inserted" ? " · " + this.downloadStatus : "");
  }
  private render() {
    setCinemaMuted(this.active && (this.expanded || this.session.wanted));
    if (traffic) traffic.filmStatus = this.download.progress.source ? "使用本机缓存" : this.resourcesFailed ? "等待资源重试" :
      ({ queued: "等待游戏资源", checking: "核对本机版本", loading: "下载中", ready: "已完成", error: "下载失败" })[this.download.progress.state];
    this.refreshTapeHint();
    if (!this.active) return;
    const progress = this.downloadStatus;
    const v = this.video,
      s = this.session.displayStage();
    const messages: Record<typeof s, string> = {
      idle: "正在准备花园大屏…",
      loading: "放映机正在加载周年录像，可以先去花园逛逛，稍后回来再看。",
      ready:
        "画面准备好了 · 按播放开始观看。离开后再回来，缓冲和观看位置都会保留。",
      starting: "即将播放…",
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
    const download = this.download.progress, downloading = download.state === "loading";
    this.hud.querySelector(".cinema-progress")!.textContent = downloading
      ? "下载 " + filmDownloadAmount(download) : `观看 ${time} / ${duration} · ${progress}`;
    const loading = this.player.querySelector<HTMLElement>(
      ".cinema-player-loading",
    )!;
    loading.hidden = download.state === "ready" && !!v?.readyState && s !== "error";
    loading.textContent = s === "error" ? "视频加载失败，可返回地图重试" :
      downloading ? "正在下载 · " + filmDownloadAmount(download) :
      download.state === "ready" ? "下载完成，正在准备画面…" : progress;
    for (const surface of [this.hud, this.player]) {
      const meter = surface.querySelector<HTMLProgressElement>(".cinema-download-meter")!;
      meter.hidden = !downloading;
      if (downloading && download.total) { meter.max = download.total; meter.value = download.received; }
      else meter.removeAttribute("value");
    }
    const button = this.hud.querySelector<HTMLButtonElement>(".cinema-play")!;
    const playLabels: Record<typeof s, string> = {
      idle: "播放", loading: this.session.wanted ? "取消等待" : "加载并播放",
      ready: "播放", starting: "取消等待", playing: "暂停", paused: "继续播放",
      buffering: "取消等待", ended: "再看一遍", error: "播放",
    };
    button.textContent = playLabels[s];
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
    if (this.getTape() !== "inserted") {
      const poster = anniversaryPoster();
      drawGardenScreen(c, ctx => ctx.drawImage(poster, 0, 0, gardenScreen.w, gardenScreen.h));
      return;
    }
    const box = gardenScreen,
      v = this.video,
      s = this.session.displayStage();
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
      const download = this.download.progress;
      const downloading = download.state === "loading";
      if (!v || loading || downloading || s === "error") {
        if (v && this.session.hasFrame) c.fillStyle = "#25263ddd";
        else c.fillStyle = "#25263d";
        c.fillRect(box.x, box.y, box.w, box.h);
        c.textAlign = "center";
        c.fillStyle = "#f8dfb0";
        c.font = '7px "Microsoft YaHei","PingFang SC",sans-serif';
        c.fillText(
          s === "error" ? "画面还在路上" : s === "buffering" ? "正在缓冲播放画面…" : "正在加载周年录像…",
          box.x + box.w / 2,
          box.y + 21,
        );
        c.font = '5px "Microsoft YaHei","PingFang SC",sans-serif';
        c.fillStyle = "#d6c4df";
        c.fillText(
          s === "error"
            ? "按互动重试 · 或稍后回来"
            : downloading ? filmDownloadAmount(download) : download.state === "queued" ? "资源就绪后开始下载" : v
              ? "可以先去逛逛，回来再看"
              : "走近大屏，按 E / 右键",
          box.x + box.w / 2,
          box.y + 34,
        );
        if (downloading && download.total) {
          const left = box.x + 13, width = box.w - 26;
          c.fillStyle = "#756482"; c.fillRect(left, box.y + 39, width, 3);
          c.fillStyle = "#efbed2"; c.fillRect(left, box.y + 39, Math.min(1, download.received / download.total) * width, 3);
        } else if (loading)
          for (let i = 0; i < 5; i++) {
            c.fillStyle =
              i === Math.floor(this.time * 4) % 5 ? "#ffd489" : "#8e7eae";
            c.fillRect(box.x + box.w / 2 - 11 + i * 5, box.y + 40, 3, 2);
          }
      }
    });
  }
}
