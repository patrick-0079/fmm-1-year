# 勇气花园的贴地陷阱与萤火虫

本次调整将陷阱融入原有草地和桃色石路，保留四种挫折、靠近提示以及回床复活。地图、陷阱位置、存档 ID 和萤火彩蛋收集规则没有变动。

## 素材与绘制

- `src/assets/courage-path-props-v35.png`：内置 imagegen 生成的透明原画，2172 × 724。两件道具分别是带一小截旧缎带的松落花藤、表面带苔痕的低矮翘石。原画保留供后续修改。
- `src/assets/courage-path-props-v35.webp`：运行时两格透明图集，512 × 96，约 44 KiB。用 `node scripts/build-courage-art.mjs` 从原画裁切、缩放和无损压缩。旧版 `garden-traps` 不再用于运行时，不需重建旧图集。
- `src/trap-art.ts`：定义两格裁切及脚底接触轮廓。`ribbon` 是历史 ID，现在显示为「松落的花藤」。触发轮廓沿道具底部，叶尖和翘起的石面不形成额外隐形障碍。
- `src/garden-hazards.ts`：薄雾用错落的透明雾团和断续雾丝表现，保留下面的石路；卷叶风用错落落叶及短风痕表现。没有魔法光圈、统一椭圆阴影或上下悬浮的贴片。雾和风的可见范围围绕原来的圆形触发区域展开。
- `src/firefly-art.ts`：Canvas 原生绘制细翅、苔褐色虫身、米黄色腹光和小范围柔光。9 只组成夜间花园彩蛋，22 只散落花海，大小、亮度、速度和相位各不相同。保留减少动态效果的静止版本。

检查美术时，同时看白昼、星夜、普通游戏缩放与 390px 手机宽度。雾不能淡到不可辨认；风叶应区别于地面草纹。走近仍有「小挫折」文字提示：按屏幕尺寸保持至少 11 CSS px，绘于人物之上、陷阱远离玩家的一侧，每次只提示最近的一处。逐个实际触发四种陷阱，检查回床和小叶子便签；另核对脚底接触的前后左右，避免美术缩小而触发范围留在旧位置。

## 生成记录

使用内置 imagegen 编辑模式，透明背景。第一张参考是旧 `garden-traps.png`，第二张是当前勇气花园的白昼截图；第一张作为替换目标，第二张只约束风格。生成后仅做图集裁切和尺寸处理，动态雾、风及萤火虫由 Canvas 绘制。

最终提示词：

> Use case: precise-object-edit. Edit the first reference game sprite sheet into a replacement TWO-PROP atlas for the Courage Garden in the second reference (style/background context only). Remove all four old props and replace with exactly two isolated environmental props, side by side with generous transparent padding: LEFT a low, loose, curved fallen woody vine / thin root branch tangled with a few small muted olive-green leaves, 2 tiny cream flowers and ONE short faded dusty-rose ribbon caught in the vine (no big bow, no leaf heap). RIGHT a single low, broad, flat sandstone stepping slab with a subtly lifted chipped corner, a little olive moss in cracks and two tiny stone chips beside it. Both lying close to the ground, three-quarter overhead orthographic 2D game view, no tall boulder pile. Style matches the map's earthy cozy handcrafted pixel art: precise clustered pixels, soft natural peach sandstone, moss green and muted warm brown, understated contact shadow, organic irregular edges. Visually read as parts of a garden path, not magical collectible icons. No glowing outlines, no rings, no stars, no purple clouds, no spotlight, no pedestal, no background ground rectangle, no text, no labels, no UI. Transparent background, visible pixel texture at natural game scale. Horizontal wide atlas, two props fully separate, each about 2.2 times as wide as high, same apparent scale. Use the first reference only as an edit target; adopt the second reference's pixel-art texture and subdued environmental palette.
