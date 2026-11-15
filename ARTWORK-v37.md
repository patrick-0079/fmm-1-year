# 草莓心意礼盒 · 统一透视（v37）

## 调整目的

替换 v36 把旧盒身裁片、手绘盒口和手绘盒盖组合的方式。旧图层使用不同边线方向，且开盖时在画面内旋转，使盒盖看起来与盒身脱节。新版以同一视角的一套透明素材表现闭盒、无缎带闭盒、空盒与独立盒盖；开盖只抬升、平移和落下，保持盒盖原来的投影方向。

原始素材：`src/assets/gift-v37.png`。运行素材为 `src/assets/gift-v37.webp`，1536 × 1024，无损 WebP 约 888 KiB；`node scripts/build-gift-art.mjs` 重建时保持尺寸与透明通道不变。裁切、锚点见 `src/gift-art.ts`。PNG 原画留在仓库供修图，不进入生产部署包。盒身、纸衬和盖子的装饰直接包含在素材中，不再把旧盒子的纹理平铺到手绘多边形上。

在地图中，礼盒仍通过两次独立操作解开缎带，再揭盖、确认收礼。已经得到的缎带鞋不会重复发放。交互状态和存档沿用 v36；美术变化不清除玩家的进度。

## 验收

分别查看系带、无带、盒盖升起、盒盖移到旁边和收礼后的画面。核对盒盖与盒口的前角/左右角、鞋子与前壁的遮挡关系，以及礼盒、芙芙和右侧原场景礼物堆之间的间距。手机与桌面都保持原 3:2 画幅，操作提示不能遮住缎带或盒盖。

## 生成记录

使用内置 imagegen 生成透明图集，一次生成四个同款礼盒的状态，不使用 CLI。已查看的 `src/assets/room.webp` 仅作为美术与相机参考，不用作被编辑的背景。生成图为 1536 × 1024，四个单元共享相同光照与正交俯视方向。四周 RGB 有底色，但透明区域 alpha 为 0，实际绘制保持透明。

最终提示词：

```text
Use case: stylized-concept. Create a production transparent sprite atlas for ONE single exquisite strawberry gift box in FOUR matched states, replacing the pasted-looking gift in a cozy chibi pixel-art browser game. The supplied room image is STYLE AND CAMERA REFERENCE only; do not reproduce the room. 2 by 2 evenly spaced grid on true transparency, no background, no tile panels, no floor, no text, no frame numbers, no labels, no watermark. Each sprite fully separate, with generous transparent margins. All four sprites use EXACTLY the same orthographic three-quarter overhead viewpoint, all parallel edges follow identical screen angles. A square cardboard gift box, viewed from slightly above, top is a clean symmetric diamond: back corner high, left/right corners at identical height, front corner low; vertical walls straight vertical, aligned under matching rim corners. Box is modestly deep, not tall. Soft pink finely embossed wrapping paper with small strawberry and cream daisy motifs; cream piping on edges, delicately shaded paper texture, tasteful gold tiny accents. Warm light from upper left. Handcrafted detailed cozy pixel illustration, crisp clustered pixels, no blurry airbrush, no black heavy outlines, no flat vector patches.
TOP LEFT: complete closed gift with a beautiful dusty-rose satin bow and two tails atop the lid. Box and lid fit perfectly, lid overhang only very slightly on both sides. No giant loose loops sticking sideways.
TOP RIGHT: the EXACT SAME closed box, same size, same position within cell, same wrapping and shading, but with all satin ribbons removed. We see the neat decorated top surface of the lid. The top parallelogram, thickness, edge lines and base walls must align consistently.
BOTTOM LEFT: the EXACT SAME box and position, now OPEN, lid completely removed and not present in this cell. Its walls and visible outer wrapping remain unchanged. Clearly visible deep rose inner walls, delicate cream paper lining confined inside the rim with two small folded corners, central opening EMPTY to later place a reward. Do not put shoes, ribbon, stars or a second box inside. All front and side rim edges follow the same perspective as closed box.
BOTTOM RIGHT: ONLY the removed lid from top-right, no body. Exact same width and top diamond proportions, identical camera angle and orientation, resting flat; slightly thick edges and precisely matching cream border and wrapping design. No tilt, no rotation, no different perspective. Center the lid within cell.
The sprite geometry matters more than decorative complexity: ALL corners line up to one consistent pair of isometric axes, no mismatched slopes, no perspective shrinking, no pasted photographic tiles, no visible texture patchwork. Keep four matching physical parts/states of the SAME gift, usable for an opening animation.
```
