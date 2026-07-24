<center><div>
  <img src="img/Heading_img.png" style="max-height:100px; max-width:65%" alt="Heading Image">
</div></center>

<center><div width="100%"><span>
  <img src="https://img.shields.io/badge/Latest-1.3.8-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <a href="https://obsidian.md/plugins?id=equation-citator">
  <img src="https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=Downloads&query=%24%5B%22equation-citator%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json" alt="Downloads">
</a>
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
  <img src="https://sonarcloud.io/api/project_badges/measure?project=FRIEDparrot_obsidian-equation-citator&metric=alert_status" alt="Quality Gate">
</span></div></center>

<center><a href="https://friedparrot.github.io/projects/obsidian-equation-citator/en/index.html">English </a> | <a href="https://friedparrot.github.io/projects/obsidian-equation-citator/zh-CN/index.html">简体中文</a></center>

<center><h4>强大、便捷且优雅的学术引用工具</h4></center>

<center><b><h3>感谢 1.7k 下载😄!</h3></b></center> 

---

🚀 **快速入门**：我们提供了**详细的** [网页文档教程](https://friedparrot.github.io/projects/obsidian-equation-citator/tutorials/zh-CN/index.html)，带您了解所有功能（使用插件前请务必查看！）。

✨ **完整功能与更新记录**：详见 [更新日志](https://friedparrot.github.io/projects/obsidian-equation-citator/changelogs/zh-CN/index.html)。

📹 **视频教程**：如果本插件下载量达到 5000 次或仓库获得 50 个 Star，将会录制视频教程。

📱 **平台支持**：本插件已在 **Windows、Linux、Mac 和 Android** 上完成测试（某些功能在移动端可能受限）。

## 🛠️ 安装方式

1. 您可通过社区插件市场安装（`设置` > `第三方插件` > `浏览`，搜索 `equation-citator`）。

2. 或从最新 Release 页面下载 `main.js`、`manifest.json` 和 `style.css`，放置于 Obsidian 仓库的 `.obsidian/plugins/equation-citator` 文件夹中。

## 👋🏻 适用场景

> [!note]
> **以下情况下，本插件会非常有用**：
> - 您在 Obsidian 中撰写学术笔记，需要高效管理大量公式、图表和表格，并支持自动编号与交叉引用
> - 您在 Markdown 中起草论文或技术文档，需要 LaTeX 风格的引用与精确编号
> - 您在笔记中推导公式，需要在推导过程中或跨文件中反复引用这些公式
> - 您在学校或大学笔记中使用 Obsidian，希望快速跳转到被引用内容而无需反复滚动
> - 您的笔记中包含图片、表格或定理类内容，需要系统化的引用与组织

> [!warning]
> **以下情况不适合使用本插件**：
> - 引用 PDF 文件中的公式或内容（本插件不识别或处理 PDF 文件）
> - 管理文献引用或参考文献目录（请使用专用的文献管理插件）
> - 处理图片文件或扫描文档中的公式

## ✨ 功能介绍

### 1. ⚡ 按标题层级自动编号公式与图表

一键自动编号，支持：
- 全部公式 / 仅含标签的公式
- 全部图表 / 仅含标签的图表
- 自动编号后**自动更新引用编号**——在任意位置增删公式或图表，无需担心编号错乱或引用失效
- **右键重命名标签**，公式和图表的标签均可重命名，所有对应引用将自动同步更新

<center><img src="img/auto_number_vid.gif" alt="auto-number" style="zoom: 50%;" /></center>

### 2. 🖼️ 引用公式、图表、表格与定理

<center><img src="img/image_cite_case.png" alt="img-cite-case" style="zoom:100%; max-height: 350px;" /></center> 

- 使用 `\ref{eq:tag}` 语法引用公式，输入时支持完整的自动补全
- 在图片中添加 `fig:` 字段，并使用 `\ref{fig:tag}` 语法引用图表
- 通过**完全可配置的前缀**引用表格和定理标注
- 支持 **Excalidraw 图片**与 **Markdown 章节预览**
- 完整支持**多项引用 & 连续引用 & 跨文件引用**

### 3. 🖥️ 公式管理面板——浏览、跳转与拖拽引用

- 从管理面板中**拖拽公式、图表和标注**至编辑器，快速插入引用
- **筛选与搜索**：在面板中筛选框选公式与带标签公式
- **拖拽引用**支持全类型与跨文件引用
- 在面板或编辑器弹窗中**右键复制**公式
- 从弹窗和公式管理面板中直接**跳转至公式、图表和标注**

<center><img src="img/drag-drop-cite.gif" alt="drag-drop-cite" style="width:600px" /></center>

### 4. 📜 PDF 导出与网站文档支持

1. 运行命令「创建 Markdown 副本以导出 PDF」，生成格式正确、可直接用于 PDF 导出的 Markdown 文件。
  - 正确的引用与参考编号，支持可配置的引用颜色
  - 支持**图片标题/描述中的 Markdown 语法**

<center><img src="img/pdf-export-example.png" alt="drag-drop-cite" style="zoom: 100%; max-height: 350px;" /></center>

2. 您可以使用此功能构建**带有实时引用功能的个人网站**。
  - 为确保链接正确解析，请使用 `Path to vault folder`。
  - 指定一个「网站笔记导出文件夹」来构建您的文档。
  - 您可以**同步单个文件、文件夹或整个仓库**到目标文件夹，引用元数据将被保留，以便在网站上渲染预览。
  - 我们还提供了一个 [npm 包](https://www.npmjs.com/package/@friedparrot/equation-citator)，帮助您在网站中使元素可引用，让笔记轻松部署到网站。可通过 `npm i @friedparrot/equation-citator --save-dev` 安装。

## 🛒 与其他插件的兼容性

以下常用数学类插件已通过与 `Equation Citator` 的兼容性测试，可放心搭配使用。

1. [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) — v1.3.3 后支持在图表引用预览中显示 Excalidraw；像普通图片一样添加 `fig` 字段即可引用。
2. [Typst Mate](https://github.com/azyarashi/obsidian-typst-mate) — 支持 Typst 风格自动编号；通过 `设置 > 分类 > 其他 > 启用 Typst 模式` 开启。
3. [Latex Suite](https://github.com/artisticat1/obsidian-latex-suite) — 与本插件无缝配合，强烈推荐用于快速书写长而复杂的公式。
4. [Completr](https://github.com/tth05/obsidian-completr) — 提供更好的 LaTeX 语法自动补全。
5. [Quick Latex](https://github.com/joeyuping/quick_latex_obsidian) — 提供括号自动放大等功能。
6. [Better math in callouts & blockquotes](https://github.com/RyotaUshio/obsidian-math-in-callout) — 用于在标注中获得更好的数学公式渲染效果。
7. [No More Flickering Inline Math](https://github.com/RyotaUshio/obsidian-inline-math)

## 🚨 免责声明

本插件会对 Obsidian 仓库中的文件进行编辑和更新。

尽管本插件已在多个版本上经过充分测试，并在我自己的仓库中每日使用数月而未出现数据丢失，但仍可能存在未知 Bug，尤其是在引入新功能时。

为保护您的数据，强烈建议在使用本插件前启用 Obsidian 的「文件恢复」核心插件（或保持定期备份）。

虽然我无法对因 Bug 或意外行为导致的数据丢失承担责任，但我会认真对待每一份反馈，并尽快调查和修复导致数据丢失的严重问题。

## 🐛 问题反馈

如遇到 Bug，请在 Issue 页面**提供以下信息**：
1. Bug 或问题的描述，以及复现步骤。
2. 触发问题的相关 Markdown 文本。
3. 在设置标签页中启用调试模式，并提供控制台日志（在 Obsidian 中按 `Ctrl + Shift + I`）。

如有功能建议或使用疑问，也欢迎在 Issue 页面留言。

> [!TIP]
> 由于本插件采用缓存机制以提升性能，轻微的延迟或未能即时更新属于正常的缓存行为。请等待几秒钟，或重新打开文件、重启 Obsidian，确认问题并非仅由缓存延迟引起。

## 💖 参与贡献

有关开发环境设置、命令、测试和 PR 要求，请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。PR 请提交至 `dev-latest` 分支。

## 支持

本插件由我作为业余爱好开发，也用于我的日常工作，对所有人完全免费。由于学期期间较为忙碌，本插件通常每隔几个月更新一次。但问题会被积极关注，插件始终保持活跃维护状态。

感谢 [@azyarashi](https://github.com/azyarashi) 对本插件的协作与重要改进。也感谢所有提出宝贵新功能和增强建议的用户。

本插件源代码已超过 1.6 万行，这增加了问题解决和维护的复杂度。因此，如果本插件对您确实有帮助，不妨请我喝杯咖啡 ☕️：

<center><a href='https://ko-fi.com/Z8Z81N7CMO' target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>
