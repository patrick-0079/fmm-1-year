# 像素美术记录

工具：内置 `image_gen`；素材已保存到项目内，不依赖生成服务运行。

## 室内场景 `src/assets/room.png`

提示词：粉色 ASMR 主播一周年的温暖像素卧室，3:2 横幅，俯视 RPG 视角，正交投影；上墙中央月夜窗户，左上复古粉色电视、右上粉色床铺和床边电台，左边书桌与信件相册，中央小圆桌与单蜡烛草莓蛋糕，左下气球，右下礼盒，中央保留通行空间。奶油白、粉色、淡紫，星月灯串、柔和木地板，无文字、角色、水印或界面。

## 室外场景 `src/assets/garden.png`

提示词：与卧室匹配的粉色周年夜间樱花花园，3:2 俯视可探索 RPG 地图；顶部中央粉色小屋和入口，宽阔粉色石径贯穿地图，左中气球摊、右中空白弹幕屏幕和蓝色天线小电视、左下小电视路牌与长椅、右下烟花野餐区，中心心形铺装；周边白栅栏、月光溪流、樱花与星星灯串，中央留出草地和通行空间，无文字或角色。

## 角色 `src/assets/nemu-sprites.png`

参考：`ref/1.png` 与 `ref/3.png`。提示词：相同大小的两头身 Q 版像素眠眠，粉色长发、呆毛、爱心发夹，正面画面左绿右粉异瞳，淡紫白色睡衣与拖鞋，透明背景。3 列 × 4 行等距精灵图；各行分别正面、左侧、右侧、背面；各列分别站立、左步、右步。保持造型、比例与脚底位置一致，无文字或场景。

## 最终选用素材的完整提示词

网页引用同名 `.webp`，PNG 为生成原图。下面是三张选用原图的实际生成提示词；角色请求开启透明背景，场景请求关闭透明背景。

### room.png

```text
Use case: illustration-story. Asset type: actual background for a cozy top-down browser pixel game. Create a beautiful polished authentic low-resolution pixel art room, 3:2 landscape composition, a whole pink bedroom seen straight top-down at a slightly elevated three-quarter RPG view (orthographic, not isometric), no characters, no UI, no letters or text or numbers anywhere. Pixel style: crisp deliberate square pixels, restrained pastel palette, warm dusty pink outlines, no smooth vectors, no blur. It should look like an exquisite indie pixel game for a pink-haired ASMR vtuber's first anniversary, a dreamy quiet nighttime birthday celebration. Room fills entire frame. Layout precisely: at top a cream pink wall from y 0 to 30 percent; a large lavender night sky window with moon centered on top wall; a small retro pink TV in the upper left on a low dresser; on upper right a white bed with pink quilt, pillows, tiny plush bunny, and a pink bedside radio. Left wall lower-middle has a small letter writing desk with envelopes and small album. Lower left corner has a cluster of three uninflated-looking decorative pink/lavender balloons and a cute basket. Lower right corner has a pile of pink wrapped gift boxes. Center of room a SMALL low round table with pink cake and one lit candle, on a big pale pink scalloped oval rug. Furniture stays near edges except the small central cake table. Plenty of clear traversable pink wood plank floor surrounding the small central table, especially lower center and left and right corridors. Pink wooden room border visible all around. Pink bunting and tiny glowing star string lights on top wall. Little flowers, soft cushion accents, subtle sparkles, warm cozy lighting. No heavy perspective, no text, no labels, no watermark. This will be a game level with walkable floor and clickable furniture, so objects must be spatially separate and clearly recognizable. Final image landscape 1536x1024, art rendered as if a 384x256 pixel illustration enlarged with nearest neighbor.
```

### garden.png

```text
Use case: illustration-story. Asset type: actual large scrollable outdoor background for a cozy top-down browser pixel RPG. Create a gorgeous expansive pink anniversary garden at night in a precise 3:2 landscape composition, whole explorable game map, authentic crisp square pixel art in the aesthetic of a charming premium indie RPG. No UI, no text, no characters, no typography or numbers. Matching soft dusty pink, mauve, lavender, pale blue highlights, warm glowing lights. Orthographic top-down slightly elevated view, not isometric. Layout: a small cozy pink cottage centered along the TOP border, its open front door at 50 percent x, 28 percent y, big wide pink stone path from the door down through the center of the garden. Plenty of walkable clear grass and pink paving across entire central area and lower half. Left side around 22 percent x 48 percent y: pastel balloon stand with pink and lavender balloons. Right side around 80 percent x 45 percent y: little outdoor cinema / rectangular blank dark blue display screen with a cute small cyan TV-shaped decoration on top (two antennae, white bracket-shaped eyes), a subtle fan tribute to Bilibili. Bottom right around 78 percent x 80 percent y: fireworks picnic blanket with a few unlit fireworks launch tubes and star decorations. Bottom left around 22 percent x 80 percent y: blue tiny TV-shaped mailbox / sign with two antennae and cute white bracket eyes, surrounded by flowers and a small bench. A large circular heart paving pattern in the open center lower area. Garden surrounded by pastel pink cherry blossom trees near boundaries and low white fences, little flower beds, hanging star string lights from tree to tree, small heart bunting near cottage, moonlit stream along far right edge separated by fence. The setting should feel like a peaceful first anniversary festival waiting for guests. Separate objects well, avoid clutter in walkable areas. Detailed beautiful pixel textures and deliberate visible blocky pixels. Whole garden from above, no sky backdrop, no perspective horizon, map all the way to the edges. Final image landscape 1536x1024. No text, no watermark.
```

### nemu-sprites.png

```text
Use case: stylized-concept. Asset type: a usable aligned sprite sheet for a top-down browser pixel game. Reference images show character identity only; transform her into a tiny adorable 2-head-tall chibi pixel character. Preserve pastel pink long hair, little ahoge, pink heart hair clip on screen-right, green eye on screen-left and magenta eye on screen-right in front view. Cute modest pastel lavender and white long-sleeve pajamas, slippers, soft sleepy smile. Authentic hand placed low-resolution square pixel style, limited palette with dusty mauve outlines, matching a pastel pink cozy RPG bedroom. Transparent background with actual alpha, no checkerboard. Output exactly ONE sprite sheet with a precise regular 3-column by 4-row grid, twelve equally sized cells, no visible dividers, no labels, no text. Each cell contains exactly one same-sized full-body character, centered horizontally, feet aligned at the same relative vertical coordinate. Row 1: facing down/front (standing, left step, right step). Row 2: facing left (standing, left step, right step). Row 3: facing right (standing, left step, right step). Row 4: facing away/up (standing, left step, right step). Same scale, same outfit and exact same design in ALL cells. Keep every sprite strictly in its own cell with a generous transparent margin on every edge. Each cell aspect ratio square, entire sprite sheet aspect ratio 3:4 portrait. Visually each character should be like a 32x40 pixel sprite enlarged nearest-neighbor, not smooth anime art. No objects, no scenery, no shadows beyond tiny foot shadow. Make a clean production sprite sheet.
```
