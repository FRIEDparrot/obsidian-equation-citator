<center><div>
  <img src="img/Heading_img.png" style="max-height:100px; max-width:65%" alt="Stars">
</div></center>

<center><div width="100%"><span>
  <img src="https://img.shields.io/badge/Version-1.3.3-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
    <img src="https://img.shields.io/github/downloads/FRIEDparrot/obsidian-equation-citator/total?label=Downloads" alt="Downloads">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
  <img src="https://sonarcloud.io/api/project_badges/measure?project=FRIEDparrot_obsidian-equation-citator&metric=alert_status" alt="Quality Gate">
</span></div></center>
<center><b>English</b> | <a href="README_zh.md" target="_blank"><b>简体中文</b></a></center>
<center><h4>强大、便捷、优雅的学术引用工具</h4> </center> 

---

🚀 **快速开始**：查看[快速入门指南](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials)了解基本规则、语法和最重要的操作。只需不到5分钟，但能让一切顺利进行。

✨ **完整功能与更新**：查看[更新日志](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md)了解详情。

📹 **视频教程**：如果此插件下载量达到5000次或本仓库获得50颗星，即将推出。

> 此插件目前支持桌面端，但我们未来计划支持移动端（Android）。此功能可能会在v1.3.4或更高版本中添加。

## 🛠️ 安装

> 目前此插件正在等待 Obsidian 社区插件审核，详见 [PR #7298](https://github.com/obsidianmd/obsidian-releases/pull/7298)，因此您可能暂时无法在社区插件列表中找到它，请耐心等待。

1.  待本插件在 Obsidian 社区插件中发布后，您可以从社区插件中下载（`设置` > `社区插件` > `浏览` 并搜索 `equation-citator`）。

2.  或者，您可以直接从最新版本的发布页面下载 `main.js`、`manifest.json` 和 `style.css`，并将其放入您的 Obsidian  vault 下的 `.obsidian/plugins/equation-citator` 文件夹中。

3.  此插件也可以通过插件 [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) 安装，只需在 BRAT 的选项选项卡中复制粘贴本仓库的链接即可添加。

## 👋🏻 应用场景与用法

> [!note]
> **本插件在以下情况会非常有用**：
> *   您在 Obsidian 中撰写学术笔记，需要高效管理大量公式，并希望实现自动编号和交叉引用。
> *   您在 Markdown 中起草研究论文或技术文档，并希望使用 LaTeX 风格的公式引用，且引用编号准确无误。
> *   您在笔记中推导公式，并需要在推导过程中或在多个文件之间引用这些公式。
> *   您使用 Obsidian 记录学校或大学笔记，希望无需无尽滚动即可快速跳转到被引用的公式。
> *   您的笔记中包含图形、表格或类似定理的内容，需要系统性的引用和组织。

> [!warning]
> **本插件不适用于**：
> *   引用 PDF 文件内的公式或内容（插件无法识别或处理 PDF 文件）。
> *   管理参考文献或文献引用（请使用专门的文献管理插件）。
> *   需要跨用户实时同步公式编号的协作编辑。
> *   处理图像文件或扫描文档中的公式。

## ✨ 插件功能
### 1. ⚡ **按标题层级自动编号公式**

**只需点击侧边栏图标** <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-function-icon lucide-square-function"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg>
，即可**自动为所有公式编号**，让公式管理和引用变得极其简单。（引用会自动更新，因此您可以轻松插入或删除任何公式）

<center><img src="img\auto_number_vid.gif" alt="auto-number" style="zoom: 50%;" /></center>

### 2. 🖥️ **紧凑的公式管理面板，拖拽引用**

通过从公式管理面板拖拽公式来引用。支持多公式引用和跨文件引用。

<center><img src="img\drag-drop-cite.gif" alt="drag-drop-cite" style="zoom: 50%;" /></center>

### 3. 🖼️ 引用图片、表格甚至定理

通过添加字段来引用图片。通过引用引用功能来引用表格和定理。**Excalidraw 图片**和 Markdown 章节也支持。

<center><img src="img\image_cite_case.png" alt="img-cite-case" style="zoom:100%; max-height: 350px; " /></center>

### 4. 📜 **PDF 导出支持**
不直接导出 PDF，运行命令 `Make markdown copy to export PDF` 生成正确的 Markdown 副本，以便您导出为 PDF。

导出后的 PDF 将如下图所示，包含正确的引用和参考文献编号：

<center><img src="img\pdf-export-example.png" alt="pdf-export-example" style="zoom:100%; max-height: 350px; " /></center>

## 🛒 与其他插件的兼容性

以下常用于数学的插件已测试与 `Equation Citator` 兼容，您可以同时使用它们而没有任何问题。

1.  [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin)，从 1.3.3 版本开始，Excalidraw 在图形引用预览中得到支持，您可以通过像普通图片一样添加 `fig` 字段来引用 Excalidraw 绘图。
2.  [Typst Mate](https://github.com/azyarashi/obsidian-typst-mate)。此插件支持 Typst 风格的自动编号，您可以在 `设置 > 分类 > 其他 > 启用 typst 模式` 中启用它。
3.  [Latex Suite](https://github.com/artisticat1/obsidian-latex-suite)，它可以与本插件无缝协作，我强烈建议使用它来快速编写长而复杂的公式。
4.  [Completr](https://github.com/tth05/obsidian-completr)，它为 LaTeX 语法提供更好的自动补全。
5.  [Quick Latex](https://github.com/joeyuping/quick_latex_obsidian)。它提供如自动放大括号等功能。
6.  [Better math in callouts & blockquotes](https://github.com/RyotaUshio/obsidian-math-in-callout)。直接使用它可在标注中获得更好的数学渲染效果。
7.  [No More Flickering Inline Math](https://github.com/RyotaUshio/obsidian-inline-math)

## 🚨 免责声明

此插件可以编辑和更新您 Obsidian vault 中的文件。

尽管它已在多个版本上经过全面测试，并在我的个人 vault 中日常使用了数月，未发生数据丢失，但引入新功能时仍可能出现意外错误。

为了保护您的数据，我强烈建议在使用此插件前启用“文件恢复”核心插件（或定期备份）。

虽然我无法对因错误或意外行为导致的数据丢失承担责任，但我会认真对待报告，并尽快调查和修复任何导致数据丢失的关键问题。

## 🐛 错误与报告

如果您遇到任何错误，请在议题页面**提供以下信息**：
1.  错误或问题的描述，以及重现步骤。
2.  触发该问题的相关 Markdown 文本。
3.  在设置选项卡中启用调试模式，并提供控制台日志（在 Obsidian 中按 Ctrl + Shift + I）。

此外，如果您对此插件有建议或疑问，欢迎在议题页面提出。

> [!TIP]
> 由于本插件为了更好的性能而采用了缓存机制，正常的延迟或更新不及时是缓存相关的常见行为。因此，您可以等待几秒钟，或重新打开文件，或重启 Obsidian，以确保您遇到的问题不仅仅是正常的缓存相关行为。

## 💖 支持与协作

我将此插件作为业余爱好开发，并在日常工作中使用。它对所有人完全免费。

*   💖 如果有人能帮助我维护这个插件，我将非常高兴（因为我在上学期间比较忙）。

> [!NOTE]
>
> **始终欢迎贡献者和维护者**：
> 您可以通过简单的 Fork 本仓库并提交 PR 来为此插件做出贡献：
>   1. **在提交 PR 之前，请仔细测试您的代码！**。
>   2. 将您所做的工作添加到 `CHANGELOG.md` 中。（如果 `CHANGELOG.md` 中没有计划新的次要版本，请使用下一个补丁版本号）
>   3. 在合并 PR 之前，我们有一些 CI 检查，请确保您的代码通过所有检查。
>
> 提交 PR 时，请将其提交到 `dev-latest` 分支，这是最新的开发分支，为了方便我们测试和调试，我将始终将我的开发分支同步到此分支，以防止潜在的合并冲突。

感谢 [@azyarashi](https://github.com/azyarashi) 的协作以及对插件的实质性改进。我也感谢所有提出有用新功能和改进建议的用户。

最后，如果您觉得这个插件有帮助，可以考虑在此赞助 ☕️：

<center><a href='https://ko-fi.com/Z8Z81N7CMO' target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>