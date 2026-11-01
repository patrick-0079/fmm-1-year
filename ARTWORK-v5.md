# 花园与休息动作素材

本轮使用内置 imagegen 生成四份透明像素素材，PNG 原图保留；网站引用本地 WebP。按坐姿与睡姿的实际轮廓裁切图集，避免等分网格残边。

## garden-bench

保存位置：`src/assets/garden-bench.png`；网页使用同名 WebP。

```text
Game-ready transparent pixel-art sprite of one beautiful garden bench, for a cozy top-down chibi RPG. Elevated orthographic three-quarter view, front facing toward viewer, wide horizontal silhouette. Warm honey oak wooden seat slats and curved backrest, carved small heart in central back slat, elegant lavender painted cast-iron armrests and curved legs, little trailing ivy and two delicate pink flowers only on the far left and right ends, cream highlights and dusty mauve shadows. Seat center is empty, unobstructed and wide enough for one chibi character to sit. Rich hand-placed square pixel details, matching a detailed cozy indie garden background, not flat rectangles, not smooth vector. No floor, no scenery, no text, no character. Whole bench centered with generous alpha transparent margins, output wide landscape. Designed to render about 70 by 43 logical pixels.
```

## mossy-stone

保存位置：`src/assets/mossy-stone.png`；网页使用同名 WebP。

```text
One polished game-ready pixel art sprite of a small natural mossy rock obstacle, transparent alpha background, no ground or scenery. Cozy detailed top-down RPG elevated orthographic view. An irregular low rounded grey blue boulder with several distinct faceted stones, tiny chips and cracks, lavender shadows, pale blue stone highlights, lush soft mint moss draped across the top and one tiny pink wildflower growing at its side. Readable natural silhouette, beautiful fine pixel clusters as if drawn at 48 by 36 then enlarged nearest-neighbor, not flat rectangles or vector. Entire object visible centered with transparent margins, no text, no UI, no character.
```

## flower-wreath

保存位置：`src/assets/flower-wreath.png`；网页使用同名 WebP。

```text
One game-ready delicate FLOWER WREATH / flower crown pixel-art sprite on true transparent alpha background. Front elevated view for wearing on a chibi character's head. A gently curved slim oval ring of interwoven mint leaves and green stems with many small distinct pink cosmos, cream daisies with golden centers, lavender bell flowers, and a tiny silk lavender ribbon trailing on the right. Leave the center/open area transparent so the character's pink hair shows through. Refined fine square pixel clusters, dusty mauve outlines, matching a detailed cozy pixel RPG rather than cartoon vector. The crown is broad and shallow, about 3:1 wide to high, meant to render at 29 by 11 logical game pixels. Entire crown visible, centered with transparent padding. No head, no character, no text, no scenery.
```

## fufu-rest-poses

保存位置：`src/assets/fufu-rest-poses.png`；网页使用同名 WebP。

造型与画风参考：`src/assets/nemu-sprites.png`。坐姿裁切 `(87,88,593,733)`；睡姿裁切 `(754,275,966,520)`，均保留原比例。

```text
Use the supplied pixel sprite sheet as CHARACTER IDENTITY AND STYLE reference. Produce ONE clean transparent-alpha 2-column sprite atlas with TWO separate rest poses of that exact small two-head-tall chibi: pastel pink long hair, little ahoge, heart hair clip, green eye on viewer's left and pink eye on viewer's right, modest lavender-and-white long-sleeved pajamas and slippers. Crisp pixel art, dusty mauve outlines, same proportions and outfit as reference. LEFT HALF: sitting down facing viewer, knees bent and lower legs/slippers forward, hands resting together in lap, relaxed soft smile, NO chair or bench (transparent behind her). RIGHT HALF: sleeping lying horizontally on her side, head on the LEFT resting on a small cream pillow, eyes closed, feet on RIGHT, curled comfortably with a small lavender blanket over her lower body, no bed or floor. Both full poses contained separately in own half with generous transparent gutters and no overlap. No labels, no text, no extra characters. No red halo, no colored background, no shadows outside the pose.
```

## 小叶子的便签图片

用户本轮提供的四格插画，原样复制到 `src/assets/xiaoye-note.png`；生成 640 像素宽的 WebP 用于网页。未改画、未裁切，完整展示四格。原文：小叶子让你休息一下再重新出发，辛苦啦宝宝。

## 小溪与烟花

小溪的水域、桥梁和碰撞共用 `src/landscape.ts` 的坐标，画面由 Canvas 绘制。烟花为地图内的心形、星形与金色花火粒子，不依赖视频或远程素材。
