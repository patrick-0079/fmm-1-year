# 晚安小屋 · 日常相册与拆礼物

相册素材继续使用本版；礼盒绘制与透视已由 [v37 礼盒说明](ARTWORK-v37.md) 替换，以下拆礼物描述保留其交互设计记录。

## 资产

使用内置 imagegen 生成模式，根据已检查的 `ref/3.png` 人设图生成四张独立的 1536 × 1024 插画。保留粉发、卷呆毛、爱心发夹、正面左绿右粉异色瞳。画面采用温暖的 Q 版绘本风格，中文标题与配文由网页清晰字体显示。

| 内容 | 原画 | 相册 ID |
| --- | --- | --- |
| 草莓吐司的早晨 | [morning.png](../../ref/相册/morning.png) | `fufu-morning` |
| 雨声翻过一页书 | [reading.png](../../ref/相册/reading.png) | `fufu-reading` |
| 把黄昏弹给你 | [bass.png](../../ref/相册/bass.png) | `fufu-bass` |
| 小狐狸也说晚安 | [fox.png](../../ref/相册/fox.png) | `fufu-fox` |

四张日常插画与后来的拍摄照片一起放在 [ref/相册](../../ref/相册)。标题、配文、替代文字、尺寸和原图地址都在 [album.json](../../ref/相册/album.json)。原图上传对象存储。运行 `npm run scan:album` 生成书页图与缩略图，也可用 `npm run scan` 同时更新来信与花海落星。WebP 位于同目录的 `previews/`，文件名分别为 `<id>.<version>.webp` 和 `<id>.<version>-thumb.webp`，长边最多 640px 和 240px。相册翻页使用预览，玩家点开单张时才请求原图。

拆礼物改为单个礼盒：解开两端缎带、掀开盒盖、确认收礼。复用既有礼盒/缎带鞋素材，配合分层盒盖、纸衬、柔和光点。角色与礼物在原地图中显示，保留 3:2 画幅；关闭会清除本次手势，已完成的 `gifts` 记录及奖励沿用旧档。

小屋电视与床头电台保留底图家具，不再具有热点、提示符或网页入口。花园 CDN 电视、背景音乐和白色贝斯保留。

## 最终提示词

每个条目各调用一次内置 imagegen；`ref/3.png` 为角色参考，非要求保留的构图。无 CLI/API 调用。

### morning

```text
Use case: illustration-story. Create one polished landscape 3:2 daily-life album illustration for a cozy browser game about 芙眠眠, based on the supplied character reference. Input image is the character identity reference, not a composition to copy. Match her distinctive long pale strawberry-pink layered hair, curled ahoge, heart-shaped pink hair clip on viewer-right, bright green eye on viewer-left and rose-pink eye on viewer-right, soft bangs and sweet face. Adapt to a cute 3-head-tall chibi storybook illustration, detailed hand-painted anime watercolor/gouache, crisp delicate lines, warm soft lighting, lots of texture and carefully drawn props, not pixelated. Wholesome cozy daily life, fully clothed in cream/lavender comfy clothes. Palette soft pink, cream, sage green, muted blue and warm wood, with enough color variety. Single cohesive complete scene, no collage, no UI or panels, no text/signature/watermark or typography. Landscape composition clear at small sizes, subject central with breathing room.
Scene: A quiet morning in a charming wooden cottage. Fufu sits at a small round breakfast table by the sunny window, gently holding a cream strawberry-patterned mug with both hands, looking contentedly at breakfast. Toast with strawberry jam, a small plate of berries, a little glass vase of daisies, linen tablecloth, sunlit leaves and gingham curtains. Pale lavender cardigan with subtle star motifs over a cream top. Sweet relaxed smile, both eyes visible. Warm morning rays and airy pale mint shadows. Waist-up seated composition; whole table and window help tell a natural everyday story.
```

### reading

```text
Use case: illustration-story. Create one polished landscape 3:2 daily-life album illustration for a cozy browser game about 芙眠眠, based on the supplied character reference. Input image is the character identity reference, not a composition to copy. Match her distinctive long pale strawberry-pink layered hair, curled ahoge, heart-shaped pink hair clip on viewer-right, bright green eye on viewer-left and rose-pink eye on viewer-right, soft bangs and sweet face. Adapt to a cute 3-head-tall chibi storybook illustration, detailed hand-painted anime watercolor/gouache, crisp delicate lines, warm soft lighting, lots of texture and carefully drawn props, not pixelated. Wholesome cozy daily life, fully clothed in cream/lavender comfy clothes. Palette soft pink, cream, sage green, muted blue and warm wood, with enough color variety. Single cohesive complete scene, no collage, no UI or panels, no text/signature/watermark or typography. Landscape composition clear at small sizes, subject central with breathing room.
Scene: A rainy afternoon in a charming wooden cottage. Fufu curls up in a cushioned reading chair by a wooden bookcase, with an open illustrated book in her lap and one finger keeping the page. Her face is in three-quarter front view with both eyes visible; she looks up with a small smile. Raindrops and soft blurred green garden through the window, folded cream knitted throw, tea on low side table, warm reading lamp. Pale lavender cardigan with tiny moon and star embroidery over cream top; cozy slippers. Quiet detailed domestic scene, muted blue rainy window contrasting amber lamp, no writing legible on book spines.
```

### bass

```text
Use case: illustration-story. Create one polished landscape 3:2 daily-life album illustration for a cozy browser game about 芙眠眠, based on the supplied character reference. Input image is the character identity reference, not a composition to copy. Match her distinctive long pale strawberry-pink layered hair, curled ahoge, heart-shaped pink hair clip on viewer-right, bright green eye on viewer-left and rose-pink eye on viewer-right, soft bangs and sweet face. Adapt to a cute 3-head-tall chibi storybook illustration, detailed hand-painted anime watercolor/gouache, crisp delicate lines, warm soft lighting, lots of texture and carefully drawn props, not pixelated. Wholesome cozy daily life, fully clothed in cream/lavender comfy clothes. Palette soft pink, cream, sage green, muted blue and warm wood, with enough color variety. Single cohesive complete scene, no collage, no UI or panels, no text/signature/watermark or typography. Landscape composition clear at small sizes, subject central with breathing room.
Scene: Fufu practicing a WHITE FOUR-STRING ELECTRIC BASS in her cozy wooden bedroom at sunset. Cute chibi seated naturally on a low padded stool, proper instrument resting across lap, one hand on neck and other gently plucking strings near pickups, head angled slightly toward instrument but both differently colored eyes visible. White bass body, four strings and four tuning pegs, cream cable leading to a tiny muted green practice amp. Warm peach windowlight, wooden flooring, lavender moon-and-star cardigan over cream top, small vase on shelf. Quiet home practice, no stage, no performance audience, no text or musical notation. Carefully readable hands and bass silhouette.
```

### fox

```text
Use case: illustration-story. Create one polished landscape 3:2 daily-life album illustration for a cozy browser game about 芙眠眠, based on the supplied character reference. Input image is the character identity reference, not a composition to copy. Match her distinctive long pale strawberry-pink layered hair, curled ahoge, heart-shaped pink hair clip on viewer-right, bright green eye on viewer-left and rose-pink eye on viewer-right, soft bangs and sweet face. Adapt to a cute 3-head-tall chibi storybook illustration, detailed hand-painted anime watercolor/gouache, crisp delicate lines, warm soft lighting, lots of texture and carefully drawn props, not pixelated. Wholesome cozy daily life, fully clothed in cream/lavender comfy clothes. Palette soft pink, cream, sage green, muted blue and warm wood, with enough color variety. Single cohesive complete scene, no collage, no UI or panels, no text/signature/watermark or typography. Landscape composition clear at small sizes, subject central with breathing room.
Scene: A peaceful goodnight in a cozy wooden cottage. Fufu sits cross-legged on a soft cream rug beside her bed and gently pets a SMALL FOUR-LEGGED PINK FOX curled by her knees. Fox has cream-white chest and large white-tipped fluffy tail, a little heart clip and sleepy eyes. Fufu wears a comfy full-coverage lavender pajama set with tiny moon/star motifs, pink hair and heart clip retained, both different-colored eyes visible with relaxed smile. Warm bedside lamp, quiet indigo night and crescent moon through window, quilted bed behind, storybook, wooden floor. Intimate homely scene, subtle warmth and calm. No sparkles covering the characters, not a festive poster.
```
