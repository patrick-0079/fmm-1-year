# 芙眠眠一周年 · 晚安小世界

暖木色、薰衣草紫、樱花粉、薄荷绿与溪水蓝搭配的像素风 H5 周年探索游戏。控制 Q 版眠眠，在室内小屋和室外花园之间探索；全部逻辑在浏览器内运行，不需要后端、数据库或服务端函数。

## 开发和构建

需要 Node.js 22.12+（建议 Node.js 24）。

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

开发服务器下可访问 `/tests/media-fixture.html` 检查四类媒体、长留言和素材缺失提示。测试音视频在浏览器内临时生成，测试内容不会进入正式内容配置或生产构建。

`/tests/mobile-fixture.html` 提供 375 与 320 像素宽度的真实页面框架，用于检查手机布局、方向键、陷阱和复活弹窗；同样不包含在生产构建中。

生产产物在 `dist/`，可以部署到任意静态托管服务。它是一个单页网站及其本地资源文件，需通过 HTTP/HTTPS 访问，不能直接双击 HTML 使用 `file://` 打开。

## 已包含的玩法

- 室内：长按吹蜡烛 → 拖动切蛋糕 → 分享第一块蛋糕；四对礼物翻牌配对。
- 室外：给三只气球充气并放飞；点夜空释放烟花；向弹幕祈愿屏发射预设祝福；小电视打卡站。
- 电脑：WASD / 方向键移动，E / 空格互动，Esc 关闭弹窗。
- 手机：虚拟方向键 + 互动按钮；也可以点击地面自动寻路、点击发光标记前往互动。
- 家具碰撞、自动寻路、室外镜头跟随、本机探索进度、可选轻提示音、减少动态效果支持。
- 路上有绊脚缎带、石头、迷雾和回旋风，寓意探索中的小挫折。踩中后会回到最近点亮的星灯，已完成的心愿与回忆保留。
- 小屋有枕边星灯，花园有启程星灯与心愿星灯。走近会自动激活，复活后有短暂保护和鼓励留言面板。

吹蜡烛采用长按操作，不请求麦克风权限。音效默认关闭；真实媒体由访客主动点击播放。探索记录只保存在当前浏览器，不会上传。

页面不提供文字输入、留言提交、文件上传或录制功能。信件与媒体是维护者写入项目的只读内容；弹幕屏只播放按钮选择的预设祝福，不会发送到 B 站或任何服务器。

## 添加留言、图片、音频和视频

已接入 `ref/素材/Kerry/留言.txt` 的真实祝福，图片、音频、视频仍展示占位界面。将媒体放入 `public/media/`，在 `src/content.ts` 的对应 `items` 中填入内容，然后重新构建。侧栏会自动显示内容数量。

```ts
// collections.letters.items：文字留言
{ id: 'letter-01', title: '一周年快乐', author: '署名', text: '在这里写完整留言。\n支持换行。' }

// collections.album.items：图片，建议 WebP / PNG / JPG
{ id: 'photo-01', title: '想珍藏的瞬间', src: '/media/photo.webp', alt: '图片说明', text: '可选配文' }

// collections.radio.items：音频，建议 MP3
{ id: 'audio-01', title: '一封声音来信', author: '署名', src: '/media/good-night.mp3', text: '可选配文' }

// collections.tv.items：视频，建议 H.264 + AAC 编码的 MP4
{ id: 'video-01', title: '周年纪念片段', src: '/media/anniversary.mp4', text: '可选配文' }
```

每个物件可以配置多条内容。素材缺少、加载失败、列表为空均有提示；切换或关闭播放器时停止原来的媒体。媒体地址是实际文件路径，不是 B 站视频页面链接。

`src/content.ts` 还包含首播日、周年日和 B 站主页链接。`src/maps.ts` 定义地图、碰撞与互动点；`src/world.ts` 实现移动和场景绘制；`src/activities.ts` 实现周年小游戏。

## 陷阱、复活点与鼓励文案

`src/maps.ts` 集中定义两张地图的可行走边界、家具轮廓、互动位置、陷阱和星灯。碰撞以脚下的小圆形区域计算；角色按原精灵帧比例绘制。点击发光标记时，自动寻路会绕开家具和陷阱；点击陷阱本身可以体验一次复活。

复活鼓励文案保留只读占位。在 `src/content.ts` 的 `encouragements` 中依次添加真实文案即可，复活时会轮换显示：

```ts
{ title: '可选标题', message: '在这里填写鼓励的话。', author: '可选署名' }
```

开发时访问 `/?debug=collision` 可以显示家具轮廓、可行走边界、脚下碰撞区域、路径和坐标，便于核对地图。该调试视图只在开发环境启用。

## 制作人名单

当前按顺序展示：派大星、Kerry、苏颜、卿取之于蓝、正号、千羽。名单在 `src/content.ts` 的 `producers` 数组中；后续在数组末尾追加名字并重新构建即可。

## 向 main 推送后自动构建发布

使用 Cloudflare 自带的 Git 构建，不需要额外写 GitHub Actions，也不需要把令牌放入仓库：

1. 在 Cloudflare 的 **Workers & Pages** 里打开 `fmm-1-year`。
2. 在 **Settings → Build** 连接 GitHub 仓库 `patrick-0079/fmm-1-year`。已有连接时确认仍然启用。
3. 在 **Settings → Build → Branch control** 把生产分支设为 **`main`**。
4. 构建命令填写 **`npm run build`**，部署命令填写 **`npx wrangler deploy`**，根目录为仓库根目录，构建变量 `NODE_VERSION=24`，然后保存。
5. 后续推送到远端 `main`，或把 Pull Request 合并进 `main`，都会自动运行构建与部署。可以在 Cloudflare 的 Builds 中查看对应提交的日志和发布结果。

例如修改本项目后执行：

```sh
git switch main
git add src README.md
git commit -m "Update anniversary adventure"
git push origin main
```

触发条件是远端 `main` 收到新的推送；只在本地 `git commit` 尚未推送时，Cloudflare 不会收到事件。预览构建用于其他分支，不是生产自动发布的开关。

如果没有自动发布，优先检查 GitHub 应用是否授权此仓库、Git 构建连接是否启用、生产分支是否确实为 `main`，以及 Cloudflare 的构建日志。若项目最初通过直接上传创建，需要先建立 Git 构建连接。

以上行为依据 [Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/) 与 [Build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)。

## Cloudflare 部署

以下两种方式都部署纯静态网页。选择一种即可；游戏没有后端处理逻辑。

### Workers Git 构建界面（有“创建新令牌”的界面）

仓库中已加入 `wrangler.jsonc`，将 `dist/` 作为静态资源目录，不配置服务端入口、数据库或存储绑定。

| 配置项                       | 填写方式                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| 项目名称                     | `fmm-1-year`（如自行改名，同时修改 `wrangler.jsonc` 的 `name`）                                   |
| 仓库                         | `patrick-0079/fmm-1-year`                                                                         |
| 生产分支                     | `main`                                                                                            |
| 构建命令（可选）             | `npm run build`。虽然界面标注可选，本项目需要构建，必须填写。                                     |
| 部署命令                     | `npx wrangler deploy`                                                                             |
| 启用预览构建                 | 开启；非生产分支用于预览。                                                                        |
| 预览命令（如显示）           | 保留默认 `npx wrangler preview`。                                                                 |
| 使用 Cloudflare Access 保护  | 面向粉丝公开访问时关闭。开启会要求受保护地址的访客登录。若开关注明仅保护预览，则只影响预览地址。  |
| 高级设置 → 根目录            | `/`，即仓库根目录。                                                                               |
| 高级设置 → API 令牌          | 保留“创建新令牌 / 将自动创建新令牌”，由 Cloudflare 自动管理部署凭据；不需要在网页代码里填写令牌。 |
| 构建变量名称                 | `NODE_VERSION`                                                                                    |
| 构建变量值                   | `24`                                                                                              |
| 其他变量、Secrets 与存储绑定 | 留空。                                                                                            |

本地可执行 `npx wrangler deploy --dry-run` 验证静态部署配置；实际部署仍由你在 Cloudflare 中完成。

### Pages Git 构建界面（有“构建输出目录”的界面）

连接 GitHub 仓库 `patrick-0079/fmm-1-year`，填写：

| 配置      | 值                         |
| --------- | -------------------------- |
| 生产分支  | `main`                     |
| 框架预设  | None                       |
| 构建命令  | `npm run build`            |
| 输出目录  | `dist`                     |
| 根目录    | 留空（仓库根目录）         |
| Node 版本 | 环境变量 `NODE_VERSION=24` |

如显示预览构建则开启；公开纪念站的 Access 保护关闭。Pages 的预览 Access 开关仅保护预览部署，默认不会保护正式 `pages.dev` 或自定义域名。

也可以把本地构建的 `dist` 目录直接上传到 Pages。Pages 这条路径无需部署命令、Functions 或手动设置 API 令牌。

官方配置依据：[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/get-started/)、[Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[Pages 预览访问控制](https://developers.cloudflare.com/pages/configuration/preview-deployments/)。

## 纪念内容与素材

- 首播日由用户提供：2025-12-01；一周年纪念日：2026-12-01。
- 主播形象参考 `ref/1.png`、`ref/3.png`，保留粉发、绿粉异瞳、爱心发夹和睡衣特征。
- 项目插画使用内置 imagegen 生成，相关提示词与制作记录见 `ARTWORK.md`。
- 网页使用优化后的 WebP，生成的 PNG 原图保留在 `src/assets/`；需要重新压缩时运行 `npm run optimize:art`。
- B 站小电视和弹幕元素是粉丝纪念主题设计，本项目与哔哩哔哩官方无关。
- 没有使用虚构粉丝留言、官方背书或实时直播数据。
