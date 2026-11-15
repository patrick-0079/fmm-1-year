# 纪念手账与锥形星光瓶（v44）

网页封面复用既有芙芙日常插画、直播插画、小镇、遗迹和花海底图；新的信封、照片纸边、纪念章与游园券由 CSS 绘制。标题和正文始终使用清晰系统字体。

星光瓶按最新要求采用锥形瓶，不使用宽腹罐子方案。原画 `src/assets/star-bottle-closeup.png` 为 1070 × 1470 的透明 PNG，清晰的细颈和斜肩向下展开，玻璃内部保留半透明（中部 alpha 约145）。运行图 `src/assets/star-bottle-closeup.webp` 裁掉外部透明留白后为 801 × 1204，使用无损 WebP 保留 alpha；运行 `node scripts/build-star-bottle-art.mjs` 重建。不要拉伸为宽腹罐子。

瓶内星星复用 `meadow-life-v16.webp` 左下方的落星精灵，与草地上的收藏物保持一致。只把真实收集的星星放入瓶内；透明星星按钮和图像使用同一定位。后续按用户要求取消分页，九颗星使用固定错落坐标、不同大小与轻微角度，同一瓶身内全部可见。手机可直接点星，也能用44px以上的「上一颗／下一颗」选择，再点「阅读寄语」；这两个按钮只选星，不隐藏瓶内其他星星。

## 生成记录

使用内置 imagegen，新生成锥形空瓶透明精灵。`meadow-life-v16.png` 仅作已有物件的像素画风参考，`night-meadow-v16.webp` 仅作夜景配色参考；未使用 CLI。最终输出保留在 `C:/Users/patrick/.codex/generated_images/01a19223-eccb-7b33-a445-e51d8f727202/exec-e2e2a5fe-da15-47a4-90fe-35600c76326f.png`，项目已复制母版。

最终提示词：

```text
Create ONE beautiful game-item sprite: a classic ERLENMEYER CONICAL GLASS FLASK with a small cork stopper, for a cozy pixel-art night meadow game. The references are style and color references only. True transparent background. Portrait composition, bottle width approximately 70 percent of its height. A narrow, clearly elongated vertical neck opens into two clean diagonal shoulders that widen downward into a broad flat rounded base: unmistakable laboratory conical flask silhouette, elegant and balanced, NOT a squat jar, rectangle, round potion bottle or fat horizontal bottle. A modest warm cork and a very fine twine bow around the neck. Handcrafted crisp pixel-art clusters and subtle dithered shading that match the supplied star and meadow sprites. Thin aqua-gray glass edges, cream moonlight glints and a small honey-gold reflection at the thick glass base. The interior is EMPTY clear lightly tinted translucent glass, to later place clickable stars; no liquid, stars, particles, numbers, graduation marks, labels or text anywhere. Avoid thick frosted borders and avoid a hard cut-out hole: the glass should look like delicate clear continuous glass with partial alpha, fine edge reflections only, not an outline frame. Keep almost the entire wide lower two-thirds of the flask visually unobstructed. Full object visible, lightly top-down almost-front orthographic perspective, little contact shadow beneath, generous enough transparent margin to avoid clipping. No environment, no ground rectangle, no painted checkerboard, no halo or bloom, no logo. One isolated detailed charming pixel flask on alpha, ready for a game object close-up.
```

资源经 Vite 导入后拥有内容散列文件名，并进入现有贴图缓存清单。生成母版不进入静态部署包。
