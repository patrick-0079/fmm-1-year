# 草莓软底鞋与拆礼物按键（v38）

## 操作

解开左边缎带使用 **1**，右边使用 **2**，两颗按钮分别标出对应数字并提供 `aria-keyshortcuts`。可以任意顺序解开；重复按已解开的那侧不会触发另一侧，长按也不连续推进。之后掀盖和收礼继续用 **E**。原有 E 按顺序辅助操作仍兼容，界面不再把左右两个按钮同时标成 E。

## 新鞋子素材

- 原画：`src/assets/strawberry-flats-v38.png`。内置 imagegen 基于原 `wardrobe-v11.webp` 顶排第三件鞋重新设计，单独输出透明鞋对。
- 礼盒与背包共用：`src/assets/strawberry-flats-v38.webp`，640 × 489，无损 WebP。圆头平底、淡粉鞋面、奶油鞋底、粉白格纹搭带、布蝴蝶结与小草莓。没有原先的高跟和交叉绑带。
- 构建：`node scripts/build-strawberry-shoe-art.mjs` 裁掉透明外边距、保持比例缩至 640px 宽；原 PNG 不进入生产包。
- 佩戴层：`src/assets/fufu-footwear-v38.webp`。通过 `node --experimental-strip-types scripts/build-shoes.mjs` 生成，继续追踪角色原画的脚部轮廓与锚点，只更新草莓鞋配色、奶油底边与小饰纹。所有帧 alpha 与旧版一致；星月旅行鞋的非透明像素保持一致。睡觉时按原规则隐藏。
- `src/item-art.ts` 的 `drawItem` 统一绘制礼盒、背包格子及详情中的新鞋。图标就绪回调等待原衣橱图和新鞋图加载完成，避免新资源慢到时留下空白格。
- `ribbonShoes` ID、完成记录与装备槽不变，旧存档可直接使用。

## 验收

用真实 HUD 按钮、数字键、Tab / Enter、E 各走通解带、掀盖与收礼；在 320、390px 模拟触屏和桌面确认按钮无裁切。逆序按 2 再按 1，重复同一侧、长按、打开暂停界面时按数字都要检查。对比礼盒与背包的新鞋，并查看角色四向三帧、坐姿及睡姿；脚间的透明缝隙不得被填满。

## 最终生成提示词

使用内置 imagegen 编辑模式、透明背景；参考图片已先检查。没有使用 CLI/API 图片生成。

```text
Use case: precise-object-edit. Redesign ONLY the pink shoes (third item in the TOP row of the reference inventory atlas) into a new standalone pair of much cuter shoes for a sweet pink-haired chibi character in a cozy pixel-art game. The source atlas is an edit target for the shoes and a style reference; do not include any of the other clothes, bags or animals. Output ONE PAIR of shoes isolated on a truly transparent background with generous empty margin, no text, frame, labels, floor, ground patch or cast shadow.
Design: small rounded-toe FLAT Mary Jane shoes, soft short chubby silhouette, delicate strawberry-milk pink fabric/satin uppers, thin cream-colored flat soles with tiny stitched edging, softly padded cream inner lining, one simple broad strap on each shoe. A small fluffy fabric bow on each toe with a cute red strawberry button and two tiny sage-green leaves at its centre. A restrained gingham accent on the straps, little cream scalloped trim. Wholesome plush-toy-like charm, wearable comfy flats, not formal heels. Absolutely no raised heels, no pointed toes, no long ankle ties, no criss-cross straps, no large metallic hearts or chunky gold buckles, no bunny ears, no feet or socks. Both shoes match exactly as a real left/right pair, naturally next to one another with a small gap, three-quarter overhead view looking toward rounded toes, not one upright and one sideways. Match the delicate textured cozy pixel illustration of the reference but refine the craft: precise clustered pixels, tender pastel shading, legible silhouette at icon size, careful stitching and soft bow folds, no blurry glow or black outlines. Horizontal composition, pair together about 1.3 times as wide as high, pastel pink with cream and small strawberry red/green accents.
```
