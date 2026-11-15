# 小屋台灯桌面修补（v45）

## 修改范围

移除了晚安小屋左侧书桌台灯底座下的白色网状蕾丝垫，改成干净的蜂蜜色木桌面与柔和灯影。灯罩、灯座、相框、信封、花盆、抽屉和椅子位置保持不变；没有改动中央圆桌或其他家具上的布艺。

- 母版：`src/assets/room-interactive.png`，1536 × 1024。
- 运行贴图：`src/assets/room-interactive.webp`，1536 × 1024，Sharp `quality: 90, effort: 6`；已有 `scripts/optimize-art.mjs` 可从母版重建。
- 原有 `src/world.ts` 与 `src/nature.ts` 导入路径继续使用。构建后的文件名含内容散列，并自动纳入贴图缓存清单，已访问的玩家会取到修补后的新资源。

## 生成与合成

使用内置 **imagegen** 图片编辑模式，未使用 CLI。编辑前查看完整房间原画，并提供书桌放大图帮助定位。最终生成输出为：

`C:/Users/patrick/.codex/generated_images/01a1df29-712c-7c02-b6fb-c0ba6f7c945c/exec-eb01ae69-cad8-48d5-8f05-d7cb29f0b72b.png`

为避免生成器对其他家具的细微重绘，只取最终生成图的 `(68,389,93,91)` 区域，用 Sharp 按原位置合回母版，边界用 4px 透明过渡。外部区域逐像素比较：**0 个通道发生变化**。没有用代码另画替代图案；运行文件不依赖生成目录或本机测试素材。

最终提示词：

```text
Edit IMAGE 1 (the full 1536x1024 bedroom). IMAGE 2 is ONLY an enlarged reference to identify the exact unwanted object on the left-hand writing desk. REMOVE COMPLETELY the spiderweb-like doily/netting under and in front of the golden desk lamp: the white tangled lines, scalloped corners, hanging white thread and pink/white woven patch immediately around the lamp base must ALL disappear. Replace all of that small cloth with clean bare honey-colored wooden tabletop continuing the surrounding wood grain. The lamp base must now sit directly on the wood with a simple soft golden contact shadow. NO cloth, mat, lace, web, string, threads or white outlines in this little patch. This correction must visibly change that desk patch; the previous edit left the entire unwanted white net unchanged. Keep the lamp itself, blue flowerpot, nearby purple-ribbon envelopes, photo frames and pink object exactly unchanged. Return the full bedroom at the same 1536x1024 composition as image 1, not the crop. Do not change any other part of the bedroom. Do not change the central coffee table's doily, cabinet's cloth, curtains, rug, bed, balloons, gifts, wall or floor. Pixel-art game background, no text or new objects.
```

## 检查

浏览器中确认台灯下方没有残余网纹，局部接缝不可见，地图保持 3:2（1440px 页面下画布为 1022 × 681.328 CSS px），没有 JavaScript 错误。完整截图与局部对比位于忽略提交的 `artifacts/v45-lamp/`，`desk-live.png` 为真实游戏中的修补效果。
