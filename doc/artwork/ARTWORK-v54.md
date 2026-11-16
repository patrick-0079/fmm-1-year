# v54 · 小叶子大猫玩偶与夜神华

本轮增加可以拥抱的小叶子，并将晚安电台主持夜弦的显示名和形象换为夜神华。原有用户定制对白和角色功能保留。

## 素材与出处

两张透明母图均使用内置 imagegen 生成，采用当前游戏的可爱像素角色画风。PNG 保存原始透明通道，WebP 是游戏实际使用的同名压缩资源；不是以代码形状临时替代人物，也没有修改其余镇民共用的原图集。

| 文件 | 尺寸与排列 | 用途 |
| --- | --- | --- |
| `src/assets/xiaoye-plush.png`、`src/assets/xiaoye-plush.webp` | 1536×1024，2 列×2 行；每格 768×512 | 小叶子白天站立、白天拥抱、提灯站立、提灯拥抱 |
| `src/assets/yeshenhua.png`、`src/assets/yeshenhua.webp` | 1774×887，2 列×1 行；每格 887×887 | 夜神华的两种姿态，供地图与头像共用 |

裁切必须分别使用原图的列宽和行高。小叶子的格子不是正方形，不能用 `width / 2` 代替每格的高度；每帧按照实际脚底位置对齐，抬手和拿灯时不得上下漂移或横向拉伸。压缩 WebP 时保持原尺寸、透明通道与格间留白。

### 小叶子的美术意图

一只温和的大猫猫玩偶，轮廓圆润、身体软乎乎、表情友善。体型大于普通小动物，但不使用尖牙、张大的黑嘴、凶狠目光或压迫性的姿势。白天双爪自然放着，安静站在花园里；天黑时拿一盏小提灯。拥抱姿势张开柔软的前爪、身体稍微靠近，保留脚底落点。灯光使用柔和暖色，依然能辨认猫脸、玩偶接缝与四肢。

四帧属于同一个角色，脸型、配色、身体比例、脚底基线保持一致；提灯帧与无灯帧应能直接切换。游戏在原有地图画幅内完成动作，文字继续采用清晰字体。

### 夜神华的美术意图

红紫色的小牛娘，使用小牛角、牛耳和温柔神态识别角色。服装、头发与配饰以红色、紫色为主，保持小镇居民的 Q 版比例与细致像素边缘。地图立绘、对白头像、网页导览头像使用同一份新素材，避免只有地图改了形象、对话框仍显示旧角色。

她接替原夜弦继续担任晚安电台主持。名字与外观变化不影响用户定制的提问、两个回答分支和「作者的话」。角色 ID 保持 `radio-host`，来访记录、导览入口与原位置沿用。

## 地图与行为

- 小叶子位于周年花园 `(330,315)`，靠近点 `(354,327)`，热点 ID 为 `xiaoye-plush`；站在广场西入口北侧草地。最初的 `(360,340)` 挡住了横向通道，通路测试发现后已调整，`y=340` 的路保持畅通。
- 清晨、白昼使用无灯姿势；黄昏 `dusk` 和星夜 `night` 使用提灯姿势，暖光跟随灯的位置。
- 点击、E、右键和触屏均走现有互动入口。动作提示为「抱抱小叶子」，拥抱只是一段短暂演出，可以直接走开或收起。
- 不增加奖励、收集项目或存档字段。刷新后不需要恢复拥抱中间帧；小镇居民计数仍为 15。
- 原三位花园来宾、15 位小镇居民、园丁和守护者都有定制对白，因此本轮不删减角色。花园来宾复用部分原镇民外观，不构成删掉其剧情的理由。

## 验收要点

1. 复核每帧 alpha 边缘、格间留白、脚底和提灯位置；地图、头像、网页导览不残留旧夜弦形象。
2. 白昼→黄昏→星夜→清晨切换时，小叶子正确取放提灯，拥抱中的切时也不跳帧、不改变人物比例。
3. 键盘、鼠标、触屏分别走近并拥抱；快速连按、走开、开包、开说明、切图、复活和清档时没有残留动作或操作锁。
4. 小叶子附近可正常绕行，寻路不穿过玩偶脚底、不抢占相邻来宾和出口的互动；昼夜光照和减少动态效果下仍清晰可见。
5. 用旧存档检查夜神华保留 `radio-host` 来访记录；重走电台两分支，完整保留用户提供的文案。

### 本轮验证结果

- `npm run check`：218 项测试通过，TypeScript 与 Vite 静态构建通过。
- 1440、390、320px 浏览器试玩：键盘、点击、右键与触屏拥抱；走远收起、开包后移动、昼夜姿势、夜神华全部四条分支及三处形象一致。画幅保持 3:2，没有脚本异常。
- 普通与减少动态效果模式：连续六次交互、按住 E、切图返回、夜间从另一侧拥抱均通过。拥抱不改收藏或存档进度。
- 生产构建在桌面和 390px 触屏宽度复测：两位角色正常交互，旧 `radio-host` 记录仍为已认识，收起后可以立即行走。
- 新玩偶周围全部现有花园互动点仍可寻路到达，广场横向通路与新脚底碰撞均通过回归检查。

## 原始提示词

生成模式：内置 imagegen，参考 `src/assets/town-npcs.png` 的画风，透明背景。生成结果以实际尺寸裁切，不假设工具完全遵循提示中的方形格子。执行 `node scripts/build-community-art.mjs` 可从 PNG 重建无损 WebP。

### 小叶子

```text
Use case: stylized-concept. Create a production sprite atlas for a cozy top-down chibi pixel RPG. Input reference town-npcs.png provides ONLY drawing style, chunky pixel contours and camera angle, not the identities or backdrop.
ONE CHARACTER in FOUR whole-body poses, exact 2 columns by 2 rows of equal SQUARE cells, generous transparent gutters. Warm, very friendly large upright CAT PLUSH TOY named Xiaoye. Soft rounded cream fur, pale warm oatmeal patches on ears and tail, pudgy body, short plush paws, small kind embroidered dark-brown eyes, little smile, pink cheeks, a sage green ribbon with one leaf-shaped charm, a visible but subtle plush seam on a round belly. Cuddly toy roughly 1.4x a human chibi in game, NO teeth, claws, menacing eyes, costume face holes or spooky stitched grin. Simple enough to be legible at 55px height, refined detailed pixel clusters, warm plum-brown outlines. Same head/body size and same feet baseline in every cell.
Top left: standing quietly in a three-quarter front view toward viewer-right, paws resting naturally at belly, smiling eyes open.
Top right: same body facing slightly right, eyes gently smiling, both short paws reaching outward toward the right in a soft inviting hug, no second character.
Bottom left: same idle cat, holds a small elegant warm amber camping lantern by a short handle in its LEFT paw (viewer-left), lantern beside body and above ground, no large glow halo drawn into transparency.
Bottom right: same cat and lantern held on viewer-left, right paw reaches out to viewer-right for a hug, gently closed smiling eyes.
True transparent alpha background, including between arms/lantern and body; NO checkerboard, floor, drop shadow, labels, borders, grid, text, scenery, additional characters, watermark. Sharp pixel illustration as reference, no blurry edges. 2x2 sheet, all four poses fully visible with wide margins.
```

### 夜神华

```text
Use case: stylized-concept. One original NPC sprite atlas for the same cozy top-down chibi pixel village RPG as the reference town-npcs.png. Reference is style and camera only, do not copy any existing character.
A friendly adult young woman cow-girl named Yeshinhua, red and purple theme. Chibi proportions (large head, small fully clothed body), soft wine-red hair with plum-purple shaded tips in a loose shoulder-length bob, TWO small rounded ivory cow horns, soft rounded cow ears with lavender inner ears, bright violet eyes, gentle smile. A little purple ribbon at one ear. Wholesome modest cream blouse with long puff sleeves, deep berry-red pinafore dress to knees with tiny lavender trim and pocket, plum tights and short burgundy lace-up boots, slender cow tail with a soft dark-purple tuft. Avoid excessive cow spots, no udder design, no cleavage. Cozy daily wear, polished and cute.
Two equal SQUARE cells arranged side by side in ONE ROW, same exact body size and feet baseline, transparent gutters. Left cell: relaxed three-quarter front view, hands clasped in front, kindly attentive. Right cell: same character softly raises one hand in a friendly greeting. Each complete body with horns, tail and both shoes fully visible, centered with ample room. Natural clean hand-pixelled warm plum outlines and delicate 2D sprite shading matching the reference's pixel style; crisp pixels readable at 42px in the game. True transparent alpha, NO scene, shadows, grey backdrop, checkerboard, grid, text, labels, watermarks, microphone or separate props.
```

## 夜神华补充对白

原有电台提问、两条回答及作者寄语完整保留，新增以下两条可选支线，均可选「再聊聊电台」返回：

- 「你的小牛角好可爱」→「嘿嘿，谢谢！我给它们系了紫色的小丝带。走路时会先看看树枝，免得把丝带挂住。」
- 「电台开播前会做什么？」→「去草地上散一小会儿步，听听风吹过叶子的声音。再把麦克风摆正，给大家送一声软软的晚安。」
