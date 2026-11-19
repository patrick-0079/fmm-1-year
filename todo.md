# 待补素材与上线事项

## 花海落星

以下七颗星尚未提供寄语，按要求继续留空，不显示占位文字。后续如提供，填写 `src/content.ts` 的 `producers[].message`，保留对应星星 ID。

| 制作人 | 寄语 | 对应的星 |
| --- | --- | --- |
| 派大星 | 待提供 | `star-patrick` |
| Kerry | 待提供 | `star-kerry` |
| 苏颜 | 待提供 | `star-suyan` |
| 卿取之于蓝 | 待提供 | `star-qing` |
| 正号 | 十字星的触碰文字暂留空，待提供 | `star-zhenghao` |
| 千羽 | 待提供 | `star-qianyu` |
| Rabe | 待提供 | `star-rabe` |

- [ ] 如有新增制作人，请一并提供展示署名和寄语，每人会多一颗可发现的星。

## 晚安信箱

以下三封来信尚待提供。收到后加入 `src/content.ts` 的 `collections.letters.items`。

- [ ] 卿取之于蓝的来信：标题、展示署名与完整正文。
- [ ] 正号的来信：标题、展示署名与完整正文。
- [ ] 千羽的来信：标题、展示署名与完整正文。

## 其他待收素材

| 位置 | 可以提供的内容 | 接入位置 |
| --- | --- | --- |
| 庭院小电视 | 正式影片的 CDN 直链和片名 | `src/cinema-config.ts` 的 `gardenFilm` |
| 回忆相册（可选扩充） | 新的正式图片原件、标题及配文或署名 | `src/content.ts` 的 `collections.album.items` |
| 床边便签（可选扩充） | 后续复活鼓励，每条一段，署名可写在文末 | `src/content.ts` 的 `encouragements` |
| 晚安信箱（可选扩充） | 其他新来信的正文、标题和展示署名 | `collections.letters.items` |

## 正式上线时

- [ ] 确定结束全配饰试穿的时间。正式发布时将 `VITE_WARDROBE_DEBUG` 改为 `false` 并重新构建。
