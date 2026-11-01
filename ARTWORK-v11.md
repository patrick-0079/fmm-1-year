# 一周年互动与衣橱素材

本轮使用内置 `image_gen`，生成两张真正透明背景的像素图集。原始 PNG 保留，网页使用同尺寸 WebP（Sharp quality 92、alphaQuality 100，不缩放、不裁切整图）。素材文件：

- `src/assets/party-props-v11.png` / `src/assets/party-props-v11.webp`：1536 × 1024，四只气球与四只周年礼盒。
- `src/assets/wardrobe-v11.png` / `src/assets/wardrobe-v11.webp`：1774 × 887，两件上衣、两双鞋、两只包和两只小宠物。

两张图均按左到右、上到下分成八件主体，无文字、数字或标签。为了容纳完整缎带和不同物件比例，生成图中的行高、列间留白略有变化，运行时应使用下面的精确裁切帧，不应直接按均等 4 × 2 格裁切。

透明度检查：四角 alpha 均为 0。某些图像查看器会显示全透明像素中残留的彩色 RGB 条块；它们不会被 Canvas 绘制。裁切框由 alpha ≥ 100 的主连通区域求得，并外扩 2 像素保留柔边。气球的绳尾、礼盒和宠物四肢均包含在框内。

## 帧清单

```json
{
  "party": {
    "src": "src/assets/party-props-v11.webp",
    "size": [
      1536,
      1024
    ],
    "frames": [
      {
        "id": "heartBalloon",
        "x": 39,
        "y": 46,
        "w": 302,
        "h": 531
      },
      {
        "id": "starBalloon",
        "x": 421,
        "y": 28,
        "w": 313,
        "h": 551
      },
      {
        "id": "aquaBalloon",
        "x": 831,
        "y": 55,
        "w": 264,
        "h": 523
      },
      {
        "id": "bunnyBalloon",
        "x": 1218,
        "y": 21,
        "w": 270,
        "h": 586
      },
      {
        "id": "pinkGift",
        "x": 14,
        "y": 593,
        "w": 370,
        "h": 404
      },
      {
        "id": "mintGift",
        "x": 406,
        "y": 606,
        "w": 352,
        "h": 386
      },
      {
        "id": "moonGift",
        "x": 780,
        "y": 607,
        "w": 363,
        "h": 391
      },
      {
        "id": "creamGift",
        "x": 1164,
        "y": 614,
        "w": 361,
        "h": 387
      }
    ]
  },
  "wardrobe": {
    "src": "src/assets/wardrobe-v11.webp",
    "size": [
      1774,
      887
    ],
    "frames": [
      {
        "id": "anniversaryDress",
        "x": 17,
        "y": 67,
        "w": 409,
        "h": 378
      },
      {
        "id": "mintCape",
        "x": 439,
        "y": 105,
        "w": 455,
        "h": 317
      },
      {
        "id": "ribbonShoes",
        "x": 908,
        "y": 96,
        "w": 412,
        "h": 357
      },
      {
        "id": "moonShoes",
        "x": 1360,
        "y": 88,
        "w": 399,
        "h": 366
      },
      {
        "id": "strawberryBag",
        "x": 35,
        "y": 477,
        "w": 405,
        "h": 369
      },
      {
        "id": "rabbitPet",
        "x": 486,
        "y": 492,
        "w": 383,
        "h": 345
      },
      {
        "id": "kittenPet",
        "x": 945,
        "y": 466,
        "w": 391,
        "h": 386
      },
      {
        "id": "bunnySatchel",
        "x": 1360,
        "y": 467,
        "w": 384,
        "h": 384
      }
    ]
  }
}
```

## 派对图集提示词

Use case: stylized-concept. Asset type: one coherent transparent sprite atlas for a cozy pink-haired virtual streamer's first livestream anniversary pixel RPG. Generate exactly 8 isolated, beautiful, hand-pixelled party props in a strict equal 4-column by 2-row grid, row-major ordering. Transparent alpha background across the whole atlas, no panels, no frames, no labels, no numbers, no lettering. Every sprite centered inside its own equal cell with 15% empty margin, no sprite crossing a cell boundary. Top row from left to right: a strawberry-pink HEART balloon with a delicate curling ribbon string; a warm cream STAR balloon with delicate gold ribbon string; an aqua ROUND balloon with pearl highlights and a narrow flowing ribbon string; a lavender BUNNY-EAR balloon with a small cream bow and ribbon string. Bottom row from left to right: an elegant strawberry-pink gift box with satin bow and tiny flower charm; a mint gift box wrapped in fine golden ribbon; a lavender gift box with star-and-crescent charms and a pearl satin bow; a cream gift box with a powder blue bow and a tiny heart tag. Rich but gentle pixel shading, luminous satin highlights, clean silhouettes, tasteful gold details, charming and festive rather than flat basic shapes. Warm detailed farming-game pixel-art aesthetic, cream outlines and dusty pink/teal/lavender palette. Three-quarter top-down game prop view for gift boxes; balloons face camera with slight volume. No cast backdrop shadows and no background shapes. Must look like keepsakes for a gentle, cozy first-anniversary party.

## 衣橱图集提示词

Use case: stylized-concept. Asset type: one coherent transparent sprite atlas of anniversary wardrobe rewards and tiny companion pets for a cozy pink-haired VTuber pixel RPG. Exactly 8 isolated polished hand-pixelled sprites in a strict equal 4-column by 2-row grid. All cells equally sized, each item fully within its own cell with at least 15% transparent margin. Row-major ordering: TOP row left to right: 1) a sweet strawberry-pink anniversary DRESS with cream ruffled sleeves, mint bow at the collar and small gold heart brooch, clothing only, empty neckline, no body or mannequin; 2) a soft cream-and-mint short CAPE TOP with scalloped hem, tiny pink bow and gold star clasp, clothing only; 3) a PAIR of pastel pink ribbon Mary Jane SHOES; 4) a PAIR of cream-and-lavender star-and-moon SHOES. BOTTOM row left to right: 5) a small strawberry-shaped pink BACKPACK with green leaves, pearl zipper and heart clasp; 6) a cute tiny whole-body white LOP-EARED RABBIT companion with pale pink inner ears and a little mint bow, three-quarter top-down view, sitting/standing naturally on all paws; 7) a cute tiny whole-body cream-and-dusty-pink KITTEN companion with a small lavender neck ribbon, same three-quarter top-down game view and natural four paws; 8) a cream bunny-themed CROSSBODY BAG with a small flower wreath around its bunny face, mint strap and pink ribbon. Rich yet readable warm farming-RPG pixel art, detailed soft fabric and pixel-shaded fur, crisp edges, gentle cream/pink/mint/lavender/gold color palette, design matched to cute flower wreaths and starry anniversary keepsakes. Truly transparent alpha background. No letters, no writing, no labels, no numbers, no panels, no frames, no mannequin or human body, no extra objects.


## 草莓奶油蛋糕切片

追加使用内置 `image_gen` 生成一个独立切片，用于切蛋糕与吃蛋糕过场。参考已查看的 `src/assets/anniversary-cake.webp` 的细腻暖色像素质感；新图不是对原图的编辑。

- 原图：`src/assets/cake-slice-v11.png`。
- 网页图：`src/assets/cake-slice-v11.webp`（quality 92、alphaQuality 100，保持原尺寸与 alpha）。
- 尺寸：1312 × 1199。四角 alpha 均为 0。
- 可见区域（alpha ≥ 64）的真实包围框：`{ "x": 47, "y": 58, "w": 1222, "h": 1091 }`。
- 建议运行时含 2px 柔边的裁切框：`{ "x": 45, "y": 56, "w": 1226, "h": 1095 }`。

提示词：

Use case: stylized-concept. Asset type: a single transparent-background food sprite for a cozy pink first-anniversary pixel RPG. Create exactly ONE elegant triangular wedge SLICE of strawberry cream cake resting on a small cream-white porcelain dessert plate with a fine blush-pink rim. Three-quarter top-down game view, showing the cut front faces clearly: fluffy vanilla sponge layers, pale pink strawberry filling, thin vivid strawberry jam, smooth ivory cream icing. The top has one ripe strawberry with tiny green leaves, a delicate piped cream rosette, a few tiny edible golden anniversary stars. The cake slice is a generous individual portion, not a complete round cake. Fine hand-pixelled warm farming-RPG art, carefully shaded cream, blush pink, strawberry red, and soft gold, crisp pixel edges, a soft gentle cozy celebratory feeling. Match delicate pastel pixel-art strawberry anniversary cakes, readable at small in-game size. Center the whole cake slice and its plate with ample transparent margin; every part of the plate must be visible. Truly transparent alpha background, no scene, no table, no backdrop, no frame, no giant decorative sparkles, no fork or extra props, no letters, no numbers, no text, no watermark, no candle.
