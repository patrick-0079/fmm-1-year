# 维护与验收手册

本项目使用 TypeScript、Vite 和 Canvas。生产站是 `dist/` 中的纯静态文件，不需要 Node 服务、API、数据库或账户。Cloudflare 的构建环境需要 Node.js；访问网站的粉丝只需要浏览器。

## 本地修改与发布

1. 在仓库根目录执行 `npm ci`，使用 Node.js 22.12+，建议 24。
2. `npm run dev` 开发；根据终端中的地址打开页面。
3. 修改完成后执行 `npm run check`，测试或类型检查失败时先修复。
4. `npm run preview` 检查本次 `dist/`，开发页正常不代表旧产物已经更新。
5. 检查 `git diff`，提交需要发布的源文件、文档及必要素材。推送至已连接 Cloudflare 的 `main` 才会触发生产构建；本地提交不触发部署。
6. 在 Cloudflare 构建记录确认提交号和成功状态，再检查正式 URL。Git 推送成功本身不代表 Cloudflare 部署成功。

Workers 与 Pages 的具体填写值、预览构建、Access、令牌和变量见 [README 的部署配置](README.md#cloudflare-部署)。也可上传 `dist/`，压缩包根层应直接包含 `index.html` 和 `assets/`，不要再套一层 `dist`。不要上传 `node_modules`、`ref` 或开发验收页。

## 常改的内容在哪里

| 内容 | 文件与维护要点 |
| --- | --- |
| 主播链接、纪念日期、制作人 | `src/content.ts` 的 `anniversary`、`producers`；追加名单即可，保留现有顺序 |
| 文字、图片、录音、视频收藏 | `src/content.ts` 的 `collections`；本地文件放 `public/media/`，页面路径写 `/media/文件名` |
| 花园大屏视频 | `src/cinema-config.ts`；使用直接可读取的 MP4 地址，推荐 H.264 + AAC，替换后核对 CORS |
| 首次复活便签 | `src/bed-note.ts`、`src/assets/xiaoye-note.webp`；后续复活文案在 `content.ts` 的 `encouragements` |
| 烟花祝福 | `src/celebration.ts` 的 `fireworkWishes`；全部是预设文字 |
| 小镇居民和小游戏摊位 | `src/town-data.ts`；位置、靠近点和半径需要一起验证 |
| 庭院来宾与动物 | `src/garden-guests.ts`；对话与跟随逻辑在 `src/garden-life.ts` |
| 宠物安全足迹 | `src/companion-motion.ts`；跟随真实行走点，不执行全图寻路；暂停、睡觉与小游戏期间停止更新 |
| v12 摊位、星屑、花环、窗景 | `src/scene-art.ts` 登记图集；摊位图标和清晰招牌仍在 `src/arcade-stall.ts` 绘制 |
| 装备定义、部位、获取说明 | `src/items.ts`；图标在 `src/item-art.ts`，佩戴定位在 `src/equipment.ts`，人物绘制在 `src/avatar.ts` |
| 试穿与正式构建 | 根目录 `.env` 中 `VITE_WARDROBE_DEBUG=true` 开放试穿。正式构建改为 `false` 后重新部署，生产构建变量可以覆盖仓库默认值 |
| 周年游园券、七幅棋盘与像素角色 | `src/arcade-art.ts`、`src/arcade-pixels.ts` 与 `src/festival-v11.css`。运行 `npm run art:festival` 重建游戏图和鞋子图层 |
| 原创音乐《把晚安留给你》 | `src/lullaby.ts` 保存乐谱、各地图速度与配器。`src/sound.ts` 负责解锁音频、音量、放映时的音量变化和后台暂停 |
| 小游戏规则与面板 | `src/arcade-engines.ts`、`src/arcade-bonus.ts`、`src/arcade.ts`；新增种类也要补 `town-data.ts` 与说明 |
| 蛋糕、礼物、气球、烟花 | `src/activities.ts`；切割判定在 `src/cake-party.ts`，精细气球/礼盒裁切在 `src/party-art.ts` |
| 地图与物理通道 | `src/maps.ts`、`src/town-map.ts`；小镇两条通路的四座门、落脚点、门柱在 `src/gate-layout.ts`，绘制在 `src/connections.ts` |
| 小镇可走道路、遮挡与装饰 | `src/town-surfaces.ts`、`src/town-scenery.ts` |
| 溪水和树木 | `src/landscape.ts`、`src/landscape-renderer.ts`；溪水绘制与碰撞共享形状 |
| 昼夜和采集 | `src/day.ts`、`src/nature.ts`；现实 600 秒一天，现实离线时间也计入时钟 |
| 操作说明与页面布局 | `src/help.ts`、`src/main.ts`；样式导入顺序见 `main.ts`，新样式集中在对应功能文件 |

维护者配置的内容由页面只读展示。不要加入访客输入、留言提交、录音上传或假装能同步的存储界面。

## 地图与素材修改规则

人物位置是**脚底坐标**。绘图遮挡、物理碰撞、交互的靠近点是不同概念：树冠负责遮挡，树干与种植区阻挡脚步，交互点需要留在可站立的道路上。人物与树木/NPC 按脚底深度排序；坐姿、睡姿使用独立裁切和佩戴定位。

修改道路、物件或出口后，运行 `npm test` 的全地图可达性检查，并在开发 URL 后加 `?debug=collision` 查看轮廓和脚底坐标。测试会从出生点、床边和长椅出口走到全部交互点，逐段验证不穿墙、不跨水面和不误入陷阱；它不能替代对地图插画的目视对齐检查。

房间逻辑尺寸为 600×400，庭院和勇气花园为 900×600，小镇为 1536×1024。摄像机视口逻辑尺寸保持 600×400，画布实际像素按设备像素密度调整。不要把画布重新缩为低分辨率来画文字；系统字体与像素图片分别渲染。

图集不一定是等宽网格。修改角色、衣橱或庆典素材时，核对 `src/sprite-frames.ts`、`equipment.ts`、`item-art.ts`、`party-art.ts` 的实际裁切区域。生成来源与原始提示词在 `ARTWORK*.md`，v11 新素材详见 [ARTWORK-v11.md](ARTWORK-v11.md)。透明图集压缩保持原尺寸；不要仅凭格数平均裁切。

周年游园券、七幅棋盘背景、飞行与跳跃角色的原画、图集顺序及提示词见 [v14 美术与配乐记录](ARTWORK-v14.md)。

小镇的预览图 `anniversary-town-v13.webp` 和高清图 `anniversary-town-hd-v13.webp` 出自同一份 3072×2048 母图。进入小镇才请求高清图，解码成功后再替换；失败保留预览并在下次进镇重试。`World.paintMap` 按图片实际尺寸换算源区域，底图和树冠裁片走同一套取样。调整摊位时把两只柜脚都放在原图的空地上，预留人物可走到的柜台正面；不要用纹理多边形盖住原图来制造空地。

南门及木桥门两侧的热点、对应出口、碰撞和灯光共用 `townGates`。立柱阻挡脚步，中间开口可通行；门体同人物按脚底排序。高清重绘、拼图与压缩方法见 [ARTWORK-v13.md](ARTWORK-v13.md)。窗景仍通过玻璃遮罩绘制四时图集，保留窗框、窗帘和花朵，见 [ARTWORK-v12.md](ARTWORK-v12.md)。

`npm run optimize:art` 只重建脚本登记的 WebP。它会覆盖这些派生文件，因此运行后检查图片差异与裁切对齐，再构建。晨露花已有单独裁切的 WebP，不在批量重建列表中。

## 输入、暂停与活动状态

- `world.paused` 用于活动接管人物移动；小游戏虽然阻止人物移动，仍自行更新游戏规则。
- `world.suspend(reason, true/false)` 用于背包与说明等临时暂停。不同原因分别登记，关闭一个面板不能提前解除另一个面板的暂停。
- 佩戴／脱下后，`Inventory.toggle` 会释放背包自己的暂停并把焦点返还画布。`Activities.finishEquipmentChoice` 只结束已完成选择的对话、采集菜单或提示，不能结束正在进行的小游戏。游戏原本由玩家手动暂停时须保留该状态。
- 暂停和清理输入会调用 `world.onInputCancel`，释放方块加速和跳跃蓄力；取消蓄力不能当成正常松开来自动起跳。
- 小游戏 P 暂停与临时面板暂停独立。窗口失焦后小游戏保持暂停，等待玩家主动继续；不要用浏览器恢复焦点直接开始飞行或落块。
- `src/input.ts` 保留 Ctrl / Command / Alt 组合键和阅读区域的原生操作。新增快捷键应复用过滤逻辑。
- 关闭活动时清理它自己的临时计时和手势。礼物未配对的延时不得再更新其他活动的按钮。
- 场景切换、快捷前往、重新探索要关闭临时面板；过场/跌倒尚未结束时，重置会提示稍后重试。

## 本机进度与兼容

试穿开启时，衣橱用内存中的全饰品列表和搭配。发奖和花园采集始终查询真实收藏，关闭开关会恢复本机搭配。正式上线前可在干净的浏览器打开背包验收，确认调试开关已隐藏，未收集物品显示「未获得」。

验收鞋子时访问 `/tests/equipment-fixture.html`，对照原鞋与两双配饰的四向三帧和坐姿。鞋子使用角色原画的脚部透明轮廓。更换角色源图时要同步核对 `scripts/build-shoes.mjs` 的逐帧坐标，再运行 `npm run art:festival`。小游戏画面与可试听、可导出的原曲在开发页 `/tests/festival-preview.html`。

| localStorage 键 | 内容 |
| --- | --- |
| `nemu-anniversary-v1` | 探索点、五个心愿、声音偏好、首次复活便签 |
| `fufu-garden-bag-v1` | 苹果、花朵、星屑、每日采集记录与旧花环数据 |
| `fufu-world-clock-v1` | 昼夜起始时间和长椅推进时间 |
| `fufu-souvenirs-v1` | 获得的纪念品和六个装备位 |
| `fufu-town-talked-v1` | 已交谈的小镇居民 |

只在同一浏览器、同一网站来源下保存。更换域名、端口、浏览器或使用隐私窗口可能看到不同进度；没有跨设备同步。存储被禁用时仍可游玩，但不能保证刷新后保留。

「重新探索」需要在页脚再次确认，会清空探索、收集、装备、时钟和认识的居民，保留声音设置。单局小游戏分数、蛋糕分块、礼物局面和视频播放位置是当前页面内状态，刷新后不保留；已获得奖励保留。视频完整下载结果也是页面内 Blob，不写入 localStorage。

不要随意更换存储键名或装备 id。当前已兼容旧花环和旧月兔背包槽位；增加或改名后应补存档迁移测试。

## 视频和故障排查

视频从打开页面开始完整下载，完成前可继续探索。不会只缓冲一小段；需要先收完文件再播放，当前示例约 67.1 MiB。慢网络首次等待较长，大视频会使用相应内存。每次刷新都会重新建立页面播放器，是否免去网络传输取决于 HTTP 缓存。

视频控制中已取消发送弹幕，删除了会关闭播放器的旧分支；烟花周年祝福仍在地图内独立播放。`danmaku` 仍是花园电视的内部历史交互 id，以兼容已有探索存档，不代表还有弹幕功能。

| 现象 | 检查与处理 |
| --- | --- |
| 显示预载失败 | 查看 CDN URL 是否可访问、R2 是否允许当前页面 Origin 的 GET/HEAD；修改 CORS 后清除自定义域名的旧视频缓存 |
| 一直没有新数据 | 连续 60 秒无进展会转为失败，可点「重新加载」；持续有数据的慢速下载没有总时长限制 |
| 显示 100% 但无法播放 | 检查是否为完整 MP4、编码是否受浏览器支持；错误页面、206 部分响应或错误的 Content-Length 不是完整视频 |
| 没有百分比 | CDN 未提供可读取的完整 Content-Length 或启用了压缩；仍显示已接收字节并继续完整下载 |
| 手机不能进入原生全屏 | 使用自动的全窗口播放器；按钮和 Esc 可返回地图 |
| 游戏无声音 | 点击开始/声音按钮，检查 BGM、音效、音量和浏览器静音；浏览器可能要求真实点击才能解锁音频 |
| 本地打开是空白 | 使用 HTTP 开发/预览地址，不要直接双击 `dist/index.html` |
| 修改后正式站没变化 | 确认已 push 到连接的生产分支、Cloudflare 最新构建成功、提交号一致，再刷新正式站 |
| 新增图标为空 | 确认 WebP 路径和图集尺寸；图集晚到会自动重绘，网络 404 则需修复路径 |

R2 CORS 完整示例在 [README](README.md#花园小电视cdn-周年放映)。`Content-Encoding` 如需供前端读取，应列入 `ExposeHeaders`。依据：[Cloudflare R2 CORS 与缓存说明](https://developers.cloudflare.com/r2/buckets/cors/)。部署命令/预览命令依据：[Workers Builds 配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)。

## 发布前验收

先执行 `npm run check`。纯逻辑测试覆盖七个小游戏、奖励与存档迁移、碰撞和四地图可达性、睡姿装备、蛋糕手势、视频完整下载/停滞/重试。再用开发服务器检查以下页面：

| 页面 | 用途 |
| --- | --- |
| `/tests/interaction-fixture.html` | 真实控制器的暂停、恢复、焦点、快捷键与活动计时回归，不写存档 |
| `/tests/equipment-fixture.html` | 14 件纪念品的方向、坐姿、睡姿；睡觉不能出现饰品 |
| `/tests/scenery-fixture.html` | 窗景、晨露花和七种摊位的绘制 |
| `/tests/mobile-fixture.html` | 375/320 宽度真实页面，使用当前来源的本机进度 |
| `/tests/media-fixture.html` | 四种媒体、长文字和缺失素材；专用测试容器不代表生产阅读区布局 |

最后在生产预览中走一遍：四图切换与物理出口、坐/躺/起身、蛋糕切割与食用、礼物切换、小游戏暂停及继续、背包分类穿脱、视频加载/离开/返回/全屏、游戏内与页面信箱切换。手机重点检查按钮不被画面遮挡、地图与面板没有横向溢出。

## 2026-11-02 检查修复记录

本轮修复背包和说明未暂停、后台加速/蓄力残留、礼盒计时串扰、扫雷无效提示扣次数、浏览器组合键被拦截、慢加载衣橱图标不刷新、视频无进展无限等待，以及浏览器页面缓存返回后音频失效。收起说明、点击小游戏提示或暂停后会回到完整游戏画面，并保留适当的键盘焦点。重新探索也会重置昼夜时钟。

寻路增加安全直达与目标附近提前结束，保留碰撞检测和阻挡目标的邻近回退。新增回归用例和控制器验收页；`npm run check` 可复查。
