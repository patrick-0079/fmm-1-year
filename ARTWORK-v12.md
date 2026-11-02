# v12 场景材质统一

本轮使用内置 `image_gen` 生成四张项目素材，均已复制到 `src/assets/`，不依赖生成目录。前三张的参考图仅用于材质与风格，不更改已有地图结构。PNG 原图保留；运行时使用无损 WebP，透明图保留真实 alpha。

| 文件名（PNG / WebP） | 尺寸 | 用途 |
| --- | --- | --- |
| `anniversary-stalls-v12` | 1536×1024 | 绿、紫、粉三种木作周年摊位，映射到七种小游戏 |
| `garden-keepsakes-v12` | 1881×836 | 地面星屑和玫瑰雏菊花环 |
| `window-skies-v12` | 1536×1024 | 2×2 的清晨、白昼、黄昏、夜晚像素云海 |
| `town-paving-v12` | 1254×1254 | 小镇新增铺地的石板纹理 |

另有 `anniversary-town-v12.webp`（1536×1024），从仓库原有 `anniversary-town-v2.png` **无损压缩**得到，不进行重画、锐化或放大。原先的 WebP 是有损压缩；新文件保留 PNG 的全部像素，不改变碰撞坐标。

## 接入与裁切

`src/scene-art.ts` 登记素材与真实裁切。三座摊位分别为 `[7,190,486,667]`、`[523,190,488,668]`、`[1040,190,489,668]`，显示宽 78 世界像素；柜体碰撞宽 58，盆花为装饰外沿。窗口按四等分读取，再裁取每格 y=28、h=317 的全宽片段，保持窗框、窗帘、窗台与花朵遮罩。

星屑读取 `[85,175,770,515]`，花环读取 `[1040,45,785,765]`。地面花环经过俯视投影，佩戴图仍使用原花环图集以保留角色定位。庭院物件采集后仍消失，奖励与存档 id 不变。

石板按 96 世界像素为一块，使用镜像延伸与统一地图原点；先合并摊位地面与连通小路的裁切，再绘制一次纹理，不给内部边界描线。石板二次生成修淡了接缝和对比，使小石块的尺度更贴近原路面。`npm run optimize:art` 可从保留的 PNG 重建上述 WebP。`/tests/scenery-fixture.html` 对照四时窗景、七个摊位和两种收藏物。

## 内置 image_gen 最终提示词

### 周年摊位（参考：anniversary-town-v2.png；透明背景）

> Use case: stylized-concept. Asset type: production transparent sprite atlas for a cozy detailed top-down pixel RPG celebrating pink-haired streamer Fufu's first livestream anniversary. The reference image is STYLE ONLY: match its finely textured warm wooden village shops, tiled roofs, tiny flowers, warm lanterns, crisp pixel clusters, 3/4 elevated top-down perspective. Create THREE freestanding little anniversary arcade stalls in a horizontal row on true transparent background, isolated with wide transparent gutters and no ground plates. Left stall sage green striped canopy with wooden shingle roof edging, middle muted plum and cream canopy, right dusty rose and cream canopy. All same compact silhouette: chunky warm oak corner posts, layered carved timber counter, roof/shingle and fabric texture, tiny garlands of leaves and pink flowers, two brass lanterns, small star/heart anniversary ornaments and pennant bunting. Each stall has a big blank cream wooden sign near top and a clearly visible blank dark navy rectangular screen below awning, with a modest blank cream plaque on lower counter. No people, no animals, no lettering, no words, no numbers. Faces front with slight view of roof and countertop, NOT flat vector. Pixel-art game sprites, rich material shading like the reference, no vector ellipses, no blur. Equal scale, complete unclipped silhouette including feet. At least 350 pixels tall each. Composition 1536x1024 with only three stalls, empty space around each.

### 星屑和花环（透明背景）

> Use case: stylized-concept. Asset type: two collectible world sprites, detailed crisp cozy pixel art matching a warm lush anniversary garden RPG. True transparent background. A horizontal atlas with TWO fully separated sprites with wide empty transparent margins: LEFT a tiny magical constellation keepsake on the grass: a faceted golden five-point star crystal nestling among two smaller pale aqua star shards, delicate ribbon and a couple small grass leaves, golden twinkle; RIGHT a beautiful wearable flower wreath laid flat at a three-quarter overhead angle, braided sage-green leaves, tiny ivory daisies and blush roses, one pale lavender ribbon bow with short ribbon tails. A real ring with transparent center, visible depth and detailed petals, not a flat oval or color blocks. High quality shaded hand-pixelled material, crisp defined outlines and readable small silhouette, warm fantasy village farming RPG look. Color palette soft gold, ivory, rose pink, sage and lavender. No text, no icon frames, no circles behind them, no square platforms, no pedestals, no UI, no people. About 600x600 visual bounds per sprite on a 1536x1024 atlas, but safely separated, no clipping.

### 四时窗景（参考：room-interactive.png）

> Use case: stylized-concept. Asset type: four seamless-in-style sky panorama variants for the window of a cozy warm wooden pixel-art anniversary bedroom. Reference is STYLE ONLY: emulate the richly shaded pixel cloud banks, warm twinkling stars and the charming pixel storybook treatment seen through its window. Create ONE atlas arranged in a precise 2 by 2 grid with four equal wide landscape panels, NO window frame, NO room, NO borders, NO text. Every panel depicts the SAME distant rolling cloud landscape with the SAME large puffy cloud banks at the bottom, small wisps higher up and open sky above, seen through a bedroom window. Top-left DAWN: peach horizon, mauve-blue upper sky, sun peeking at right. Top-right DAY: soft clear blue sky, ivory clouds and pale golden sun in upper center-right. Bottom-left DUSK: apricot and muted rose sky, violet clouds warmly lit by sunset. Bottom-right NIGHT: rich deep indigo, the same cloud shapes now blue with silver rims, warm golden moon upper center-right and tiny golden twinkling stars. All FOUR panels share identical hand-pixelled texture, crisp pixel clusters, level of detail, camera position and landscape silhouettes; change lighting/colors/celestial object only. Avoid smooth gradients, flat vector shapes, photorealism and blurry painting. No foreground trees or buildings. Four equal panels reaching their own edges, 1536x1024 total, each 768x512.

### 石板纹理（参考：anniversary-town-v2.png）

> Use case: stylized-concept. Asset type: seamless repeating ground texture for the existing cozy detailed pixel RPG town. Reference image STYLE ONLY. Generate ONLY a square tileable warm sandstone cobblestone path texture, viewed straight from above. Roughly 9 irregular rounded stones across and 9 down, varying sizes, naturally fitted staggered cobbles with subtle beige, honey cream, pale dusty rose colors. Fine hand-pixelled material clusters, small highlights at upper-left edges, muted brown thin mortar seams and gentle shaded lower-right edges. Match the cobbled lanes in the reference. Readable crisp pixels, no blur or vector geometric tiling. Square 1024x1024. Truly seamless edges top/bottom and left/right; pattern continues seamlessly. Very occasional tiny moss specks in the mortar, no grass border, no plants, no footprints, no items, no shadows cast by objects, no panels, no bevel border, no text. Texture all the way to every edge.

最终采用的调整提示词（图一为小镇参考，图二为首版石板）：

> Use case: precise-object-edit. Asset type: seamless pixel-art path material for this existing cozy town. Image 1 is the STYLE AND COLOR REFERENCE, especially the narrow pale beige stone streets near the moon-roof building. Image 2 is the EDIT TARGET: keep its irregular fitted cobblestones and full edge-to-edge square texture but make its mortar much narrower and lighter, reduce dark outlines and coarse contrast, and lighten stones to match the pale warm cream, muted beige and soft dusty-rose paving in Image 1. At final in-game scale each stone should look like the small delicate stones in the town, not large dark round boulders. Retain crisp pixel clusters, detailed subtle surface grain, no smooth blur, no vector appearance. Keep seamless edge continuity, no border, no grass, no objects, no text, no perspective. Output only the revised square paving texture, not the town, no comparison sheet. Make the palette and fine joints sit naturally beside the reference town's original paving.
