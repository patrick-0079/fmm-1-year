# 周年小镇、居民与纪念品素材

本轮使用内置 imagegen 生成原创素材。参考[《星露谷物语》官方媒体页](https://www.stardewvalley.net/media/)中的温暖像素配色、自然街道与乡镇生活氛围，没有使用该游戏的图片、角色或地图素材。人物仍以芙芙粉发睡衣的周年小世界为主题。

PNG 原图保留在 `src/assets/`，网页使用本地 WebP；没有远程运行时素材依赖。小镇的第一份规整布局候选未采用，最终使用第二版的错落街巷、台阶、分岔小路、溪流与独立院落。

## 晚安周年小镇（最终版）

原图：`src/assets/anniversary-town-v2.png`；网页：`src/assets/anniversary-town-v2.webp`。地图逻辑尺寸为 1536 × 1024，碰撞与互动位置见 `src/town-map.ts`、`src/town-data.ts`。

```text
Create an ORIGINAL large cozy top-down pixel RPG village map for a pink-haired ASMR vtuber's first livestream anniversary. Landscape 3:2, whole playable world equivalent to 1800x1200 logical pixels, no horizon, no characters, no UI or readable text. Warm detailed farming-life pixel RPG aesthetic with earthy emerald greens, honey wood, cream plaster, stone paths, teal stream, lavender/coral pink/gold celebration accents, crisp square pixel clusters. The TOWN LAYOUT MUST BE ORGANIC, ASYMMETRIC AND STAGGERED with winding interconnected streets, intersections, bends, small garden lanes and distinct neighbourhood corners, like a lived-in village, NOT a row/column grid, NOT a ring of shops facing a central circle, NOT symmetrical. A main cobblestone street enters at bottom-left of center around (520,1140), bends gently through (580,860), branches at (800,600), continues diagonally through (1100,380) toward upper-right (1500,160). Secondary lanes wind between cottages with varied setbacks and orientations, connect to a wooden bridge across the far-right creek, and create little green side courtyards. SIX different shops scattered at different elevations: flower shop roughly (330,240) with porch at y370, sage roof and tiny side greenhouse; bakery roughly (850,180) with porch at y330, honey roof and strawberry cake emblem; accessories shop roughly (1350,410) with porch at y560, lilac roof and star emblem; postal cottage roughly (260,730) with porch at y880, coral roof and envelope emblem; photo/bookshop roughly (940,870) with porch at y1020, weathered teal roof and book emblem; radio cottage tucked at (1490,930) with porch y1080, blue roof and moon emblem. Keep buildings separated by clear streets, not six evenly arranged blocks. A SMALL irregular heart-paved anniversary plaza around (850,570), connected to streets instead of isolated central circle. Leave four open grassy/cobblestone pockets around (600,430),(1080,590),(500,760),(1240,810) for game code to add arcade stalls; DO NOT draw arcade stalls. Paths should be at least 55 logical pixels wide. Rich trees, varied fences with gates, flower gardens, a small pond, wooden benches and lampposts at street corners, but no clutter in walking routes. Creek meanders on rightmost edge with a bridge around y680. Some staggered terraced planting and a few steps in peripheral gardens, flat accessible main roads. Warm bright neutral late-afternoon lighting; game will add night lighting. Anniversary bunting and delicate star/heart motifs integrated into village corners. No letters, labels, numbers, no characters or animals. Beautiful dense pixel textures, distinct neighbourhood personality, readable walkable map.
```

## town-npcs

原图：`src/assets/town-npcs.png`；网页使用同名 WebP。15 名居民均为原创虚构游戏角色，按实际轮廓裁切，元数据见 `src/town-data.ts`。

```text
One production transparent-alpha pixel RPG NPC sprite atlas. EXACTLY 15 separate chibi town residents in a precise FIVE COLUMNS by THREE ROWS grid. Every sprite is entirely inside its cell with wide transparent margins and clear gutters; no overlapping or touching neighbouring sprites, no labels, no text, no ground, no shadows. Same pixel style, scale and two-head-tall proportions across all characters, facing down/front in friendly idle pose. Crisp hand-placed low-resolution pixel clusters as if each sprite is 32x42 pixels, enlarged nearest-neighbor, warm dark brown outlines; cozy farming-town pixel aesthetic with pastel anniversary accessories. These are original fictional townsfolk for a pink-haired vtuber's one-year anniversary town, not versions of the same heroine. Row 1 left to right: teal-haired florist in sage apron with flower pin, brown-haired pastry chef in cream hat holding small cake, auburn-haired post lady in coral uniform with mail bag, violet-haired accessory maker in lavender overalls, navy-haired radio host with headphones. Row 2: light-brown-haired bookkeeper with round glasses, mint-hoodied arcade attendant with tiny star badge, coral-haired arcade attendant with striped scarf, short dark-haired arcade attendant with pale blue hoodie, blonde arcade attendant with lilac cardigan. Row 3: visitor with silver bob and cream dress, visitor with chestnut curls and yellow sweater, visitor with blue braids and pink bow, a small upright lavender bunny mascot in a little vest, a small upright cream cat mascot with teal neck ribbon. Each must have visible full body, hands and feet. No actual game franchise characters. EXACTLY 15 clean isolated sprites in 5x3 layout.
```

## reward-icons

原图：`src/assets/reward-icons.png`；网页使用同名 WebP。四个饰品按实际轮廓裁切，元数据见 `src/item-art.ts`。

```text
One transparent-alpha pixel art item atlas with EXACTLY FOUR distinct anniversary wearable souvenirs arranged in a regular TWO BY TWO grid, each isolated in its quadrant with generous transparent gutters, no text or labels. Detailed cozy farming RPG inventory icon pixel style, warm outlines and clear colourful silhouettes, 48x48-pixel style enlarged nearest-neighbor. Top left: a strawberry-pink and golden star candy HAIR CLIP with tiny mint ribbon. Top right: soft lavender and cream over-ear HEADPHONES with tiny gold stars and one small heart on the earcup. Bottom left: adorable cream moon-bunny BACKPACK with rabbit ears, lavender moon patch and pink bow, front/backpack product view, no person. Bottom right: a pair of small pale-blue and lavender star WING HAIR ORNAMENTS joined by a little golden crescent and pink ribbon, wearable head accessory. These are rewards for arcade games in a pink-haired ASMR vtuber first-anniversary town. Rich subtle pixel shading, no scenery, no character, no frame, genuine alpha.
```

## garden-traps

原图：`src/assets/garden-traps.png`；网页使用同名 WebP。四种自然花园小挫折，保持轮廓比例绘制；触发范围独立于透明边缘。

```text
Create ONE transparent pixel-art game-prop atlas with EXACTLY FOUR natural, polished obstacle sprites in a TWO BY TWO grid, isolated with wide transparent gutters. Cozy detailed top-down farming RPG aesthetic, warm stone/wood/leaf colours with lilac and pink anniversary accents, crisp square pixels and rich tiny texture, no UI, no text, no warning symbols, no dashed rings, no cartoon faces. Top left: a low tangle of pink/lavender gift ribbon among fallen leaves and tiny cream flowers, a believable little trip hazard on a garden path. Top right: a small irregular moss-covered bluish grey rock cluster with roots, a tiny wildflower and warm earth around its base, low natural silhouette. Bottom left: a wispy pale-lavender patch of enchanted evening mist weaving through fallen petals, translucent curls, subtle star specks, delicate rather than solid circles. Bottom right: a graceful little spiral gust made of swirling mint leaves, dry golden leaves and pink petals, a few tiny curved wind streaks, natural and readable on grass rather than geometric ellipses. Each entire sprite visible in its own quadrant, no black/white/checkerboard backdrop, genuine transparent alpha. Designed to integrate into a vtuber anniversary flower garden.
```

## 代码绘制与修复

烟花使用多组饱和的粉、紫、青、金、橙粒子，并避免叠加混色洗成白色。四个经典小游戏和街边摊位由 Canvas 绘制，通关奖励为星糖发夹、晚安星星耳机、月兔背包和星翼发饰。夜景使用蓝色夜幕遮罩和暖色局部光晕；灯源从完整夜幕中挖出光池，让灯下的石路、花朵保留颜色。树木、果实、NPC、座椅和人物按脚底位置绘制，睡姿头饰采用独立位置与旋转。蛋糕切完不再绘制错误的扁平三角覆盖物。
