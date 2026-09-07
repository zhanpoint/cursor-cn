# cursor-cn

Cursor 中文化工具。只需 Node.js 24+，无需 npm 依赖。

## 使用

```bash
node cursor-cn.ts
node cursor-cn.ts --restore
node cursor-cn.ts --fix-checksum
```

Windows 请双击 `cursor-cn.bat`，不要双击 `cursor-cn.ts`。macOS / Linux 运行 `./cursor-cn.sh`。

- 默认运行：安装语言包并注入界面翻译
- `--restore`：恢复原始文件
- `--fix-checksum`：更新校验值
- `--print-paths`：输出检测到的路径
- `--no-restart`：完成后不重启 Cursor

## 路径

按以下顺序查找 Cursor 安装目录：

1. `cursor-cn.config.json` 中上次保存的 `installDir`
2. 环境变量 `CURSOR_INSTALL_DIR` / `CURSOR_ROOT`
3. 系统默认安装目录
4. 手动输入；校验通过后写入 `cursor-cn.config.json`，下次无需再填

Windows 默认目录是 `%LOCALAPPDATA%\Programs\cursor`。如果 Cursor 装在其他盘，例如 `D:\cursor`，第一次运行时输入该路径即可。

用户数据目录默认是 `%APPDATA%\Cursor`（Windows）或 `~/Library/Application Support/Cursor`（macOS），可用 `CURSOR_USER_DATA_DIR` 覆盖。

安装和恢复前会关闭 Cursor，完成后默认自动重启。
