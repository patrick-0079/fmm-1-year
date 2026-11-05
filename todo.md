# 等你补充的内容

## 花海落星

六位制作人的署名已经放进游戏。请在对应行填写希望拾星时显示的寄语。每颗星暂时显示 `xxx`。填好后，将文字同步到 `src/content.ts` 的 `producers[].message`，营火边的星光瓶会显示同一份文字。

| 制作人 | 寄语 | 对应的星 |
| --- | --- | --- |
| 派大星 | xxx | `star-patrick` |
| Kerry | xxx | `star-kerry` |
| 苏颜 | xxx | `star-suyan` |
| 卿取之于蓝 | xxx | `star-qing` |
| 正号 | xxx | `star-zhenghao` |
| 千羽 | xxx | `star-qianyu` |

- [ ] 如有新增制作人，请一并提供展示署名和寄语，每人会多一颗可发现的星。

## 其他待收素材

- [ ] **红笺投递的周年信**　请补正式标题、展示署名和完整正文。当前信封暂名《红笺送来的信》，正文为「这封信的正文还在路上。」交稿后替换 `src/resident-story.ts` 中的 `postLetter` 并递增 `POST_LETTER_REVISION`。保留信件 id，已读过占位信的玩家会重新看到未读提醒。

| 位置 | 可以提供的内容 | 接入位置 |
| --- | --- | --- |
| 庭院小电视 | 正式影片的 CDN 直链和片名，当前使用已提供的占位 MP4 | `src/cinema-config.ts` 的 `gardenFilm` |
| 回忆相册 | 图片原件、每张标题和可选配文或署名 | `src/content.ts` 的 `collections.album.items` |
| 枕边电台 | 录音文件、曲目或节目标题、可选署名 | `collections.radio.items` |
| 小小放映室 | 希望加入收藏的短片文件或直链、片名及可选配文 | `collections.tv.items` |
| 床边便签 | 可选的后续复活鼓励，每条一段，署名可写在文末。小叶子的固定文字和配图已经在游戏中 | `encouragements` |
| 晚安信箱 | 如要继续收信，请提供新来信正文和展示署名。Kerry 的周年来信已经收录 | `collections.letters.items` |

## 正式上线时

- [ ] 确定结束全配饰试穿的时间。正式发布时将 `VITE_WARDROBE_DEBUG` 改为 `false` 并重新构建。
