<span width="100%"><center><img src="./img/Equation_Citator_header.png" width="65%"></center></span>

<span width="100%"><center><span>
  <img src="https://img.shields.io/badge/Latest%20Version-1.3.0-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <img src="https://img.shields.io/github/downloads/FRIEDparrot/obsidian-equation-citator/total?label=downloads">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
</span></center></span>

<center><h4>A Powerful, Convenient & Elegant Academic citation Tool</h4> </center> 

---

🚀 **Quick Start** : see [Full Tutorial & Guidelines](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials) for basic rules and syntax. It only takes you < 5 mins but help everything goes smoothly.

✨ **Complete Features & Updates** : see [Changelog](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md) for details. 

📹 **Video Tutorial**: Coming soon if this plugin has 5000 downloads or this repo gets 50 stars.

## 🛠️ Installation 

You can download following 3 files in the latest release page :
```sh
main.js
manifest.json
style.css
```
and put them in `.obsidian/plugins/equation-citator` folder under your obsidian vault.  

After this plugin is published in obsidian, you can download it from community plugins. 

## ✨ What this plugin do for you

### 1. ⚡ **Auto-number equations by heading level** 

**Auto number all the equations in by simply 1 click on the sidebar icon**  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-function-icon lucide-square-function"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg> 
, making them to be super easy to manage and cite. 


When you insert an equation and click auto number, citaitons will be automatically updated according to original equation number. 

<center><img src="img\auto_number_vid.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 550px; " /></center>

### 2. **Manage Equations and Drag-Drop for easy citation**




### 1.  🚀 **Make citations, Preview, Easy jump and Rename Tags**  

<center><img src="img\auto-complete.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px;" /></center>

Use simple inline `$\ref{eq:A}$` format to cite equation block with `\tag{A}` and preview it just as links in obsidian.  

`Ctrl + hover` to preview the equation of following tag (just hover when in reading mode). `double click` to jump to location of equation, or `ctrl + double click` to open on the right and jump

**Select tag (`\tag{1.2}`) and right click to rename tag**, and its **citation will be automatically updated**. 

<center><img src="img\rename_tag.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px; " /></center>


### 2.  🔗**Cross-file citation, Multi/Consecutive citation**

- Cross-file citation is supported by **footnote format**. Citing several equations by delimiter `,` is also supported. 

- Use consecutive format (`~`) to cite multiple equations. 

```sh
# for example
$\ref{eq:1^1.3.1~3, 1^2.1.1~2}$
# but we recommend this nested format after version 1.2.2 : 
$\ref{eq:1^{1.3.1~3}, 1^{2.1.1~2}}$ 
```

<center><img src="img\crossfile_jump.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px; " /></center>

### 3.  ✈️ **Auto complete citations** 

Suggest you available equations when adding citations and fill in the equation number 


### 4. **One-click outline-based Equation AutoNumber**


### 5.  📜**PDF export support** 

Original PDF export in obsidian can fail to render citation, so a command `Make markdown copy to export PDF` is provided to make markdown for export to pdf correctly. 

The cross-file citations will be rendered as normal cross-file link format, which ensures the citation sequence in PDF to be neat and correct. Following is the exporting result shown by foxit pdf reader😄

<center><img src="img\pdf-export-example.png" alt="pdf-export-example" style="zoom:100%; max-height: 350px; " /></center>

##  🐛 If you find any bug ... 

We have released many versions, made a lot bug fixes to ensure this plugin runs smoothly, but some bugs or issues may still exist or not fully tested.

If you encounter any bug, please **provide the following information** on the issue page : 
1.  A description of the bug or issue, along with steps to reproduce it.
2.  The relevant markdown text that triggers the issue.  
3.  Enable debug mode in the settings tab, and provide the console log (Ctrl + Shift + I in Obsidian). 

> [!TIP] 
> Since this plugin have cache mechanism for better performance, some problems like normal delay or no in-time update (like a little delay for citation update) may happens. So you may wait several seconds, or re-open file or restart obsidian to ensure your issue is not just a normal cache-related behavior.


## 💖 Support and Collaboration 

I developed this plugin as a hobby and use it in my daily work. It's completely free for everyone to use. 

**Contributors and maintainers are always welcome** :
- You can contribute to this plugin by simply forking this repo, submitting a PR and describe what you have done (**Please test your code carefully before submitting!**).   
- I would be very glad if anyone can help me to maintain this plugin (since I'm busy during school time).  

Also, if u have suggestions and questions for this plugin, feel free to leave it in the issue page.

Finally, if you find this plugin helpful, consider buy me a cup of ☕️:

<center><a href='https://ko-fi.com/Z8Z81N7CMO'  target='_blank'><img src="./img/friedparrot-kofi.jpg" width="350px" style="border-radius:15px"></img></a></center>
