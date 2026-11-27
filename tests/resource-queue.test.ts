import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { ResourceQueue, type Resource } from "../src/resource-queue.ts";

test("a saved map needs its own resources and shared art, not the default room", async () => {
  const files: Resource[] = [["actor", "", ["*"]], ["envelope", "", ["room"]], ["radio", "", ["town-radio"]]];
  const reads: string[] = [], progress: number[] = [];
  const queue = new ResourceQueue(files, async ([name]) => { reads.push(name); });
  await queue.prepare("town-radio", (loaded, total) => { assert.equal(total, 2); progress.push(loaded); });
  assert.deepEqual(reads, ["actor", "radio"]);
  assert.deepEqual(progress, [0, 1, 2]);
  await queue.prepare("room");
  await queue.prepare("town-radio");
  assert.deepEqual(reads, ["actor", "radio", "envelope"]);
});

test("only ready files from the selected map and shared UI advance the visible fraction", async () => {
  const files: Resource[] = Array.from({ length: 108 }, (_, index) => [String(index), "", [index < 50 ? "*" : "room"]]);
  files.push(["town-only", "", ["town"]], ["invitation", "", []]);
  const gate = Promise.withResolvers<void>(), readings: string[] = [];
  const queue = new ResourceQueue(files, async () => {});
  const run = queue.prepare("room", (loaded, total) => readings.push(`${loaded}/${total}`),
    async ([name]) => { if (Number(name) >= 10) await gate.promise; });
  await setImmediate();
  assert.equal(readings.at(-1), "10/108");
  gate.resolve();
  await run;
  assert.equal(readings.at(-1), "108/108");
  assert.equal(new Set(readings).size, 109);
});

test("target maps overtake background work, join in-flight reads and retry only genuine failures", async () => {
  const files: Resource[] = ["a", "b", "c", "d", "e", "f"].map(name => [name, "", ["a", "f"].includes(name) ? ["town"] : []]);
  const pending = new Map<string, PromiseWithResolvers<void>>();
  const starts: string[] = [];
  const queue = new ResourceQueue(files, async ([name], priority, retry) => {
    starts.push([name, priority, retry].join(":"));
    const transfer = Promise.withResolvers<void>();
    pending.set(name, transfer);
    await transfer.promise;
  });
  const background = assert.rejects(queue.prepare());
  assert.deepEqual(starts, ["a:low:false", "b:low:false"]);
  const counts: number[] = [];
  const town = assert.rejects(queue.prepare("town", loaded => counts.push(loaded)));
  assert.deepEqual(starts, ["a:low:false", "b:low:false", "f:high:false"]);
  pending.get("f")!.reject(Error("offline"));
  pending.get("b")!.resolve();
  await setImmediate();
  assert.equal(starts.length, 3);
  pending.get("a")!.resolve();
  await town;
  assert.deepEqual(counts, [0, 1]);
  for (const name of ["c", "d", "e"]) { await setImmediate(); pending.get(name)!.resolve(); }
  await background;
  const retry = queue.prepare("town", loaded => counts.push(loaded));
  assert.equal(starts.at(-1), "f:high:true");
  pending.get("f")!.resolve();
  await retry;
  await queue.prepare();
  assert.deepEqual(counts, [0, 1, 1, 2]);
  assert.equal(starts.length, 7);
});

test("a cold crossing cancels only unrelated active downloads and resumes them without marking an error", async () => {
  const files: Resource[] = [["unrelated", "", []], ["shared", "", ["*"]], ["target", "", ["garden"]]];
  const waits = new Map<string, ReturnType<typeof Promise.withResolvers<void>>>();
  const calls: string[] = [], cancelled: string[] = [];
  const queue = new ResourceQueue(files, async ([name], priority, retry, signal) => {
    calls.push(name + ":" + priority);
    assert.equal(retry, false);
    const wait = Promise.withResolvers<void>();
    waits.set(name, wait);
    signal.addEventListener("abort", () => { cancelled.push(name); wait.reject(signal.reason); }, { once: true });
    await wait.promise;
  });
  const background = queue.prepare();
  const foreground = queue.prepare("garden");
  assert.deepEqual(cancelled, ["unrelated"]);
  await setImmediate();
  assert.deepEqual(calls, ["unrelated:low", "shared:low", "target:high"]);
  waits.get("shared")!.resolve(); waits.get("target")!.resolve();
  await foreground;
  await setImmediate();
  assert.equal(calls.at(-1), "unrelated:low");
  waits.get("unrelated")!.resolve();
  await background;
});
