# 信封、信纸与火漆

[config.json](config.json) 管理游戏内拆信和展开信纸时的外观。`themes` 的键取自[来信目录](../letters.json)的 `id`。两封信即使署名相同，也可以各用一套信笺。未单独配置的新信会用 `default` 里的铃兰信封、狐狸信纸与莓果火漆。

## 换一套信笺

1. 参照本目录已有的 `kerry/` 等文件夹建一个素材目录。目录名可以自定，署名写在来信 JSON 的 `author` 里。
2. 把自己的图片放进去。在 `config.json` 的 `themes` 中加入下列条目，把示例键替换成这封信的实际 ID。
3. 在仓库根目录运行 `npm run scan:letters` 核对配置。运行 `npm run dev` 后，在游戏内查看密封、拆封和展开信纸时的效果；调试版可通过「调试 → 快捷收信」领取样本。提交新图和配置即可。

```json
{
  "goodnight-010": {
    "title": "月下寄语",
    "pocket": "_shared/stationery-plain-pocket.webp",
    "lining": "_shared/stationery-silver-lining.webp",
    "motif": "moon/motif.webp",
    "seal": "moon/seal.webp",
    "paper": "moon/paper.webp",
    "flapTint": "#DBE4F1", "pocketTint": "#CADEE6", "liningTint": "#8497AD",
    "paperTint": "#F8FAFC", "ink": "#344352", "accent": "#566887"
  }
}
```

| 配置项 | 作用 |
| --- | --- |
| `title` | 维护用主题名，每套定制都要填 |
| `flap`、`pocket`、`lining` | 分别是外封舌、V 形信袋、连成一张图的内封舌与里衬。替换时沿用 `_shared/` 对应原图的尺寸和铰链位置 |
| `motif` | 印在信封上的主题小插画，透明图层。留出少量透明边距，保留主体完整轮廓 |
| `motifPlacement` | 可选。`upper-right` 把图案印在封舌右上，拆封时会随封舌翻转。省略时印在信袋左下 |
| `seal` | 独立火漆图，使用透明背景，印纹居中，小尺寸也应看得清 |
| `paper` | 抽出和展读时的信纸。把图案放在纸边和纸角，中央给正文留白 |
| `paperSlices` | 可选。按上、右、下、左填写原图中四条边的像素宽度，让较高的插画完整落在同一角。对边宽度之和须小于原图对应尺寸。展开后四角按同一比例缩放 |
| `flapTint`、`pocketTint`、`liningTint`、`paperTint` | 封舌、信袋、内衬及信纸配色，使用 `#RRGGBB`，白色保留原图颜色 |
| `neutralStock` | 浅青、雾蓝等冷色信封可设为 `true`，封舌和信袋按原图明暗与纸纹着色。省略时保留底纸原色 |
| `ink`、`accent` | 正文墨色及强调色，建议在浅色纸上使用深色 |

每个主题都可以只写 `title` 和要改的字段，其余沿用 `default`。图片路径从本目录起算，用正斜线，可用小写扩展名 `.webp`、`.png`、`.jpg`、`.jpeg`、`.avif`。扫描和完整构建会检查信件 ID、路径大小写、缺图和颜色格式。已发布的信可随时换装饰，保持原 ID 即可保留玩家的收信、拆封记录。
