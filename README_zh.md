<center><div>
  <img src="img/Heading_img.png" style="max-height:100px; max-width:65%" alt="Stars">
</div></center>

<center><div width="100%"><span>
  <img src="https://img.shields.io/badge/Version-1.3.3-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <img src="https://img.shields.io/github/downloads/FRIEDparrot/obsidian-equation-citator/total?label=Downloads">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
  <img src="https://sonarcloud.io/api/project_badges/measure?project=FRIEDparrot_obsidian-equation-citator&metric=alert_status" alt="Quality Gate">
</span></div></center>

<center><a href="README.md" target="_blank"><b>English</b></a> | <b>简体中文</b></center>
<center><h4>一个强大、便捷且优雅的学术引用工具</h4></center>

---

🚀 **快速开始**：请参阅 [快速开始](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials) 了解基本规则、语法和最重要的操作。只需不到 5 分钟，即可让一切顺利运行。

✨ **完整功能与更新**：详见 [更新日志](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md)。

📹 **视频教程**：如果本插件下载量达到 5000 或本仓库获得 50 个星标，即将推出。

> 本插件支持 [typst 风格自动编号](https://github.com/azyarashi/obsidian-typst-mate)。您可以使用 `设置 > 分类 > 其他设置 > 启用 typst 模式` 来启用它。

## 🛠️ 安装方法

1.  在该插件发布到 Obsidian 社区插件后，您可以从社区插件中下载（`设置` > `第三方插件` > `浏览` 并搜索 `equation-citator`）。

2.  或者，您也可以直接从最新发布页面下载 `main.js`、`manifest.json` 和 `style.css` 文件，然后将它们放入您 Obsidian 库根目录下的 `.obsidian/plugins/equation-citator` 文件夹中。

## ✨ 本插件功能

### 1. ⚡ **按标题级别自动为公式编号**

**只需点击侧边栏图标 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-function-icon lucide-square-function"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg>，即可一键自动编号所有公式**，使它们易于管理和引用。（引用会自动更新，因此您可以轻松插入或删除任何公式）

<center><img src="img\auto_number_vid.gif" alt="auto-number" style="zoom: 50%;" /></center>

### 2. 🖥️ **紧凑的公式管理面板，拖拽即可引用**

通过从公式管理面板拖拽来引用公式。支持多公式引用和跨文件引用。

<center><img src="img\drag-drop-cite.gif" alt="drag-drop-cite" style="zoom: 50%;" /></center>

### 3. 🖼️ 引用图片、表格乃至定理

通过添加字段来引用图片。通过引用插图 (Callout) 功能引用表格和定理。

<center><img src="img\image_cite_case.png" alt="img-cite-case" style="zoom:100%; max-height: 350px; " /></center>

### 4. 📜 **PDF 导出支持**

不直接导出 PDF，运行命令 `Make markdown copy to export PDF` 来生成一个完整的、可供您导出的 PDF 版本。

<center><img src="img\pdf-export-example.png" alt="pdf-export-example" style="zoom:100%; max-height: 350px; " /></center>

## 🚨 免责声明

本插件可以编辑和更新您 Obsidian 库中的文件。

尽管它已经在多个版本上经过充分测试，并且在我自己的库中日常使用了数月而没有发生数据丢失，但仍可能出现意外的错误——尤其是在引入新功能时。

为保护您的数据，我强烈建议在使用本插件前启用“文件恢复”核心插件（或保持定期备份）。

虽然我对由错误或意外行为导致的数据丢失无法承担责任，但我会认真对待所有报告，并尽快调查和修复任何导致数据丢失的关键问题。

## 🐛 错误与报告

如果您遇到任何错误，请在 issue 页面**提供以下信息**：
1.  对错误或问题的描述，以及重现它的步骤。
2.  触发该问题的相关 Markdown 文本。
3.  在设置选项卡中启用调试模式，并提供控制台日志（在 Obsidian 中按 Ctrl + Shift + I）。

> [!TIP]
> 由于本插件具有缓存机制以提升性能，正常的延迟或未能及时更新是与此相关的正常行为。因此，您可能需要等待几秒钟，或重新打开文件或重启 Obsidian，以确保您遇到的问题不仅仅是正常的缓存相关行为。

## 💖 支持与协作

我作为业余爱好开发了这个插件，并在日常工作中使用它。它完全免费供所有人使用。

- 💖 如果有人能帮助我维护这个插件，我将非常高兴（因为我在学校期间很忙）。

**贡献者和维护者随时欢迎**：
- 您可以通过简单地 Fork 此仓库并提交 PR 来为这个插件做出贡献：
  - 1. **提交 PR 前请仔细测试您的代码！**。
  - 2. 将您所做的更改添加到 `CHANGELOG.md` 中。（如果 `CHANGELOG.md` 中没有计划新的次要版本，请使用下一个补丁版本号）
  - 3. 我们有 CI 检查在合并 PR 之前，请确保您的代码通过所有检查。

> [!WARNING]
> 
> 提交 PR 时，请将其提交到 `dev-latest` 分支，这是最新的开发分支，为了方便我们测试和调试，我会始终将我的开发分支同步到此分支，以防止潜在的合并冲突。

感谢 [@azyarashi](https://github.com/azyarashi) 的合作和对插件的重大改进。我也感谢所有建议有用新功能和增强的用户。

最后，如果您觉得这个插件对您有帮助，可以考虑在此赞助 ☕️：

<center><a href='https://ko-fi.com/Z8Z81N7CMO'  target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>