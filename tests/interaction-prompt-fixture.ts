import { InteractionPrompt, type PromptState } from "../src/interaction-prompt";

const actions: string[] = [];
const stage = document.querySelector<HTMLElement>("#stage")!;
const prompt = new InteractionPrompt(stage, id => actions.push(id));
const button = prompt.element;
const a: PromptState = {
  id: "a", action: "与红笺交谈", verb: "交谈", kind: "talk", mode: "pointer", inRange: true,
  anchor: { x: 150, y: 120 }, objectBox: { x: 135, y: 100, w: 30, h: 40 },
  playerBox: { x: 135, y: 180, w: 30, h: 44 },
};
const b: PromptState = { ...a, id: "b", action: "与蓝莓交谈" };
const down = (pointerType = "mouse", key = 0) => button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType, button: key }));
const click = (detail = 1) => button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail }));
const cases: [string, () => void, string[]][] = [
  ["左键按下与释放只触发当前对象一次", () => { down(); click(); }, ["a"]],
  ["触屏轻触只触发当前对象一次", () => { down("touch"); click(); }, ["a"]],
  ["右键按下直接触发当前对象一次", () => { down("mouse", 2); }, ["a"]],
  ["在 A 按下，目标变成 B 后释放，不激活 B", () => { down(); prompt.update(b); click(); }, []],
  ["按住期间 A 变 B 再变回 A，仍取消该次点击", () => { down(); prompt.update(b); prompt.update(a); click(); }, []],
  ["按住时目标隐藏，再显示 B 后释放，不激活 B", () => { down(); prompt.update(null); prompt.update(b); click(); }, []],
  ["触屏手势取消后不再执行点击", () => { down("touch"); button.dispatchEvent(new PointerEvent("pointercancel")); click(); }, []],
  ["取消手势不影响下一次正常点击", () => { down(); prompt.update(b); click(); down(); click(); }, ["b"]],
  ["键盘生成的点击使用当前目标", () => { prompt.update(b); click(0); }, ["b"]],
  ["隐藏提示不执行点击", () => { prompt.update(null); click(0); }, []],
];
let passed = 0;
for (const [label, run, expected] of cases) {
  actions.length = 0;
  prompt.update(a);
  run();
  const line = document.createElement("li");
  const okay = JSON.stringify(actions) === JSON.stringify(expected);
  line.className = okay ? "pass" : "fail";
  line.textContent = `${okay ? "通过" : "失败"} · ${label}${okay ? "" : `，实际 ${JSON.stringify(actions)}`}`;
  document.querySelector("#results")!.append(line);
  if (okay) passed++;
}
prompt.update(a);
document.querySelector("#summary")!.textContent = `${passed} 项通过，${cases.length - passed} 项失败`;
