import test from "node:test";
import assert from "node:assert/strict";
import { collections, producers } from "../src/content.ts";
import { postLetter } from "../src/resident-story.ts";

test("all twelve stars retain the approved names, order and two authored messages", () => {
  assert.deepEqual(producers.map(person => [person.id, person.name]), [
    ["star-xiaoye", "小叶子"], ["star-yeshenhua", "夜神华"], ["star-patrick", "派大星"],
    ["star-kerry", "Kerry"], ["star-suyan", "苏颜"], ["star-qing", "卿取之于蓝"],
    ["star-zhenghao", "正号"], ["star-qianyu", "千羽"], ["star-rabe", "Rabe"],
    ["star-xiaoyou", "一橙橘小佑"], ["star-guli", "故里"], ["star-qianxiao", "浅笑"],
  ]);
  assert.deepEqual(producers.slice(0, 2).map(({ x, y }) => ({ x, y })), [{ x: 485, y: 335 }, { x: 685, y: 270 }]);
  const leaf = producers[0].message;
  assert.equal(leaf.split(/\r?\n\s*\r?\n/).length, 3);
  assert.ok(leaf.startsWith("这是一颗星星，是众多芙妮宝里的没那么亮的一颗。"));
  assert.ok(leaf.includes("是什么呢？！是…是芙芙。"));
  assert.ok(leaf.endsWith("终于拥有了属于自己的太阳，再也不会放手了。”"));
  assert.equal(producers[1].message,
    "星星原本身处宇宙里的尘埃，有一天星星随着宇宙引力飘呀飘呀，飘到了属于芙芙的星球，成为了芙妮宝星，成为了芙芙的卫星，永远绕着芙芙转，永不分离");
  for (const person of producers.slice(2)) assert.equal(person.message, "");
  for (const person of producers) assert.doesNotMatch(person.message, /xxx|占位|待补充/i);
});

test("public letters keep their approved order, paragraph boundaries and supplied wording", () => {
  assert.deepEqual(collections.letters.items.map(letter => [letter.id, letter.author]), [
    ["xiaoye-anniversary-letter", "小叶子"], ["yeshenhua-anniversary-letter", "夜神华"], ["kerry-anniversary-letter", "Kerry"],
    ["suyan-anniversary-letter", "苏颜"], ["rabe-anniversary-letter", "Rabe"],
    ["xiaoyou-anniversary-letter", "一橙橘小佑"], ["guli-anniversary-letter", "故里"],
  ]);
  const leaf = collections.letters.items[0].text!;
  assert.equal(leaf.split(/\r?\n\s*\r?\n/).length, 6);
  assert.ok(leaf.startsWith("今天是我陪伴芙芙的第九十四天，还差六天就百天了！"));
  assert.ok(leaf.includes("其实现在才11.3号，还差一个月才周年呢。"));
  assert.ok(leaf.includes("那我对芙芙的爱已经是100分啦甚至是101分"));
  assert.ok(leaf.includes("我可以两三天不看直播，但是我不能看着你难受两三天。"));
  assert.ok(leaf.endsWith("周年快乐！以后的周年，小叶子都会在你的身边。"));
  assert.equal(collections.letters.items[1].text,
    "今天是芙芙的周年，周年快乐！！！！！上芙芙的船也有三个月了哦，呜呜呜，好像芙芙生日的时候要说的都说完了，虽然不知道说什么，但是夜神华会一直陪着芙芙，期待芙芙越来越好，越来越鬼脑（），喜欢芙芙，因为芙芙每晚有芙芙睡的非常安心，嘿嘿嘿");
});

test("the new stars use the approved shapes and both new letters preserve the supplied wording", () => {
  const [xiaoyou, guli, qianxiao] = producers.slice(9);
  assert.deepEqual([xiaoyou, guli, qianxiao].map(({ x, y, shape }) => [x, y, shape]), [
    [301, 414, "gold"], [615, 187, "pink-fish"], [797, 468, undefined],
  ]);
  assert.deepEqual(collections.letters.items.slice(-2), [
    {
      id: "xiaoyou-anniversary-letter", title: "一橙橘小佑的周年来信", author: "一橙橘小佑",
      text: "❤️❤️❤️小佑喜欢芙芙姐姐，小佑要当一辈子芙妮宝！芙芙姐姐一周年快乐！❤️❤️❤️",
    },
    {
      id: "guli-anniversary-letter", title: "故里的周年来信", author: "故里",
      text: "老大老大我要磨🐟",
    },
  ]);
});

test("Rabe's supplied wording is a public letter, not a star message", () => {
  const letter = collections.letters.items.find(item => item.id === "rabe-anniversary-letter")!;
  const supplied = `芙总，认识你这件事，我晚了一整年——十月一日才摸进狐狸窝，算到今天，不过才一“坤"月。 可就是这一"坤"月，我的深夜突然有了去处：睡不着的时候戴上耳机，听你说话，天大的事都轻了。 一周年这天，我还是不太擅长表述这些，只想把最老实的一句话放在这里： 愿你的直播间永远有人等，也永远有我们。明年今天，我准时到。`;
  assert.equal(letter.title, "Rabe 的周年来信");
  assert.equal(letter.author, "Rabe");
  assert.equal(letter.text!.replace(/\s/g, ""), supplied.replace(/\s/g, ""));
  assert.equal(letter.text!.split(/\r?\n\s*\r?\n/).length, 4);
  assert.equal(producers.find(person => person.id === "star-rabe")!.message, "");
});

test("Suyan's new letter keeps the supplied wording, while only Zhenghao owns the silent cross star", () => {
  const letter = collections.letters.items.find(item => item.id === "suyan-anniversary-letter")!;
  assert.equal(letter.author, "苏颜");
  assert.equal(letter.text, "芙芙周年快乐喔（要很多很多的那个）");
  assert.deepEqual(producers.filter(person => person.shape === "cross").map(person => person.id), ["star-zhenghao"]);
  assert.equal(producers.find(person => person.id === "star-zhenghao")!.message, "");
  assert.equal(producers.find(person => person.id === "star-suyan")!.message, "");
});

test("Kerry's existing letter stays byte-for-byte unchanged and the fictional post letter is attributed", () => {
  const kerry = collections.letters.items.find(letter => letter.id === "kerry-anniversary-letter")!;
  assert.deepEqual(kerry, {
    id: "kerry-anniversary-letter", title: "Kerry 的周年来信", author: "Kerry",
    text: "芙芙一周年快乐！从初见到现在，转眼也是5个月过去了。印象最深一句话是，“放心你明天会成功的，我的祝福可是很灵的哦”。第二天迟迟没有进展的实验居然真的有了突破，这可没法把你写进实验操作指南里。他人的鼓励确实能安抚焦虑，给人勇气，感谢有你陪伴。（小小芙多来点谢谢）",
  });
  assert.equal(postLetter.author, "红笺 · 周年小镇邮局");
  assert.ok(postLetter.text!.startsWith("芙芙，见字安。"));
  assert.ok(postLetter.text!.endsWith("下一次路过邮局，不用带信，也欢迎你来坐坐。"));
  for (const letter of [...collections.letters.items, postLetter]) assert.doesNotMatch(letter.text!, /xxx|正文还在路上|待补充/i);
});
