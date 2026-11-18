# 周年倒计时邀请函插画

内置 imagegen 生成的独立夜景，经等比缩小后以 1280×533 WebP 存放于 `src/launch/launch-cottage.webp`。邀请函从这里直接引用插画，精简构建可独立发布。

## 生成提示词

```text
Use case: stylized-concept. Standalone pixel-art illustration for an anniversary invitation in a cozy Japanese-inspired farming RPG. Wide horizontal landscape vignette, 2.4:1 ratio. A small vanilla-cream timber cottage, centered slightly right, with a dusty strawberry-pink shingled gable roof, glowing amber leaded windows, shut wooden front door, and a lantern beside its doorstep. At left a tiny curled-up pale pink fox under hydrangeas, pointed ears and white tail tip. Teal fir trees silhouette the rolling hills, a few stars and a small crescent in muted midnight-indigo sky, tiny white flowers, soft pool of porch lamplight across the grass. Polished hand-placed pixel clusters, clearly stepped square pixel edges like 16-bit pixel landscape, refined warm and cool contrast with lively but restful colors. Distinct uncluttered silhouette. View straight across the clearing at twilight. Full bleed edge-to-edge landscape, compose all meaningful artwork around horizontal center band so cropped panorama is beautiful too. No buildings other than the one cottage. No lettering, frames, borders, badges, banners, HUD, captions or watermarks.
```

## 手持邀请函的芙芙

小屋明信片的前景单独叠加芙眠眠半身立绘。参考 `ref/1.png`、`ref/3.png`，用 imagegen 绘制透明抠边原画，等比导出 `src/launch/launch-fufu.webp`（540 × 675）。窄屏可独立调整人物和小屋的构图。人物保留粉色长发、卷起的呆毛、观者右侧的爱心发夹，以及观者左绿右玫红的异色瞳；颈间的耳机与手里的草莓封印信封呼应晚安直播和周年邀请。

## 信封粉狐与随身听贴纸

两枚透明像素贴纸由内置 imagegen 独立绘制。将透明图集按左右分开裁去空白，保留奶油色纸边，导出为 `src/launch/launch-fox-letter.webp` 和 `src/launch/launch-player.webp`。

```text
Use case: stylized-concept. Asset: TWO separate die-cut pixel-art scrapbook stickers, one row of two equal cells on TRANSPARENT background with an extra-wide empty transparent center gutter and generous clear margins. Large, beautiful pixel-art clusters with dusky plum outlines, softly colored cream die-cut paper outlines. Sticker 1 (entirely in LEFT HALF): an adorable tiny blushing PINK FOX stuffed animal with fluffy white chest and white tail-tip, sleeping smile and pointed ears, sitting upright hugging a large cream sealed envelope with a small pink blossom wax seal. Pink ribbon bow behind one ear. Full fox, tail and envelope entirely contained in left half. Sticker 2 (entirely in RIGHT HALF): cute nostalgic compact STRAWBERRY PINK portable CASSETTE PLAYER with visible two-reel cassette window and cream buttons, analog cream/pink padded headphones loop around right side, coiled pink audio wire, tiny strawberry blossom mark on player. Both are front three-quarter view, packed but elegant pixel art made to match the soft fantasy world of a cozy Chinese VTuber anniversary RPG, limited strawberry milk palette with richness of rose/ivory/sage/lilac. No extra floating objects outside each sticker, no base surface, no scenery, labels, letters, words, numbers, marks, hands, humans, checkerboard or background. Clear CREAM die-cut stroke around each complete object. Genuine clean transparent alpha including all space between two objects. Do not join the two objects: center strip is fully transparent and at least 15% of full canvas width. Wide 2:1 composition, each beautiful isolated object exactly centered in its own half.
```
