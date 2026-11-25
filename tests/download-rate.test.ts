import assert from "node:assert/strict";
import test from "node:test";
import { DownloadRate, rateLabel } from "../src/download-rate.ts";

test("network rates apportion long asset requests and add overlapping transfers without counting cache bytes", () => {
  const rate = new DownloadRate();
  rate.add(100_000, 10_000, 10_000);
  rate.add(5000, 10_000, 5000);
  rate.add(0, 10_000);
  assert.equal(rate.perSecond(10_000), 11_000);
  assert.equal(rate.perSecond(12_500), 5500);
  assert.equal(rate.perSecond(15_000), 0);
  assert.equal(rate.bytes, 105_000);
});

test("streamed video has a separate rolling rate that falls to zero after a stall", () => {
  const rate = new DownloadRate();
  rate.add(3000, 1000);
  rate.add(2000, 1001);
  assert.equal(rate.perSecond(1100), 1000);
  assert.equal(rate.perSecond(6500), 0);
  assert.equal(rateLabel(0), "0 B/s");
  assert.equal(rateLabel(2048), "2.0 KiB/s");
  assert.equal(rateLabel(1048576), "1.00 MiB/s");
});
