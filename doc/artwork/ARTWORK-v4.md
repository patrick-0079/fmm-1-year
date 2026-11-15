# 地图内互动与昼夜版本素材记录

使用内置 imagegen；PNG 原图与 WebP 均保存在仓库，不依赖生成服务运行。旧版本素材保留。

## 勇气花园

`src/assets/courage-garden.png`，网页引用同名 WebP。

```text
Create a new 3:2 landscape pixel art background for a cozy top-down 2D chibi anniversary adventure game. It is the 'Courage Garden', a second garden connected to a celebration courtyard. Crisp detailed pixel art, oblique top-down RPG perspective, no characters, no text, no UI. Palette: vibrant mint and emerald greens, peach cobblestones, lavender shadows, coral pink flower accents, soft blue stream and golden lamps; colorful but not overwhelmingly pink. Layout for a 900 by 600 logical game map: lush decorative flowers, trees, low white fence and stream ONLY within the outermost 70 pixels around the perimeter. Main walkable area is a large unobstructed light green meadow with wide peach paths in a winding S from bottom center entrance at (450,550), past (250,420), (650,300), to a small flower arch at (450,100). Keep the whole interior x100..800 y100..530 empty of solid objects, buildings, tables, rocks, props, lamps or baked-in hazards: game code will draw the traps and checkpoint lamps. A few flat flower petals in grass are fine. At top center a small lavender floral arch sits at y45..85 above path, with a tiny blue cute television decoration, no letters. Beautiful warm dusk lighting with star string lights only on perimeter. This is a fully functional seamless game environment, not a framed illustration.
```

## 可交互小屋底图

`src/assets/room-interactive.png`，网页引用同名 WebP。编辑目标为 `src/assets/room-colorful.png`。只移除烘焙在背景中的蛋糕，保留桌面和其他家具，使游戏可以绘制可变状态的蛋糕。

```text
Precise object edit of the provided cozy pixel art room game background. Remove ONLY the strawberry birthday cake and its candle in the center of the round wooden table. Restore the empty wood tabletop and its lace doily underneath. Keep the little flower vase on the right of the table. Preserve every other pixel arrangement, room dimensions, framing, furniture locations, colors, lighting, rug, gifts, and decorations as closely as possible. No new objects, no text. The game will render an interactive cake on the now-empty center of the table.
```

## tree

保存位置：`src/assets/apple-tree.png`，网页引用同名无损 WebP。

```text
Use case: stylized-concept. Create ONE game-ready transparent-background pixel art sprite: a charming small FRUITLESS apple tree for a cozy top-down RPG garden. Orthographic elevated three-quarter top-down view, matching a richly detailed Stardew-like indie game, crisp square pixels, as if drawn at 64x80 then enlarged nearest-neighbor. Dense rounded irregular emerald and mint green leaf crown with clusters of individual pixel leaves, soft sunny highlights, lavender shaded dark green lower leaves, short warm brown trunk and a few exposed roots. No apples, no flowers on the tree, no ground, no grass, no scenery, no text, no frame. Whole tree silhouette visible, centered with transparent margins, roughly 4:5 width to height. True alpha transparency, not checkerboard. Not a geometrical block tree. This sprite will be about 64 by 70 game pixels and must blend with detailed pixel art garden tiles.
```

## cake

保存位置：`src/assets/anniversary-cake.png`，网页引用同名无损 WebP。火焰、吹灭、切开与分享由地图绘制逻辑控制。

```text
Use case: stylized-concept. Create ONE transparent-background birthday CAKE game sprite, no other objects. Cozy top-down pixel RPG style, orthographic slightly elevated three-quarter view matching richly detailed pixel art room. A small round strawberry cream anniversary cake on a delicate round white plate. Two visible bands of soft strawberry pink sponge with vanilla cream filling, cream scalloped icing, about six small red strawberries with green leaves on top, a single slim lavender candle at the center with NO FLAME (game code draws the flame). Fine pixel clusters, dusty mauve outlines, warm cream highlights, charming handmade pixel style as if drawn at 64x64 then nearest-neighbor enlarged. Do not draw scene, table, background, text, numbers, hands or utensils. Whole cake with candle and plate visible, centered with generous transparent margins. True alpha transparency. One sprite only.
```
