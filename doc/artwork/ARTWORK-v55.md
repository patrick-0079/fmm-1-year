# v55 · 小叶子的环抱动画

把原先 2.2 秒的招手姿势替换为 4.8 秒的拥抱演出。保留小叶子的形象、位置、碰撞、互动入口与所有存档。

## 素材与生成方式

- 内置 imagegen，参考 `src/assets/xiaoye-plush.png` 生成四种连贯姿势，透明背景。
- PNG 母图：`src/assets/xiaoye-embrace-v55.png`。
- 游戏资源：`src/assets/xiaoye-embrace-v55.webp`，无损 WebP，2172×724，四列一行。
- `node scripts/build-community-art.mjs` 重建 WebP；`src/xiaoye-embrace-art.ts` 记录实际透明轮廓、脚点和前臂范围。四帧共用 `60/541` 缩放，低头和微蹲不会被重新拉成长个子。
- 原图集继续用于站立和手提灯，提灯本体复用原图的黄铜灯具，绘制裁片时避开相邻爪子。

## 演出

| 进度 | 动作 |
| --- | --- |
| 0–12% | 注意到芙芙，微微低头；夜间开始放下提灯 |
| 12–28% | 向芙芙张开低垂的软爪，迈近小半步 |
| 28–42% | 侧身环住，芙芙朝向玩偶轻靠 |
| 42–70% | 眯眼停留，两次轻拍，少量淡粉与奶油色小爱心 |
| 70–86% | 松开爪子，慢慢退回 |
| 86–100% | 恢复站姿；夜间提回小灯 |

玩家脚点、真实朝向、镜头和 3:2 画幅始终不变。所有穿戴仍由原人物绘制层处理。两侧靠近都支持镜像拥抱，玩偶演出后保持面对玩家的一侧，避免结束时突然翻转。夜间灯放在与玩家相反的一侧，光晕跟随灯心。

减少动态效果使用静态拥抱、静态小亮点；走开、收起、开包或切图立即结束，互动不写收藏进度。

## 验证

- 时间轴测试覆盖六阶段、两次轻拍、首尾复位、非有限参数、减少动态效果、有界靠近。
- 素材检查覆盖四帧脚点、前臂与分格边界、同一缩放和肩侧高度。
- 浏览器按 1440、390、320px 检查六个时间点、左右拥抱、昼夜、饰品不变、玩家坐标不变、开包与切图取消、键盘和触屏操作。

## 原始提示词

```text
Use case: stylized-concept. Create a new animation sprite sheet matching the exact cream-and-oatmeal CAT PLUSH character in the input reference. Input reference is character identity and pixel style only, preserve sage ribbon/leaf charm, embroidered gentle eyes, tail, soft plush body, pink cheeks, warm brown pixel outlines. One cat, four distinct sequential full-body poses in ONE ROW with FOUR equally wide cells, transparent background and generous gaps. Each cell has the same body scale and same feet baseline. Polished hand-pixelled cozy RPG character animation. NO text, borders, labels, ground shadow, backdrop or second character. The cat is hugging a SMALLER invisible friend on its VIEWER-RIGHT, at belly height; its paws must reach LOW, not raised level with its cheeks. Don't draw the friend or any placeholder. Pose1: cat notices friend to viewer-right, tilts head slightly down and right, ears perked, paws beginning to lift from its belly. Pose2: opens both soft paws toward lower viewer-right, elbows low, an inviting hug; eyes smiling, head slightly lowered. Pose3: leans a little toward viewer-right, knees slightly bent, wraps both plush paws in a loose embrace toward lower viewer-right beside its tummy, eyes peacefully closed. Front paw extends down and right to just above its knee height, as if gently covering the smaller friend's shoulder; leave transparent space between paws where the friend would fit. Pose4: same embracing silhouette, gentle additional head tilt and eyes closed, front paw bends slightly for a soft pat, with fluffy cheek and ears relaxed. Keep feet on the same baseline, no growth/shrink across poses; character head remains consistent size, slight crouch is fine. Tail always curls on viewer-left. Clear distinct silhouettes, readable at 60 pixels tall. No lantern; game will place it on the ground separately. Preserve true alpha everywhere outside sprites including gaps; no opaque background or fake checkerboard. All four whole-body poses fully visible and arranged left-to-right only.
```
