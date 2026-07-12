<center><div>
  <img src="img/Heading_img.png" style="max-height:100px; max-width:65%" alt="Heading Image">
</div></center>

<center><div width="100%"><span>
  <img src="https://img.shields.io/badge/Latest-1.3.5-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <a href="https://obsidian.md/plugins?id=equation-citator">
  <img src="https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=Downloads&query=%24%5B%22equation-citator%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json" alt="Downloads">
</a>
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
  <img src="https://sonarcloud.io/api/project_badges/measure?project=FRIEDparrot_obsidian-equation-citator&metric=alert_status" alt="Quality Gate">
</span></div></center>

<center><a href="https://friedparrot.github.io/projects/obsidian-equation-citator/en/index.html">English </a> | <a href="https://friedparrot.github.io/projects/obsidian-equation-citator/zh-CN/index.html">简体中文</a></center>

<center><h4>A Powerful, Convenient & Elegant Academic Tool for Citation</h4></center>

<center><b><h3>Thanks for 1.7k downloads😄!</h3></b></center> 

---

🚀 **Get Started**: We have **step-by-step** [web-docs tutorial](https://friedparrot.github.io/projects/obsidian-equation-citator/tutorials/en/index.html) to go through all the features for you (please check this before using the plugin!).

✨ **Complete Features & Updates**: See [Changelog](https://friedparrot.github.io/projects/obsidian-equation-citator/changelogs/en/index.html) for details.

📹 **Video Tutorial**: Coming soon if this plugin has 5000 downloads or this repo gets 50 stars. 
 
📱 **Platform support**: This plugin has been tested on **Windows, Linux, Mac, and Android** (certain functions may be limited on mobile).

## 🛠️ Installation

1. You can download it from community plugins (`Settings` > `Community plugins` > `Browse` and search for `equation-citator`).

2. Or you can download `main.js`, `manifest.json` and `style.css` from the latest release page and place them in `.obsidian/plugins/equation-citator` in your Obsidian vault.

## 👋🏻 Applications & Usages

> [!note]
> **This plugin would be pretty useful if**:
> - You're writing academic notes in Obsidian and need to manage numerous equations, figures, and tables efficiently with automatic numbering and cross-references
> - You're drafting research papers or technical documents in Markdown and want LaTeX-style citation with accurate numbering
> - You derive equations in your notes and need to reference them throughout your derivation process or across multiple files
> - You use Obsidian for school or university notes and want quick navigation to cited content without endless scrolling
> - You have figures, tables, or theorem-like content in your notes that requires systematic referencing and organization

> [!warning]
> **This plugin is NOT designed for**:
> - Citing equations or content within PDF files (PDFs are not recognized or processed by the plugin)
> - Managing bibliographic references or literature citations (use a dedicated citation management plugin instead)
> - Processing equations in image files or scanned documents

## ✨ What this plugin does

### 1. ⚡ Auto-number Equations & Figures by Heading Level

One-click auto-numbering support for:
- All equations / tagged equations only
- All figures / tagged figures only
- Full support for **auto-updating citation numbers** — add or delete equations and figures anywhere without worrying about broken numbering or citations
- **Right-click to rename tags** for equations and figures, with all citations updated automatically

<center><img src="img/auto_number_vid.gif" alt="auto-number" style="zoom: 50%;" /></center>

### 2. 🖼️ Cite Equations, Figures, Tables and Theorems

<center><img src="img/image_cite_case.png" alt="img-cite-case" style="zoom:100%; max-height: 350px;" /></center> 

- Cite equations with `\ref{eq:tag}` syntax, with full autocomplete support when typing. 
- Cite figures by adding a `fig:` field to the image and using `\ref{fig:tag}` syntax.
- Cite tables and theorems callout citation with **fully configurable prefixes**.
- Support for **Excalidraw images** and **markdown section previews**.
- Full support on **multiple citation & continuous citation & cross-file citation**.

### 3. 🖥️ Equation Manage Panel — Browse, Jump and Cite by Drag and Drop

- Browse and cite **equations, figures, and callouts** by **drag and drop** from the manage panel
- **Filter and search**, filter boxed equations & tagged equations in panel. 
- **Drag-drop citations** with all-type, cross-file support
- **Right-click to copy** equations directly from the panel or editor popover
- **Jump to equations**, figures and callouts directly from the popover and Equation Manage Panel

<center><img src="img/drag-drop-cite.gif" alt="drag-drop-cite" style="width:600px" /></center>

<!-- PLACEHOLDER: gif of switching between equation / figure / callout view in the panel -->

### 4. 📜 PDF Export & Web documentation support 
1. Run the command `Make markdown copy to export PDF` to generate a properly formatted markdown file ready for PDF export. 
  - Correct citation and reference numbers with configurable citation colors
  - Support for **markdown grammar inside title/caption for figures** 

<center><img src="img/pdf-export-example.png" alt="drag-drop-cite" style="zoom: 100%; max-height: 450px;" /></center>

2. You can build your **own website using with live reference feature** with this support. 
  - To ensure links are correctly resolved, use `Path to vault folder`.
  - Specify a `Website notes export folder` to build your documentation.  
  - You can **sync Single file, folders or entire repository** to the desination folder, the citation meta-data can be preserved for rendering the preview on the website.
  - We also an [npm package](https://www.npmjs.com/package/@friedparrot/equation-citator) to help you to make the elements citable in the website to make your notes to be easily deployed to a website. This can be installed by `npm i @friedparrot/equation-citator --save-dev`. 

## 🛒 Compatibility with other plugins

The following plugins often used for math are tested to be compatible with `Equation Citator` — you can use them together without any problem.

1. [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) — Excalidraw is supported in figure citation preview after v1.3.3; cite an Excalidraw picture by adding a `fig` field to it just like a normal image.
2. [Typst Mate](https://github.com/azyarashi/obsidian-typst-mate) — supports Typst-style autonumber; enable via `Settings > Categorical > Others > Enable typst mode`.
3. [Latex Suite](https://github.com/artisticat1/obsidian-latex-suite) — works seamlessly with this plugin; highly recommended for writing long and complex equations quickly.
4. [Completr](https://github.com/tth05/obsidian-completr) — provides better auto-complete for LaTeX syntax.
5. [Quick Latex](https://github.com/joeyuping/quick_latex_obsidian) — provides features like auto-enlarge brackets.
6. [Better math in callouts & blockquotes](https://github.com/RyotaUshio/obsidian-math-in-callout) — use for better math rendering inside callouts.
7. [No More Flickering Inline Math](https://github.com/RyotaUshio/obsidian-inline-math)

## 🚨 Disclaimer

This plugin can edit and update files in your Obsidian vault.

Although it has been thoroughly tested on multiple versions and used daily on my own vault for several months without data loss, unexpected bugs may still occur — especially when new features are introduced.

To protect your data, I strongly recommend enabling the "File Recovery" core plugin (or keeping regular backups) before using this plugin.

While I cannot take responsibility for data loss caused by bugs or unexpected behavior, I take reports seriously and will investigate and fix any critical issues that cause data loss as quickly as possible.

## 🐛 Bug & Reports

If you encounter any bug, please **provide the following information** on the issue page:
1. A description of the bug or issue, along with steps to reproduce it.
2. The relevant markdown text that triggers the issue.
3. Enable debug mode in the settings tab and provide the console log (`Ctrl + Shift + I` in Obsidian).

If you have suggestions or questions for this plugin, feel free to leave them on the issue page.

> [!TIP]
> Since this plugin has a cache mechanism for better performance, a normal delay or a non-immediate update is expected cache-related behavior. Wait a few seconds, or re-open the file or restart Obsidian to confirm your issue is not just a cache delay.

## 💖 Collaboration and Support

I developed this plugin as a hobby and use it in my daily work. It's completely free for everyone to use. Since I'm busy during school term, this plugin is often updated every several months. But the problems are actively checked and this plugin is stay actively maintained. 

> [!NOTE] 
> **Contributors and maintainers are always welcome**:
> You can contribute by forking this repo and submitting a PR:
> 1. **Please commit to the `dev-latest` branch if you make a PR**. This is the latest development branch.
> 2. **Please test your code carefully before submitting a PR!**
> 3. Add what you have done to `CHANGELOG.md`. (Use the next patch version number if a new minor version is not planned.)
> 4. We have CI checks before merging — please make sure your code passes all checks.
> 

Thanks to [@azyarashi](https://github.com/azyarashi) for collaboration and substantial improvements to the plugin. I also appreciate all the users who suggested useful new features and enhancements.

This plugin has reached 16k lines of source code, which increases the complexity for issue resolution and  maintenance. So, if this plugin is really helpful to you, just consider buying me a cup of ☕️:

<center><a href='https://ko-fi.com/Z8Z81N7CMO' target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>
