# 晨露花与场景修正

晨露花使用内置 `image_gen` 工具新生成，透明背景。选定原图复制到 `src/assets/morning-dew-flower.png`，网页使用保留透明度的 `morning-dew-flower.webp`。花朵在两座花园的清晨彩蛋位置显示，替换旧圆形占位图。

最终提示词：

> Create a single finished transparent-background game sprite for a cozy pink anniversary pixel-art garden RPG for a pink-haired virtual streamer. Subject: a delicate morning-dew flower cluster, three small pale ivory and blush-pink bell-shaped blooms, pale aqua teardrop dewdrops on the petals and curved sage green leaves, a few tiny turquoise morning sparkles, rooted in a tiny natural tuft of grass. High quality detailed hand-pixelled warm farming RPG aesthetic, crisp pixel edges, top-down three-quarter view, small readable silhouette. One standalone cluster centered on transparent alpha with ample empty margin. No pot, no circle background, no pedestal, no square center, no UI, no text, no letters, no watermark. Soft pink, cream, sage and aqua accents; integrate naturally into a lush pixel garden. Intended to display as a 32 by 36 game-world sprite, so keep structure readable.

四座游乐摊位继续采用原生 Canvas 绘制，统一木作、遮阳棚、灯泡与周年铭牌，并以四种小游戏图案区分。文字使用系统无衬线字体。窗景只覆盖实际玻璃区域，窗台处按原图的天空颜色建立遮罩，保留窗框、窗帘和花朵；夜晚保留原图月夜。南侧回花园路牌移到周年拱门左侧，消除原来遮住右侧立柱的重叠。

本地 `/tests/scenery-fixture.html` 可对照四个时段的窗景、晨露花与四座摊位；验收页不包含在生产构建中。
