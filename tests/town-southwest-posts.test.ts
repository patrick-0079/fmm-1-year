import assert from "node:assert/strict";
import test from "node:test";
import { canStand, canTravelBetween, findPath, polygonContains } from "../src/core.ts";
import { scenes } from "../src/maps.ts";
import { southWestPosts } from "../src/town-southwest-posts.ts";

const town = scenes.town;
const point = (x: number, y: number) => ({ x, y });
const walkable = (x: number, y: number) => canStand(point(x,y), town.walls, town.bounds, town.floor, town.surfaces);
const covered = (x: number, y: number) => southWestPosts.filter(post => polygonContains(point(x,y),post.points)).map(post => post.id);

test("the postal pier and wheat bollard expose the paving behind the raised stonework and stop feet at the base", () => {
  for (const [x,y] of [[329,704],[329,710],[156,725],[156,728],[347,723]]) {
    assert.equal(walkable(x,y), true, String([x,y]));
  }
  for (const [x,y] of [[328,719],[330,740],[156,735],[153,732],[156,747]]) {
    assert.equal(walkable(x,y), false, String([x,y]));
  }
  assert.deepEqual(covered(329,704),["postal-middle-stair-pier"]);
  assert.deepEqual(covered(156,725),["wheat-stair-solitary-post"]);
  assert.deepEqual(covered(347,723),[]);
});

test("the tea terrace passage is reachable in both directions and the rails keep their gaps", () => {
  const entrance = point(164,612), behindUmbrella = point(141,591);
  for (const [start,end] of [[town.spawn,behindUmbrella],[behindUmbrella,town.spawn]]) {
    assert.deepEqual(findPath(start,end,town)?.at(-1), end);
  }
  const route = [entrance,point(157,608),point(150,601),point(143,594),behindUmbrella];
  for (let i=1;i<route.length;i++) assert.ok(canTravelBetween(route[i-1],route[i],town));
  assert.deepEqual(covered(140,591),["post-tearoom-parasol"]);
  assert.ok(!walkable(123,616));
  assert.deepEqual(covered(195,637),["post-terrace-crossrail-1-1"]);
  assert.deepEqual(covered(195,641),[]);
  assert.deepEqual(covered(346,632),["postal-stair-pink-lower-post"]);
});
