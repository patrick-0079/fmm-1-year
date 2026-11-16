# v57 · 苏颜来宾与正号十字星

## 苏颜素材

- 使用内置 imagegen，根据用户提供的 QQ 头像制作 `src/assets/suyan.png`，无损 WebP 为 `src/assets/suyan.webp`。素材留在项目内，不依赖临时图片路径。
- 保留大帽子、长护耳、短发、圆眼与扶帽笑脸。原参考是黑白图，新增配色采用奶白、燕麦和灰紫，与现有像素角色搭配。
- 1774×887，两格横排；左侧安静扶帽，右侧微抬手招呼。透明原图保留，每帧分别裁切并以脚底对齐，禁止拉伸或按大帽子的中心定位身体。
- `src/suyan-art.ts` 的 `suyanFrames` 记录真实 alpha 边界，`drawSuyan` 同时供地图和对白头像使用。`node scripts/build-community-art.mjs` 可从 PNG 重建 WebP。
- 地图中的苏颜独立于原三位花园来宾和小叶子，不替换任何已有定制剧情，不增加小镇十五人计数。其祝福与公开来信使用同一份原文。

## 正号十字星

`star-zhenghao` 保留原坐标、ID 和存档记录，增加 `shape: "cross"`。`src/credit-star-art.ts` 定义四尖暖金色像素星的轮廓和明暗，草地 Canvas 与星光瓶 SVG 使用相同像素。它是已有星星系统的代码原生形状变体，没有另生成位图。

卿取之于蓝及其他星星保持原样。正号触碰文字与其余尚未提供的寄语继续为空，拾取时只显示昵称和原有柔光效果；不显示占位文案。

## 验证

- `npm run check`：234 项测试通过，TypeScript 与 Vite 静态构建通过。
- 浏览器验证桌面 E、右键和点击对话，走远自动结束、读信后重新交谈；390px、320px 窄屏可阅读与收起，保留游戏画幅。
- 从 NPC 直接进入苏颜来信时，左侧标签列表会露出当前选中项；只调整列表自身滚动，不滚动网页。
- 正号按 E 拾取后只出现昵称和柔光；星光瓶由 8/9 增为 9/9，十字星轮廓正确，选中不显示空信纸。控制台无新增异常。
- 测试页 `/tests/suyan-fixture.html` 使用隔离标签页存档，可定位苏颜、正号星星与星光瓶；不修改真实玩家存档。

## 原始生成提示词

模式：内置 imagegen，透明背景。图 1 为用户提供的苏颜 QQ 头像；图 2 为 `src/assets/yeshenhua.png`，只参考像素画法和人物比例。

```text
Use case: stylized-concept. Asset: transparent sprite atlas of a new NPC named Suyan for a cozy chibi pixel village RPG. Reference image 1 is the ONLY character identity reference: cute girl with chin-length bob and straight soft bangs, huge round happy eyes, open cheerful smile, oversized soft plush winter hat with long earflaps, little stitched decorative emblem and pale fur patches; the adorable hand holding the hat is important. Reference image 2 provides ONLY the clean detailed pixel sprite art style, chibi body proportions, warm outlines and front three-quarter camera angle. Do NOT copy its cow horns, tail, red hair or clothing. Make Suyan recognizable as the girl in reference 1. Palette inferred gently from grayscale: cream plush hat with light oatmeal fur and gray-lilac earflaps, muted charcoal-lavender bob hair, gray-violet eyes; modest cream long-sleeved winter top under a gray-lilac pinafore skirt, stockings and small oatmeal ankle boots. Friendly wholesome expression, no sex appeal. TWO equal cells side by side in one row. Left pose relaxed standing, one hand lightly resting on hat brim; right pose same girl smiling wider and gently lifting one hand to adjust the big hat in greeting. Keep exact same head/body size, full-body height and identical feet baseline in both frames. Entire hat including long earflaps and both feet fully visible, generous transparent margins and gap. Crisp refined pixel clusters and strong readable silhouette at 44px height, no blur. True transparent alpha, no backdrop, checkerboard, ground shadow, floor, grid, letters, captions, or watermarks. Do not draw speech text. Two complete characters only, one row, no extra face portraits.
```
