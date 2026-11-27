# 小小芙 · Windows 桌宠

双击 `fufu-pet.exe`，小小芙会出现在主屏工作区左下角。左键拖动；右键打开「大小」选择 50%～500%（100% 为原大小），也可调整透明度或退出。大小会记到本机，下次启动自动恢复。无须安装、不联网、不设置开机启动。

打包：在仓库根目录安装 npm 依赖后，用 PowerShell 运行 `./pc-pet/package.ps1`。脚本会生成素材、测试、编译，并输出 `pc-pet/target/fufu-pet-windows.zip`。

网页和桌面版共用三张 600×750 透明图层，按身体、眼睛、头发与脸的顺序叠放。头身比例由原画决定，不再单独放大身体或缩小头部。`src/launch/fufu-pet/rig.json` 定义颈部支点、眼睛高度及眼球移动范围，单位为画布宽高的比例。调整后重新打包即可同步到桌面版。

使用 Windows x64 Rust 工具链，在仓库根目录先运行 `npm ci`、`node pc-pet/art.mjs`，再运行 `cargo build --release --manifest-path pc-pet/Cargo.toml --locked`。可执行文件在 `pc-pet/target/release/`。网页与原生分层窗口共用 `src/launch/fufu-pet/` 的三张透明 WebP；更改图稿后重新执行素材生成步骤。
