# 居民角色与剧情动作

## 花海营火来宾

派大星的四帧像素美术沿用第一次根据用户提供的形象图制作的较大头型。母图 `src/assets/patrick-camp.png` 为透明 256 × 256 图集，左上招手迈步、右上第二步、左下坐姿、右下递信。每格 128 × 128，脚点为 `(64,126)`。运行 `node scripts/build-community-art.mjs` 生成对应的无损 WebP。

游戏在首次绘制时将头尖与两眼中线对齐。从尖顶到眉眼上方的交界逐行放宽，接上原轮廓后缓存到绘制图集，四帧共用同一脚底锚点。派大星从 `(164,184)` 走至 `(216,179)` 坐下。减少动态效果使用原地坐姿和递信姿势。

图集由内置 imagegen 生成，用户提供的图片用于形象参考，小镇来宾图集用于像素画风参考。四帧统一使用同一头身比例，粉色尖头、两侧手臂和绿底紫花短裤清晰可辨。递信帧在右手画一封带红色封口的小信，坐姿帧的两只手自然放在腿边。

## 小镇三位来宾

内置 imagegen 使用定稿的三人概念图作形象参考，以 `town-npcs.png` 的俯视角度、像素描边和 Q 版比例作风格参考。生成图按真实透明轮廓裁切，清除边缘低于 24 的 Alpha 噪点，等比缩小后统一到同一脚底线。

母图是 `src/assets/town-guests.png`，格式为 384 × 256 像素、三列两行。每格 128 × 128 像素，脚点在格内 `(64,126)`。列顺序为小佑、故里、浅笑。上排是站姿，下排对应递橘子、扶围巾和举星牌。运行 `node scripts/build-community-art.mjs` 从母图生成无损 WebP。地图、对白头像和网页居民导览用同一图集，首次进入小镇或展开导览时载入。

### 三位来宾图集提示词

> Use case: stylized-concept. Create one production sprite sheet of six isolated original pixel-art NPC sprites on true TRANSPARENT alpha, a landscape 3:2 image, precisely three evenly spaced columns and two evenly spaced rows, wide transparent gutters around each figure. First attached image is the approved identity and clothing reference where left is Xiaoyou with round spectacles and an orange basket, center is Guli the apple mascot, right is Qianxiao the friendly card boy. Second image gives ONLY game sprite style, slight top-down front camera, fine crunchy pixel clusters, warm dark-brown outlines, compact oversized head and very short legs of existing sprites. Render the approved original identities in this exact chibi RPG scale instead of the long legs in the concept. Cohesive consistent palette and depth, strong readable outlines at about 46 pixels tall, pinprick face highlights and sprite shadows inside colors. Feet and props sharp, no ground shadow. No text, border, background, floor, translucent edge glow, graph, or decorative elements. The two poses of each identity must closely match head size, coat shapes, palette and exact foot position within their cells. Each cell is a single fully visible figure with its prop, nothing cut off.
>
> TOP ROW from left to right: idle full-body standing, arms relaxed near bag or basket.
> BOTTOM ROW from left to right: the exact same figures at the same scale, shown in small readable interaction poses, feet planted. Place all feet on a common line within each row (top around 45 percent image height, bottom around 95 percent). The apple mascot is around 68 percent of boys’ standing height, feet on that same baseline.
>
> LEFT COLUMN in both rows: kind boy with round spectacles, curly chestnut bangs, cream shirt under a golden-orange quilted vest, very short russet pants and boots. A small woven basket of leafy oranges supported on his viewer-right arm. Idle his viewer-left hand hangs relaxed or holds an orange near waist; action his viewer-left arm gently reaches forward holding one bright orange on the palm, shows it completely, visible orange clearly separate from chest and hand silhouette. Two feet, two arms. Retain glasses, basket and full body in action.
>
> CENTER COLUMN: a friendly coral red round apple as the body, tiny mitten hands and stubby brown boots, dark seed-bead eyes and small stitched smile, curled brown stem and one sage leaf, rosy cheeks. Cream kerchief clearly marked with one pastel pink fish brooch with triangular tail and an eye. Carries one small cream bakery carton with handle at viewer-right side. Idle facing front showing whole face and fish. Action gently lifts viewer-left mitten to hold the edge of the kerchief while turning only a little, showing fish clearly the whole time and carrying the bakery carton at side. Maintain compact red apple contour and leaf, no humanoid head.
>
> RIGHT COLUMN: kind shy boy, round warm violet-brown eyes, deep plum-black wine hair with curled tufts and one small honey-blond forelock. Short navy-purple knit cardigan, cream shirt, short plum pants, russet boots, teal crescent-stitch card satchel with one strap. Idle holds a small deck low near his waist. Action raises ONE navy card near viewer-left shoulder so the simple golden four-point star on the face is clearly visible with a small pale diamond center. Keep the other hand and satchel. Maintain feet in exact same place. Our original costume, motifs and original hair silhouette. No additional glow or sparks in the sheet (the game will add them).

## 勇气花园与回声遗迹的长者

内置 imagegen 参照镇民图集 `src/assets/town-npcs.png` 生成透明母图 `src/assets/elder-residents.png`。生产资源 `src/assets/elder-residents.webp` 在首次进入勇气花园或回声遗迹时随地图预载，由两张地图共用。运行 `npm run optimize:art` 可从母图重新生成 WebP。

图集采用三列两行。第一行从左到右为园丁爷爷蹲着拢土、扶膝招呼、抬手指路。第二行为遗迹守护者拄杖注视、举杖示意、低头祝福。地图和头像共用同一组立绘。每帧各有一个靴底锚点，伸手和敲杖时角色都站在原处。

### 长者图集提示词

> Create ONE transparent 3-column 2-row original sprite atlas for the same cozy top-down Chinese anniversary RPG as reference town-npcs.png. The reference supplies only hand-pixelled linework, nose/eye proportions, palette handling and camera. Six separate full-body drawings, extremely clear silhouettes, spacious gutters around each subject, no text, shadow, earth patch, background, panel, or grid lines. Each top cell is the SAME kindly OLD MAN: stocky elderly garden keeper with a floppy patched straw hat, a little fresh sprout in its brim, bushy white eyebrows shading his eyes, a short white moustache, moss green work apron, muddy short brown boots, worn hand shovel. Top left, crouching facing viewer-right, pushing soil with trowel just in front of himself. Top middle, standing gently stooped greeting the viewer, one hand on his knee, trowel by his boot. Top right, same standing grandpa turned half left, one hand open pointing the way along a garden path. Each bottom cell is the SAME elderly female ruin keeper: old kindly grandmother with a softly lined smiling face, short stature, deep BLACK hooded cloak with readable muted charcoal-violet folds and faded pearl cuff edging; two silver locks of hair under hood; simple knotted wood staff with a single small pale blue moonstone. Bottom left standing in gentle three-quarter view, holding her grounded staff and looking up. Bottom middle, turned to indicate the altar with her staff lifted at a slight angle, warm attentive face. Bottom right, bowing to a successful visitor, holding staff vertically lowered, its tip touching ground as she gives her blessing. Wholesome warm pixel portraits, large heads and small bodies like the reference. Render as production game sprites on a completely transparent alpha channel. Grid must fit a landscape 3:2 composition, three equal-width columns and two equal-height rows, no feet or props overlapping any cell edge. Characters maintain consistent head sizes and proportions across poses.

## 青芽的洋桔梗与小镇动作

内置 imagegen 生成洋桔梗透明原图 `src/assets/qingya-bouquet.png`，另参照 `src/assets/town-npcs.png` 生成动作母图 `src/assets/town-gestures.png`。运行 `node scripts/build-town-gestures.mjs` 生成同名 WebP。背包、花店和递花演出使用同一张花束图。动作图集按四列两行、每格 128 像素输出，同一角色保持脚底基线和身高。

第一行依次为栗栗空手等候、持白板和笔、伸出双手、翻出草莓画。第二行为绒月伸手抱抱、奶糖蹭手、奶糖向右走路的两个步态。游戏按页面绘制白板笔迹和瓷碟，把信封、相机和量衣尺等小道具摆在原镇民手边。

### 洋桔梗提示词

> Use case: stylized-concept. Asset type: one detailed hand-pixelled inventory icon of florist Qingya's keepsake, used in a tender chibi fantasy village RPG for Fufu's first livestream anniversary. Draw one whole small graceful hand-tied bouquet of fresh double lisianthus (eustoma). Four open rose-like ruffled flower heads, alternating creamy ivory with pale lilac, a darker lavender rim and lilac shade in the folds, two tapered upright green-and-lavender buds. Loose graceful sage green leaves and a few visible slender stems on the lower left tied with a fine pale rose-lavender satin ribbon with two curling ends. Flowers lean to the upper right so petals are visible. Organic layered blossoms readable at 24 px, whole object including stems visible, elegantly grouped, no wrappers, no pot, no hands. Old-fashioned cozy farming RPG pixel art, fine warm plum and sage-grey pixel outlines, natural green foliage, distinct petal clusters and gentle highlights, soft warm light from upper left, genuinely transparent alpha behind all parts including gaps between stems, single centered object with empty margin, square format. No text, watermark, badge, framing, stickers, panels, background, shadow or grainy noise.

### 动作图集提示词

> Use case: identity-preserve. Supplemental gesture sprites for the same cozy Chinese pixel RPG. Exact likenesses of the existing chibi villagers from reference sheet. Wide 4 columns x 2 rows, eight equally spaced individual full bodies on actual transparent background. Row one all the SAME brown-haired bakery girl from reference top row second, preserving her cream chef toque with heart, brown hair bun and white/pink apron. 1 resting pose NO CAKE, EMPTY hands clasped in front. 2 Holding a small blank ivory whiteboard with wood trim in one hand, fine teal marker in the other. 3 Empty palms held forward offering something, no plate or cake drawn (game will add it). 4 Proudly holding the board flipped with a little red strawberry drawn on it. Row two: 1 the original violet rabbit mascot from reference bottom row fourth, dark vest, pink bowtie, reaching RIGHT for a hug with open arms. 2 the fluffy cream upright town cat from bottom right with teal neck bow and gold bell, happily leaning its cheek toward the right. 3 and 4 the SAME upright cat walking to the right in side view, one leg forward and the other back in frame 3, legs switched in frame 4. Make poses distinct, feet visible and separated. Keep village's soft detailed pixel outlines, original eye colors, exact outfits and species. Each whole character centered in own equal cell with wide transparent gutters. No text, labels, shadows, dividers, checkerboard or environment. Intentionally three characters only, with a consistent scale per character.
