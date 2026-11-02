import { arcadeBackdrop, booths, postcard } from "../src/arcade-art";
import { createEngine, FlightGame, type GameId } from "../src/arcade-engines";
import { ARCADES } from "../src/town-data";
import { createLullaby, eighthLength, lullabyPulses } from "../src/lullaby";

for (const id of Object.keys(ARCADES) as GameId[]) {
  const figure = document.createElement("figure"), canvas = document.createElement("canvas");
  const caption = document.createElement("figcaption");
  canvas.width = 480; canvas.height = 320; canvas.setAttribute("aria-label", ARCADES[id].title);
  caption.textContent = booths[id].number + "  " + ARCADES[id].title;
  figure.append(canvas,caption); document.querySelector("main")!.append(figure);
  const c = canvas.getContext("2d")!, engine = createEngine(id);
  const backdrop = arcadeBackdrop(id);
  await Promise.all([backdrop.background.decode(), backdrop.props.decode()]);
  c.scale(2,2); c.imageSmoothingEnabled = false;
  engine.start();
  if (id === "blocks") { engine.input("left", true); engine.input("drop", true); }
  if (id === "link") engine.hint?.();
  if (id === "mines") engine.pointer?.(87,80);
  if (id === "hop") { engine.input("primary",true); engine.update(.6); engine.input("primary",false); engine.update(.16); }
  if (id === "miner") { engine.update(.7); engine.input("primary",true); engine.update(.71); }
  if (engine instanceof FlightGame) {
    for (let i = 0; i < 360; i++) {
      const gate = engine.gates.find(gate => !gate.passed);
      if (engine.y > (gate?.center ?? 80) && engine.vy > 0) engine.input("primary",true);
      engine.update(1/120);
    }
  }
  engine.draw(c,backdrop);
}
const card = document.createElement("figure");
const picture = new Image(); picture.src = postcard; picture.alt = "芙芙的一周年纪念照";
const caption = document.createElement("figcaption"); caption.textContent = "游园券 · 周年纪念照";
card.append(picture,caption); document.querySelector("main")!.append(card);

function wav(buffer: AudioBuffer) {
  const frames = buffer.length, bytes = new ArrayBuffer(44 + frames * 4), view = new DataView(bytes);
  function signature(offset: number, name: string) {
    for (let i = 0; i < name.length; i++) view.setUint8(offset + i, name.charCodeAt(i));
  }
  signature(0,"RIFF"); view.setUint32(4,36+frames*4,true); signature(8,"WAVE"); signature(12,"fmt ");
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,2,true);
  view.setUint32(24,buffer.sampleRate,true); view.setUint32(28,buffer.sampleRate*4,true);
  view.setUint16(32,4,true); view.setUint16(34,16,true); signature(36,"data"); view.setUint32(40,frames*4,true);
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  let peak = 0, difference = 0;
  for (let i = 0; i < frames; i++) {
    peak = Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
    difference += Math.abs(left[i]-right[i]);
    view.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,left[i]))*32767),true);
    view.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,right[i]))*32767),true);
  }
  if (!Number.isFinite(peak) || peak < .01 || peak >= 1 || difference/frames < .0001)
    throw new Error("请检查左右声道和音量峰值");
  return { blob: new Blob([bytes],{type:"audio/wav"}), peak };
}
const controls = document.querySelectorAll<HTMLButtonElement>("button[data-scene]");
let previousUrl: string | undefined;
for (const button of controls) button.addEventListener("click", async () => {
  const status = document.querySelector("output")!;
  controls.forEach(b => b.disabled = true);
  try {
    const scene = button.dataset.scene as "room" | "town", rate = 32000, beat = eighthLength(scene);
    const ctx = new OfflineAudioContext(2, Math.ceil((lullabyPulses*beat+2)*rate), rate);
    const mix = ctx.createGain(); mix.gain.value = .9; mix.connect(ctx.destination);
    const play = createLullaby(ctx,mix);
    for (let pulse = 0; pulse < lullabyPulses; pulse++) play(pulse,.05+pulse*beat,scene);
    const audio = await ctx.startRendering(), result = wav(audio);
    const player = document.querySelector("audio")!, link = document.querySelector("a")!;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    previousUrl = URL.createObjectURL(result.blob);
    player.src = previousUrl; player.hidden = false; link.href = previousUrl; link.hidden = false;
    status.textContent = `${scene === "room" ? "小屋" : "小镇"}版就绪 · ${audio.duration.toFixed(1)} 秒 · 立体声 · 峰值 ${(20*Math.log10(result.peak)).toFixed(1)} dBFS`;
  } catch (error) { status.textContent = String(error); }
  finally { controls.forEach(b => b.disabled = false); }
});
