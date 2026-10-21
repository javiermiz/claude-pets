# Claude Pets

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · **简体中文** · [한국어](README.ko.md)

把你的 [Claude Code](https://claude.com/claude-code) 会话变成 8 位像素宠物，在 Mac 屏幕底部走来走去。

![Claude Pets](docs/zoo.png)

- **这台 Mac 上每个正在工作的会话都是一只宠物。** 同一个会话总是同一种动物（共 23 种），头顶显示会话名称。
- **工作中**的宠物四处走动；**已完成**的会躺下并显示绿色 ✓，等你点击。
- **点击**宠物即可在 Claude 桌面应用中打开对应会话。
- **鼠标悬停**会显示卡片：项目、状态、持续时间、子会话和正在运行的子代理。
- **子代理**会变成小宠物，排成一队跟在父会话后面。由其他会话启动的**子会话**带有 `↳` 标记。
- **后台任务也算数：** 正在等待后台命令或子代理的会话会显示 ⏳，并一直走动到任务结束。
- 空白区域的**点击会直接穿透**，不会挡住你的操作。
- **支持多种语言：** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어（跟随系统语言）。

![Walk cycle](docs/cat-walk.png)

## 安装

需要 macOS 14 或更高版本，以及 Xcode Command Line Tools（`xcode-select --install`）。

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

安装脚本会在你的 Mac 上从源码构建应用，并放到 `~/Applications/ClaudePets.app`。之后可以通过聚焦搜索（“Claude Pets”）打开。

或者从克隆的仓库安装：

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

**也可以直接下载已编译好的应用：** 从 [Releases](https://github.com/javiermiz/claude-pets/releases/latest) 下载 `ClaudePets.zip`，解压后把 `ClaudePets.app` 移到“应用程序”文件夹。该应用未经过 Apple 公证，首次打开时 macOS 会阻止它：打开**系统设置 → 隐私与安全性**，点击**仍要打开**，或者运行 `xattr -dr com.apple.quarantine /Applications/ClaudePets.app`。

菜单栏中的 🐾 提供**登录时打开**和**退出**。右键点击宠物也可以退出。

要更新，再运行一次安装命令即可。要卸载，退出应用并删除 `~/Applications/ClaudePets.app`。

## 工作原理

一切都在本地、只读进行，任何数据都不会离开你的 Mac。

| 内容 | 来源 |
| -- | -- |
| 会话、名称、工作中/空闲 | `~/.claude/sessions/<pid>.json` |
| 子代理（最近 60 秒内有写入即视为运行中；描述来自 `*.meta.json`） | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| 子会话（来自父会话的记录） | `start_session` → `session_id: local_…` |
| 后台命令（子进程） | `zsh`/`bash` ⟵ `claude` |
| 打开会话（桌面应用的深层链接） | `claude://code/continue?session=<id>` |

限制：

- 只显示这台 Mac 上的会话。云端会话不会写入 `~/.claude`。
- 只显示应用启动后出现过工作状态的会话。
- 一直运行的后台服务器（例如开发服务器）会让它的宠物一直走，直到你停止它。

## 修改像素画

精灵图以代码形式写在 [`pets.px.js`](pets.px.js) 中，使用像素画语言 pxl。每种动物由一个 16×9 的身体加一种腿部样式组成，走路动画、描边和躺下的姿势都由此生成。生成好的精灵图放在 `assets/` 中，所以构建应用不需要 pxl。修改后重新生成像素画并重新构建：

```sh
./sprites.sh && ./build.sh
```
