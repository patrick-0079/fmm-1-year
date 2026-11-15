# 小屋门垫与花园整理（v43）

## 游戏内表现

- 小屋门口用奶油粉紫色的编织门垫替换原来的两块矩形。原生 Canvas 图案包含短流苏、针脚、花叶和小狐狸刺绣，只在首次绘制时生成 80 × 24 像素的缓存。代码位于 `src/door-rug.ts`，绘制范围不越过门口地板；出口和碰撞不变。
- 周年花园移除可坐长椅的绘制、互动点和碰撞。勇气花园长椅保留，仍可坐下和等待下一时段。
- 勇气花园北侧无目的地的花拱门与电视路牌改为连续白色栅栏和花篱，石路在花篱前结束。同步封闭北侧步行边界，保留勇气之花前的空地、南门与其余通路。

## 生成与资源

北侧花篱使用内置 **imagegen** 的图片编辑模式，以已查看的 `src/assets/courage-garden.png` 为编辑目标；未使用 CLI。已将最终图片复制到项目内，原始输出仍保留在生成目录。

- 原画：`src/assets/courage-garden.png`，1536 × 1024。
- 运行资源：`src/assets/courage-garden.webp`，使用 Sharp 编码，`quality: 90, effort: 6`；`scripts/optimize-art.mjs` 可按相同参数重建。
- 内置生成输出：`C:/Users/patrick/.codex/generated_images/01a19223-eccb-7b33-a445-e51d8f727202/exec-7f2ba6b6-70d8-4df2-aeb1-aaa100a70d48.png`。

最终提示词：

```text
Use case: precise-object-edit. Edit target: the supplied existing 1536x1024 pixel-art garden game map. Remove ONLY the unusable flower-covered archway at the very top center (roughly x660..870 y0..165) and the little blue television sign beside it. Close that north border naturally with a continuous low white picket fence, layered green shrubs and modest pink/lavender flowers matching the adjacent top-border garden vegetation. No opening, doorway, portal, arch, sign, staircase or scenery leading through the northern border. The narrow peach paving reaching that former gate should now end calmly in a short rounded garden overlook just below the closed flowering hedge. Keep the grass and paving around x768 y190..235 clear for a small collectible flower that the game draws there. CRITICAL INVARIANTS: keep the canvas exactly 1536x1024 with identical composition, framing, scale and all object positions. The rest of the picture outside the small north-central region must be unchanged: the entire S-shaped stone path below y240, the south entrance, both edge streams/waterfalls, trees, lanterns, all grass and fence sections, overall colors, crisp pixel texture and lighting. This is a small local repair of an existing playable collision-mapped background, NOT a newly imagined map. Do not add any characters, text, new benches, items, big flowers, UI, logos or watermarks.
```

## 回归检查

检查小屋门毯脚下通行与门口互动；周年花园原长椅的位置可横向、纵向穿过，没有残余提示；勇气花园北侧花篱不可越过，勇气之花仍可走近、南门正常返回。旧存档的原长椅前落点保持不变，原北门内落点安全回到出生点。
