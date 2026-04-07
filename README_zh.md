<center><div>
  <img src="img/Heading_img.png" style="max-height:100px; max-width:65%" alt="Stars">
</div></center>

<center><div width="100%"><span>
  <img src="https://img.shields.io/badge/Version-1.3.4-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <img src="https://img.shields.io/github/downloads/FRIEDparrot/obsidian-equation-citator/total?label=Downloads" alt="Downloads">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
  <img src="https://sonarcloud.io/api/project_badges/measure?project=FRIEDparrot_obsidian-equation-citator&metric=alert_status" alt="Quality Gate">
</span></div></center>
<center><a href="README.md" target="_blank"><b>English</b></a> | <b>简体中文</b></center>
<center><h4>强大、便捷且优雅的学术引用工具</h4></center>

---

🚀 **快速入门**：请查阅 [快速入门教程](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials)，了解基本规则、语法与核心操作。只需不到 5 分钟，即可顺畅上手。

✨ **完整功能与更新记录**：详见 [更新日志](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md)。

📹 **视频教程**：如果本插件下载量达到 5000 次或仓库获得 50 个 Star，将会录制视频教程。

📱 **平台支持**：本插件已在 **Windows、Linux、Mac 和 Android** 上完成测试。（主要面向 Windows 平台开发，Android 支持在 v1.3.3 后加入，部分功能——如拖拽引用和某些预览——在移动端可能受限。）

## 🛠️ 安装方式

> 本插件目前正在等待 Obsidian 社区插件审核，详见 [PR #7298](https://github.com/obsidianmd/obsidian-releases/pull/7298)，暂时无法在社区插件列表中搜索到，请耐心等待。

1. 插件发布后，可通过社区插件安装（`设置` > `第三方插件` > `浏览`，搜索 `equation-citator`）。

2. 或从最新 Release 页面下载 `main.js`、`manifest.json` 和 `style.css`，放置于 Obsidian 仓库的 `.obsidian/plugins/equation-citator` 文件夹中。

3. 也可通过插件 [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) 安装，将本仓库链接粘贴到 BRAT 的选项页中即可。

## 👋🏻 适用场景

> [!note]
> **以下情况下，本插件会非常有用**：
> - 在 Obsidian 中撰写学术笔记，需要高效管理大量公式、图表，并支持自动编号与交叉引用
> - 在 Markdown 中起草论文或技术文档，需要 LaTeX 风格的引用与精确编号
> - 在笔记中推导公式，需要在同一文件或跨文件中反复引用这些公式
> - 在学校或大学笔记中使用 Obsidian，希望快速跳转到被引用内容而无需反复滚动
> - 笔记中包含图片、表格或定理类内容，需要系统化地管理引用与编号

> [!warning]
> **以下情况不适合使用本插件**：
> - 引用 PDF 文件中的公式或内容（本插件不识别或处理 PDF 文件）
> - 管理文献引用（请使用专用的文献管理插件）
> - 多人实时协作编辑并自动同步公式编号
> - 处理图片文件或扫描文档中的公式

## ✨ 功能介绍

### 1. ⚡ 按标题层级自动编号公式与图片

一键自动编号，支持：
- 全部公式 / 仅含标签的公式
- 全部图片 / 仅含标签的图片
- 自动编号后**自动更新引用编号**——在任意位置增删公式或图片，无需担心编号错乱或引用失效
- **右键重命名标签**，所有对应引用将自动同步更新

<center><img src="img/auto_number_vid.gif" alt="auto-number" style="zoom: 50%;" /></center>

### 2. 🖼️ 引用公式、图片、表格与定理

- 使用 `\ref{eq:tag}` 语法引用公式，支持完整的自动补全
- 在图片语法中添加 `fig:` 字段，并使用 `\ref{fig:tag}` 引用图片
- 通过 Callout 引用语法引用表格与定理，支持完全自定义的前缀配置
- 支持 **Excalidraw 图片**与 **Markdown 章节预览**
- 完整支持**多项引用 & 连续引用 & 跨文件引用**

<center><img src="img/image_cite_case.png" alt="img-cite-case" style="zoom:100%; max-height: 350px;" /></center>

### 3. 🖥️ 公式管理面板——浏览、跳转与拖拽引用

- 从管理面板中**拖拽** **公式、图片或 Callout** 至编辑器，快速插入引用
- **筛选与搜索**：可按"带方框公式"或"含标签公式"进行过滤
- **拖拽引用**支持全类型与跨文件引用
- 在面板或编辑器弹窗中**右键复制**公式
- 从弹窗或管理面板中直接**跳转**至公式、图片或 Callout 所在位置

<center><img src="img/drag-drop-cite.gif" alt="drag-drop-cite" style="zoom: 50%;" /></center>

<!-- 占位符：面板中切换公式 / 图片 / Callout 视图的 GIF 演示 -->

### 4. 📜 PDF 导出

运行命令 `Make markdown copy to export PDF`，生成格式正确、可直接用于 PDF 导出的 Markdown 文件，支持：
- 全文正确的引用与参考编号
- 可配置的**引用颜色**
- 导出内容中可选的**图片标题与描述**

<center><img src="img/pdf-export-example.png" alt="pdf-export-example" style="zoom:100%; max-height: 350px;" /></center>

## 🛒 与其他插件的兼容性

以下常用数学类插件已通过与 `Equation Citator` 的兼容性测试，可放心搭配使用。

1. [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) — v1.3.3 后支持在图片引用预览中显示 Excalidraw 图形；像普通图片一样添加 `fig` 字段即可引用。
2. [Typst Mate](https://github.com/azyarashi/obsidian-typst-mate) — 支持 Typst 风格自动编号；在 `设置 > Categorical > Others > 启用 Typst 模式` 中开启。
3. [Latex Suite](https://github.com/artisticat1/obsidian-latex-suite) — 与本插件无缝配合，强烈推荐用于快速书写长而复杂的公式。
4. [Completr](https://github.com/tth05/obsidian-completr) — 提供更好的 LaTeX 语法自动补全。
5. [Quick Latex](https://github.com/joeyuping/quick_latex_obsidian) — 提供括号自动放大等功能。
6. [Better math in callouts & blockquotes](https://github.com/RyotaUshio/obsidian-math-in-callout) — 用于在 Callout 中获得更好的数学公式渲染效果。
7. [No More Flickering Inline Math](https://github.com/RyotaUshio/obsidian-inline-math)

## 🚨 免责声明

本插件会对 Obsidian 仓库中的文件进行编辑和更新。

尽管本插件已在多个版本上经过充分测试，并在我自己的仓库中每日使用数月而未出现数据丢失，但仍可能存在未知 Bug，尤其是在引入新功能时。

为保护您的数据，强烈建议在使用本插件前启用 Obsidian 的"文件恢复"核心插件，或定期进行手动备份。

虽然我无法对因 Bug 或意外行为导致的数据丢失承担责任，但我会认真对待每一份反馈，并尽快调查和修复导致数据丢失的严重问题。

## 🐛 问题反馈

如遇到 Bug，请在 Issue 页面**提供以下信息**：
1. Bug 的描述及复现步骤。
2. 触发问题的相关 Markdown 文本。
3. 在设置中启用调试模式，并提供控制台日志（在 Obsidian 中按 `Ctrl + Shift + I`）。

如有功能建议或使用疑问，也欢迎在 Issue 页面留言。

> [!TIP]
> 由于本插件采用缓存机制以提升性能，轻微的延迟或未能即时更新属于正常的缓存行为。请等待几秒钟，或重新打开文件、重启 Obsidian，确认问题并非由缓存延迟引起。

## 💖 支持与协作

本插件由我作为业余爱好开发，也用于我的日常工作，对所有人完全免费。

- 💖 如果有人能帮助我维护本插件，我将非常感谢（因为我在学习期间时间有限）。

> [!NOTE]
>
> **欢迎贡献者与维护者加入**：
> 您可以通过 Fork 本仓库并提交 PR 来参与贡献：
> 1. **提交 PR 前请务必仔细测试您的代码！**
> 2. 将您的改动记录添加到 `CHANGELOG.md` 中。（若未计划新的小版本，请使用下一个补丁版本号。）
> 3. 合并前有 CI 检查，请确保您的代码通过所有检查。
>
> 提交 PR 时，请将代码提交到 `dev-latest` 分支。这是最新的开发分支，我会始终将我的开发分支同步至此，以避免潜在的合并冲突。

感谢 [@azyarashi](https://github.com/azyarashi) 对本插件的协作与重要改进，也感谢所有提出宝贵建议和功能需求的用户。

如果本插件对您有所帮助，欢迎在此处赞助我 ☕️：

<center><a href='https://ko-fi.com/Z8Z81N7CMO' target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>