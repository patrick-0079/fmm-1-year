# v13 · 高清小镇与独立花门

使用内置 imagegen，以项目原有插画作风格和布局参考。游戏逻辑坐标、存档和交互 ID 不随画面分辨率变化。

| 素材 | 用途 |
| --- | --- |
| `src/assets/anniversary-town-v13.png` | 整图重绘稿，1536×1024；制作高清分区时的共同参考 |
| `src/assets/anniversary-town-hd-v13.png` | 四幅分区重绘拼成的 3072×2048 母图 |
| `src/assets/anniversary-town-hd-v13.webp` | 无损高清运行图，首次进镇后异步解码 |
| `src/assets/anniversary-town-v13.webp` | 从同一母图缩小的 1536×1024 预览，载入高清图期间可游玩 |
| `src/assets/town-gate-v13.png` / `.webp` | 透明玫瑰木门。源图 1254×1254，运行图 384×384，保留透明通道；门牌文字在游戏中清晰绘制 |

## 拼接与导出

按世界坐标从整图重绘稿截取四个 816×544 的参考区：西北 (0, 0)、东北 (720, 0)、西南 (0, 480)、东南 (720, 480)。每区独立重绘为 1536×1024，依次作为 NW、NE、SW、SE 输入。四区重叠处选择色差较小的接缝，保留房檐和栏杆的轮廓，仅在接缝两侧很窄的范围过渡。

```sh
node scripts/join-town-art.mjs src/assets/anniversary-town-hd-v13.png nw.png ne.png sw.png se.png
npm run optimize:art
```

仓库已有拼好的母图，日常修改和部署都不需要分区图或生成工具。普通构建直接使用现成 WebP；仅重做地图时需要拼接步骤。

## 最终提示词

**小镇整图**（编辑参考：`anniversary-town-v2.png`；本次整图实际输出 1536×1024，高清细节来自后续四区重绘）。

Use case: precise-object-edit. Asset: high resolution in-game town background for a 2D cozy farming pixel RPG celebrating pink-haired Fufu's first livestream anniversary.
EDIT TARGET: the attached town background. Re-render this EXACT SAME MAP at 3072 by 2048 pixels (3:2 landscape), with genuinely more fine pixel-art detail and MUCH crisper sharp contours. Not simply a blurry upscale. Preserve the entire composition, every building footprint, path center line, stair, fence, tree trunk, bank and pond in the same proportional position; the game already has collision geometry traced over this exact map. Keep all existing playable open lawns and stone paths completely open. Preserve color palette: leafy green, warm honey cobbles, rose/plum/teal roof accents, pink anniversary flowers/pennants, bright warm daytime.
Draw clean deliberate pixel clusters and firm outlines on each roof tile, stone step, individual cobble, fence rail, leaf and blossom, no depth-of-field, no gaussian softness, no painterly mush. Make distant/top and foreground/bottom equally sharply rendered. Preserve original 3:2 bounds; no crop, no camera shift, no new buildings, no new stalls, no people, no UI, no new sign text. Highest resolution clean crisp map.

**分区高清重绘**（四区共用，每次仅附对应参考裁片）。

Use case: precise-object-edit. This image is a tightly cropped 816x544 texture tile of an existing video game town. Reconstruct it at 1536x1024, higher resolution with clean intricate pixel-art detail. It will be stitched into adjacent tiles of the exact same map: STRICTLY preserve the exact position, scale, geometry, colors, silhouette, outlines, and all four cut-off edges of the input, including partially cut buildings/plants. Do not expand the view even slightly, recompose, or add any objects. Give the existing cobbles, flowers, fence rails, rooftop shingles and foliage crisp, individually readable edges and fine deliberate details, matching the reference cozy farming RPG style and same daytime colors/values exactly. No blur, no text, no new structures, no painting soft focus, no UI, no edge frame. Keep everything perfectly registered to the input; only higher-resolution texture detail changes.

**独立花门**（风格参考：`garden-colorful.png`，透明背景）。

Use case: stylized-concept. Asset type: isolated transparent game sprite, NOT a full scene.
The reference image supplies only art style/material/colors: a cozy pixel-art anniversary garden with ivory picket fencing, honey wood, pink roses, lanterns and little stars. Create ONE standalone open entrance gate for Fufu's first livestream anniversary town. View from front with a little top-down elevation matching a farming RPG. A substantial arch of warmly shaded timber with two stone/wood pillars, open double wooden gate leaves pushed outward to the sides, pink climbing roses and sage foliage framing the arch, two small amber lanterns, a few gold stars and rose ribbons; a blank ivory wooden plaque across the upper arch for text added by game code. A small pink first-anniversary heart/star emblem, NO letters/numbers. Rich crafted detail, delicate crisp pixel clusters, same cozy game art as reference, not flat vector blocks or photorealism. Fully transparent PNG canvas including the entire open archway interior; no scenery painted behind gate, no opaque rectangle, no ground platform, no path or backdrop. Tight comfortable margins, no clipping, complete roots/bases visible. The central opening should be WIDE (at least 40% overall gate width) and tall (at least 55% image height), unobstructed so a character can visibly walk through. Both posts should end on the same horizontal baseline. 1024x1024 square; true transparency.
