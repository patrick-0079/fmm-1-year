# 花海与换装素材

新地图和采集物使用内置 imagegen 制作。花海参考项目中的 `src/assets/garden-colorful.webp`，沿用周年庭院的视角与像素比例。

| 源文件 | 用途 |
| --- | --- |
| `src/assets/flower-meadow-v15.png` | 独立花海地图，运行时在七花集齐后异步解码对应 WebP |
| `src/assets/rainbow-flowers-v15.png` | 七种彩边花和七色花门，按四列两行裁切，按透明边界紧裁后保持比例 |
| `src/assets/nemu-sprites.png`、`src/assets/fufu-rest-poses.png` | 根据 12 个站立或迈步帧与独立坐姿的可见布料，生成 `src/assets/fufu-garments-v15.webp` |

从项目根目录运行 `npm run art:meadow` 可重建这三份运行图。人物服装的后视裙摆、肩带、坐姿袖口以人物的脚底为共同基准。更改原始角色图集后，可在 `/tests/equipment-fixture.html` 对照前后脚、脸、头发、膝盖和鞋底。

## 花海底图的生成提示词

Use case: stylized-concept. Create a NEW entire playable overhead overworld tilemap painting for the secret Sea of Flowers (花海), the reward for collecting seven rainbow flowers in this pink-haired ASMR streamer's first-anniversary cozy RPG. Attached anniversary garden supplies illustrated 16-bit pixel RPG style and camera angle ONLY. One continuous landscape 1536x1024 3:2, almost top-down slightly angled (like reference), no sky or horizon. Art-directed and magical: flowing ribbons of thousands of flowering lavender, coral poppies, buttercup gold, powder blue, soft mint, daisies and rose pink spreading across a lush meadow, tiny butterflies, natural shafts of daylight, warmer soft afternoon colors. Walkable buttery-stone and short-grass trails clearly legible. SPECIFIC layout: main trail starts at bottom center through a small floral arch, leads north into a broad open round grassy clearing about (52% x,53% y); a broad graceful Y branches to a small open west flower-watching overlook at (23%,53%) and reaches an east open meadow at (77%,45%). Near top middle at (52%,23%) is a delicate wisteria pergola with ribbons and a small gold crescent ornament, and a trail from the central clearing to its open front. Low bedding of flowers everywhere between paths, not vertical walls. Framing distant bushes/woods only at far perimeter outside central walkable space. No ponds/rivers, buildings, towns or people. Authored crisp square pixel clusters and rich cozy 16-bit game details with consistent lighting. A pretty destination to wander; do not use a full screen heart or rainbow graphic, no UI, writing, numbers, grid, frame or borders.

## 彩虹花与花门的生成提示词

该图集使用透明背景。

Use case: stylized-concept. A game collectibles atlas with genuine transparent background. EXACT four columns by two rows of SEVEN special prismatic flowers plus ONE secret portal. Each of the eight objects fully contained and centered in its own equal cell with generous transparent padding, isolated, tabletop side view with top-down overlap matching a cozy 16-bit farming RPG. True hand-clustered pixel art, dark teal/plum details, strong silhouettes legible at 25-40 pixels, emerald stems, two pointed leaves and three crystal dew glints. EACH flower individually has iridescent rainbow petals or contrasting rainbow edging in addition to the dominant hue. Row 1 left to right: red-coral double rose, amber-orange poppy, buttercup-gold star lily, emerald four-leaved peony. Row 2 left to right: sky-blue bellflower, deep indigo iris, lavender-violet cosmos, and finally an open arch of braided willow vine, rainbow flowers, crystal prism and two soft lanterns (open see-through interior and no ground). No pot, labels, text, plaque lettering, cards, shadows extending beyond sprites, background, numbers, scene or checkerboard. Original first-anniversary cute game art.
