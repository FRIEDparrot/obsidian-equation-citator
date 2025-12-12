<center><div>
  <img src="img/Heading_img.png" style="max-height:100px; max-width:65%" alt="Stars">
</div></center>

<center><div width="100%"><span>
  <img src="https://img.shields.io/badge/Version-1.3.1-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
    <img src="https://img.shields.io/github/downloads/FRIEDparrot/obsidian-equation-citator/total?label=Downloads" alt="Downloads">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
</span></div></center>
<center><b>English</b> | <a href="README_zh.md" target="_blank"><b>简体中文</b></a></center>
<center><h4>A Powerful, Convenient & Elegant Academic Tool for Citation</h4> </center> 

---

🚀 **Quick Start** : see [Quick Start](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials/Quick%20Start.md) for basic rules, syntax, and most important operations. It only takes < 5 mins but will make everything go smoothly.

✨ **Complete Features & Updates** : see [Changelog](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md) for details. 

📹 **Video Tutorial**: Coming soon if this plugin has 5000 downloads or this repo gets 50 stars.

## 🛠️ Installation 
1.  You can download it from community plugins After this plugin is published in obsidian vault (`Settings` > `Community plugins` > `Browse` and search for `equation-citator`). 

2.  OR you can just download `main.js`,`manifest.json` and `style.css` in the latest release page and put them in `.obsidian/plugins/equation-citator` folder under your obsidian vault. 

## ✨ What this plugin do 

### 1. ⚡ **Auto-number equations by heading level** 

**Auto number all the equations in by simply 1 click on the sidebar icon**  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-function-icon lucide-square-function"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg> 
, making them to be super easy to manage and cite. (Citations will be auto-updated so you can easily insert or delete any equation)

<center><img src="img\auto_number_vid.gif" alt="auto-number" style="zoom: 50%;" /></center>

### 2. 🖥️ **Compact Equation Manage Panel, Cite by Drag and Drop**

Cite equations by drag and drop from equation manage panel. multiple equation citations and cross-file citation are all supported. 

<center><img src="img\drag-drop-cite.gif" alt="drag-drop-cite" style="zoom: 50%;" /></center>

### 3. 🖼️ Cite Images, Tables and Even Theorems 

Cite images by adding field to it. Cite tables and theorems by quote citation feature. 

<center><img src="img\image_cite_case.png" alt="img-cite-case" style="zoom:100%; max-height: 350px; " /></center>

### 4.  📜**PDF export support**  
Not export PDF directly, Run command `Make markdown copy to export PDF` to make a full PDF ready for you to export. 

<center><img src="img\pdf-export-example.png" alt="pdf-export-example" style="zoom:100%; max-height: 350px; " /></center>

## 🚨 Disclaimer

This plugin can edit and update files in your Obsidian vault.

Although it has been thoroughly tested on multiple versions and used daily on my own vault for several months without data loss, unexpected bugs may still occur — especially when new features are introduced.

To protect your data, I strongly recommend enabling the “File Recovery” core plugin (or keeping regular backups) before using this plugin.

While I cannot take responsibility for data loss caused by bugs or unexpected behavior, I take reports seriously and will investigate and fix any critical issues that cause data loss as quickly as possible.

##  🐛 Bug & Reports 

If you encounter any bug, please **provide the following information** on the issue page : 
1.  A description of the bug or issue, along with steps to reproduce it.
2.  The relevant markdown text that triggers the issue.  
3.  Enable debug mode in the settings tab, and provide the console log (Ctrl + Shift + I in Obsidian). 

> [!TIP] 
> Since this plugin have cache mechanism for better performance, normal delay or no in-time update is a normal cache-related behavior. So you may wait several seconds, or re-open file or restart obsidian to ensure your issue is not just a normal cache-related behavior.


## 💖 Support and Collaboration 

I developed this plugin as a hobby and use it in my daily work. It's completely free for everyone to use. 

**Contributors and maintainers are always welcome** :
- You can contribute to this plugin by simply forking this repo and submitting a PR:
  - 1. **Please test your code carefully before submitting a PR!**. 
  - 2. add what you have done into `CHANGELOG.md`. (Use the next patch version number if a neww minor version is not planned in `CHANGELOG.md`)
  - 3. We have some CI check before merging PR, please make sure your code passes all the checks. (For SonarCloaud check, don't worry about its problems now)

- 💖 I would be very glad if anyone can help me to maintain this plugin (since I'm busy during school time).  

> [!WARNING] 
> 
> For submitting a PR, please commit it to `dev-latest` branch, this is the latest development branch, this is for the convenience of us to test and debug, and I will always sync my dev branch to this branch to prevent potential merge conflicts.
> 

Also, if u have suggestions and questions for this plugin, feel free to leave it in the issue page.

Finally, if you find this plugin helpful, consider buy me a cup of ☕️:

<center><a href='https://ko-fi.com/Z8Z81N7CMO'  target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>
