<div align="center">

# cursor-cn

为 Cursor 补齐简体中文，让熟悉的界面更亲切。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-5FA04E.svg)](https://nodejs.org/)

[下载最新版](https://github.com/zhanpoint/cursor-cn/releases/latest) · [快速上手](#快速上手) · [问题反馈](https://github.com/zhanpoint/cursor-cn/issues)

</div>

结合官方简体中文语言包与本地翻译词典，补齐 Cursor 专有界面的中文文案。仅使用 Node.js 内置模块，无需安装 npm 依赖。

## 快速上手

**准备环境**：安装 Cursor 和 [Node.js 24+](https://nodejs.org/)。无需运行 `npm install`。

1. 打开[最新发布页](https://github.com/zhanpoint/cursor-cn/releases/latest)，下载 **Assets → Source code (zip)** 并解压。
2. 保存 Cursor 中正在编辑的文件。
3. **Windows**：双击解压目录中的 `cursor-cn.bat`。**macOS**：在该目录打开终端，运行 `bash cursor-cn.sh`。

等待终端提示完成，Cursor 会自动重新启动。以后直接使用原有快捷方式打开即可。首次运行若提示安装路径，填写 Cursor 实际安装目录。

<details>
<summary>使用 Git 和命令行</summary>

```bash
git clone https://github.com/zhanpoint/cursor-cn.git
cd cursor-cn
node cursor-cn.ts
```

不要双击 `.ts` 文件。工具运行时会关闭 Cursor，请先保存文件。

</details>

## 功能

- **界面汉化**：补齐设置、智能体、规则、命令、菜单、提示与插件市场等界面文案。
- **动态翻译**：跟随界面加载与文本更新处理翻译，跳过代码编辑区和可编辑内容。
- **语言包适配**：匹配 Cursor 内置的 VS Code 版本，安装官方简体中文语言包。
- **备份与恢复**：备份被修改的原始文件，支持恢复和文件校验值修复。
- **词典维护**：翻译词典与运行引擎分离，便于补充遗漏和适配新版本。

## 使用与配置

Cursor 更新后可能覆盖界面翻译，重新运行本工具即可。通过 Git 获取项目的用户可先执行 `git pull` 更新词典，再重新应用。

### 常用命令

| 命令 | 作用 |
| --- | --- |
| `node cursor-cn.ts` | 安装或更新汉化 |
| `node cursor-cn.ts --restore` | 恢复原始界面文件，完成后手动启动 Cursor |
| `node cursor-cn.ts --fix-checksum` | 修复文件校验值 |
| `node cursor-cn.ts --print-paths` | 查看检测到的安装与用户数据路径 |
| `node cursor-cn.ts --no-restart` | 应用汉化后不自动启动 Cursor |

`--restore` 不会卸载已安装的官方语言包。

### 自定义路径

优先读取项目目录中的 `cursor-cn.config.json`，其次读取环境变量和系统默认安装目录。未检测到有效目录时，会提示输入安装路径并保存，后续无需重复填写。

Windows 默认安装目录为 `%LOCALAPPDATA%\Programs\cursor`；安装在其他位置时，输入实际目录，例如 `D:\App\cursor`。

| 环境变量 | 作用 |
| --- | --- |
| `CURSOR_INSTALL_DIR` / `CURSOR_ROOT` | 指定 Cursor 安装目录；已有配置时优先使用配置 |
| `CURSOR_USER_DATA_DIR` | 覆盖 Cursor 用户数据目录 |
| `CURSOR_LANGUAGE_PACK_VSIX` | 使用本地、版本匹配的简体中文语言包 VSIX |

## 常见问题

**还有英文文案？** 更新项目并重新运行。若仍有遗漏，请在 Issue 中附上 Cursor 版本、界面截图和英文原文。

**提示文件损坏或校验异常？** 运行 `node cursor-cn.ts --fix-checksum`；需要撤销界面修改时使用 `--restore`。

**语言包下载失败？** 检查网络，或通过 `CURSOR_LANGUAGE_PACK_VSIX` 指定匹配版本的本地语言包。专有界面词典翻译仍可独立应用。

## 参与贡献

欢迎通过 [Issue](https://github.com/zhanpoint/cursor-cn/issues) 反馈问题，或提交 [Pull Request](https://github.com/zhanpoint/cursor-cn/pulls) 改进翻译。

- 通用文案：[`localization/core.json`](localization/core.json)
- 动态文案：[`localization/patterns.json`](localization/patterns.json)
- 场景词典与翻译引擎：[`localization/`](localization/)

修改时请沿用现有结构，保留产品名称、命令与参数。翻译词典修改后需重新运行工具才能应用。

```bash
node --test localization.test.js
```

## 许可

[MIT](LICENSE) © [zhanpoint](https://github.com/zhanpoint)

本项目由个人维护，与 Cursor 官方无关联；不同 Cursor 版本的文案覆盖情况可能有所差异。
