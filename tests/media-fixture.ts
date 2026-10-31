import "../src/style.css";
import { collections } from "../src/content";
import { Modal } from "../src/modal";
import { openCollection } from "../src/media";
import room from "../src/assets/room.webp";

const modal = new Modal();
const temporaryUrls: string[] = [];
collections.letters.items = [
  {
    id: "test-letter",
    title: "测试留言",
    author: "<测试署名>",
    text: "测试正文，应该显示为普通文本：<script>不会执行</script>\n第二行。",
  },
  { id: "test-long", title: "长留言", text: "一周年快乐。".repeat(100) },
];
collections.album.items = [
  { id: "test-image", title: "测试图片", src: room, alt: "测试场景图" },
  {
    id: "test-broken",
    title: "缺失图片",
    src: "/media/fixture-does-not-exist.png",
  },
];
const samples = 11025,
  wav = new ArrayBuffer(44 + samples * 2),
  view = new DataView(wav);
const ascii = (offset: number, text: string) =>
  [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
ascii(0, "RIFF");
view.setUint32(4, wav.byteLength - 8, true);
ascii(8, "WAVE");
ascii(12, "fmt ");
view.setUint32(16, 16, true);
view.setUint16(20, 1, true);
view.setUint16(22, 1, true);
view.setUint32(24, 22050, true);
view.setUint32(28, 44100, true);
view.setUint16(32, 2, true);
view.setUint16(34, 16, true);
ascii(36, "data");
view.setUint32(40, samples * 2, true);
for (let i = 0; i < samples; i++)
  view.setInt16(
    44 + i * 2,
    Math.sin((i / 22050) * 440 * Math.PI * 2) *
      500 *
      Math.sin((i / samples) * Math.PI),
    true,
  );
const audio = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
temporaryUrls.push(audio);
collections.radio.items = [
  { id: "test-audio", title: "测试提示音", src: audio },
];
async function videoFixture() {
  if (collections.tv.items.length) return;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 100;
  const context = canvas.getContext("2d")!;
  const stream = canvas.captureStream(12),
    chunks: Blob[] = [],
    recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const blob = await new Promise<Blob>((resolve) => {
    recorder.addEventListener("dataavailable", (e) => chunks.push(e.data));
    recorder.addEventListener("stop", () =>
      resolve(new Blob(chunks, { type: "video/webm" })),
    );
    recorder.start();
    let phase = 0;
    const timer = setInterval(() => {
      context.fillStyle = "#f6dce7";
      context.fillRect(0, 0, 160, 100);
      context.fillStyle = "#bc7897";
      context.fillRect(30 + phase++ * 3, 35, 28, 28);
    }, 70);
    setTimeout(() => {
      clearInterval(timer);
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    }, 700);
  });
  const video = URL.createObjectURL(blob);
  temporaryUrls.push(video);
  collections.tv.items = [{ id: "test-video", title: "测试视频", src: video }];
}
document.querySelectorAll<HTMLButtonElement>("[data-test]").forEach((button) =>
  button.addEventListener("click", async () => {
    if (button.dataset.test === "tv") {
      document.querySelector("#fixture-status")!.textContent =
        "正在生成无声测试片段…";
      await videoFixture();
      document.querySelector("#fixture-status")!.textContent =
        "测试片段已准备好";
    }
    openCollection(modal, button.dataset.test!);
  }),
);
window.addEventListener("pagehide", () =>
  temporaryUrls.forEach((url) => URL.revokeObjectURL(url)),
);
