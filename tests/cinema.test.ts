import test from "node:test";
import assert from "node:assert/strict";
import { gardenScreen } from "../src/cinema-config.ts";
import {
  CinemaSession,
  bufferedUntil,
  containVideo,
  mediaTime,
} from "../src/cinema-state.ts";

test("a film ready in the background still requires an inserted tape and a play request", () => {
  const film = new CinemaSession();
  film.ready();
  for (const tape of ["missing", "carried"] as const) {
    assert.equal(film.open(tape), false);
    assert.equal(film.active, false);
    assert.equal(film.request(), false);
    assert.equal(film.playing(), false);
  }
  assert.equal(film.open("inserted"), true);
  assert.equal(film.stage, "ready");
  assert.equal(film.playing(), false);
  assert.equal(film.request(), true);
  assert.equal(film.playing(), true);
});

test("late readiness after leaving never authorizes background playback", () => {
  const film = new CinemaSession();
  assert.equal(film.request(), false);
  film.open("inserted");
  assert.equal(film.stage, "loading");
  assert.equal(film.request(), true);
  film.leave();
  film.ready();
  assert.equal(film.hasFrame, true);
  assert.equal(film.wanted, false);
  assert.equal(film.playing(), false);
  film.open("inserted");
  assert.equal(film.playing(), false, "returning still requires pressing play");
  assert.equal(film.request(), true);
  assert.equal(film.playing(), true);
});

test("leaving during playback retains readiness and cancels playback intent", () => {
  const film = new CinemaSession();
  film.open("inserted");
  film.ready();
  film.request();
  film.playing();
  film.waiting();
  assert.equal(film.stage, "buffering");
  film.leave();
  film.pause(); // Native pause can arrive after the leave action.
  assert.equal(film.stage, "paused");
  assert.equal(film.hasFrame, true);
  assert.equal(film.playing(), false);
});

test("load failures are retryable without starting playback, and ended stays ended on pause", () => {
  const film = new CinemaSession();
  film.open("inserted");
  film.fail();
  film.pause();
  assert.equal(film.stage, "error");
  assert.equal(film.request(), false);
  film.retry();
  assert.equal(film.stage, "loading");
  assert.equal(film.wanted, false);
  film.ready();
  film.request();
  film.playing();
  film.end();
  film.pause();
  assert.equal(film.stage, "ended");
  assert.equal(film.wanted, false);
});

test("buffer display uses the range at the playhead, not a distant seek buffer", () => {
  const ranges = {
    length: 2,
    start: (i: number) => [0, 25][i],
    end: (i: number) => [8, 32][i],
  };
  assert.equal(bufferedUntil(ranges, 5), 8);
  assert.equal(bufferedUntil(ranges, 26), 32);
  assert.equal(bufferedUntil(ranges, 15), 0);
  assert.equal(bufferedUntil({ ...ranges, length: 0 }, 0), 0);
  assert.equal(mediaTime(NaN), "--:--");
  assert.equal(mediaTime(32.9), "00:32");
  assert.equal(mediaTime(3605), "1:00:05");
});

test("both landscape and portrait videos fit the garden TV without stretching", () => {
  const box = gardenScreen;
  for (const [w, h] of [
    [1920, 1080],
    [1080, 1920],
    [1280, 720],
  ]) {
    const fit = containVideo(w, h, box);
    assert.ok(Math.abs(fit.w / fit.h - w / h) < 1e-8);
    assert.ok(fit.x >= box.x && fit.y >= box.y);
    assert.ok(fit.x + fit.w <= box.x + box.w + 1e-8);
    assert.ok(fit.y + fit.h <= box.y + box.h + 1e-8);
  }
});
