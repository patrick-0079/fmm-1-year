export const fireworkWishes = [
  "芙芙，一周年快乐！",
  "谢谢这一年的晚安 ♡",
  "愿你一直闪闪发光",
  "下一个晚安，也一起",
  "把小快乐，送给芙芙",
];
export const wishAtBurst = (index: number) =>
  fireworkWishes[
    ((index % fireworkWishes.length) + fireworkWishes.length) %
      fireworkWishes.length
  ];
export function wishOpacity(life: number, maxLife: number) {
  return Math.max(0, Math.min(1, (maxLife - life) / 0.22, life / 0.65));
}
