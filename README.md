# cursor-cn

Cursor 中文化工具。只需 Node.js 24+，无需 npm 依赖。

## 使用

```bash
node cursor-cn.ts
node cursor-cn.ts --restore
node cursor-cn.ts --fix-checksum
```

Windows 可双击 `cursor-cn.bat`，macOS / Linux 可运行 `./cursor-cn.sh`。

- 默认运行：安装语言包并注入界面翻译
- `--restore`：恢复原始文件
- `--fix-checksum`：更新校验值
- `--print-paths`：输出检测到的路径
- `--no-restart`：完成后不重启 Cursor

## 路径

按以下顺序查找 Cursor 安装目录，找到后写入 `cursor-cn.config.json`：

1. `cursor-cn.config.json` 中的 `installDir`
2. 环境变量 `CURSOR_INSTALL_DIR` / `CURSOR_ROOT`
3. 系统默认安装目录
4. 手动输入

用户数据目录默认是 `%APPDATA%\Cursor`（Windows）或 `~/Library/Application Support/Cursor`（macOS），可用 `CURSOR_USER_DATA_DIR` 覆盖。

安装和恢复前会关闭 Cursor，完成后默认自动重启。
