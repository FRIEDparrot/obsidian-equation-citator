<h1> <center> Obsidian Equation Citator </center> </h1>

<center><span>
  <img src="https://img.shields.io/badge/Latest%20Version-1.2.5-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
</span></center>

<center>
    <div><small> First Release : Aug 3, 2025       Last Updated : Aug 29, 2025 </small></div>
</center>
<p></p>

**5 mins Quick Start** : see [Full Tutorial & Guidelines](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials) 

**Complete Features & Updates** : see [Changelog](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md) 

**Video Tutorial**: I'll make a video tutorial if this plugin has 5000 downloads or this repo gets 50 stars.

## How to use this plugin? 

You can download following 3 files in the latest release page :
```sh
main.js
manifest.json
style.css
```
and put them in `.obsidian/plugins/equation-citator` folder under your obsidian vault.  

Also after this plugin is published in obsidian, you can download it from community plugins. 

## Introduction & Simple Examples
Obsidian-Equation-Citator is a plugin that provides a simple and elegant way to write in-line equation citation cite equations in obsidian just like `\ref{}` label in latex.

Here is a simple examples to show how it works.
```
$$ E = mc^2 \tag{A} $$

This is an equation $\ref{eq:A}$.
```

this will be rendered as follows (support both light and dark theme) : 


<center><img src="img\most-simple-equation.png" alt="most-simple-equation" style="zoom:67%; max-height: 350px; " /></center>


- Why this plugin?
  - While the existing plugin [Math Booster](<https://www.obsidianstats.com/plugins/math-booster>) (or `LaTeX-like Theorem & Equation Referencer` now) also provides equation citation in obsidian (since it's based on latex, it can't do cross-file citation and outline-based equation autonumber). Equation citator is focused on providing an **easy-to-use, light-weight but more powerful, elegant, and full customizable citation experience**. 

- This plugin would be very helpful if you : 
  - have habit of adding `\tag{}` in equation blocks, and want to have a elegant and powerful way to cite them. 
  - don't want to add ugly block reference `^` in your equation blocks for reference, and make your citation more organized and clean. 

> [!warning] 
> You should follow some very simple rules to make this plugin work properly, 
> please check [Full Tutorial & Guidelines](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials) for details. 
>
> If an issue occurs because of you are not following such rules, such issue may be closed without being fixed. 

## Main Features
### 1.  🚀 **Make citations, Preview, Easy jump and Rename Tags**

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

Suggest you available equations when adding citations and fill in the equation number in 1-click : 

<center><img src="img\auto-complete.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px;" /></center>


### 4. ⚡**One-click outline-based Equation AutoNumber**

**Auto number all the equations in by one click on the sidebar icon**  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-function-icon lucide-square-function"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3"/><path d="M9 11.2h5.7"/></svg> 
 :


<center><img src="img\auto_number_vid.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 500px; " /></center>

### 5.  📜**PDF export support** 

Original PDF export in obsidian can fail to render citation, so a command `Make markdown copy to export PDF` is provided to make markdown for export to pdf correctly. 

<center><img src="img\pdf-export-example.png" alt="pdf-export-example" style="zoom:67%; max-height: 350px; " /></center>

## Bugs & Suggestions

Since it's a new plugin, some bugs or issues may still exist. If you encounter any, please provide the following information on the issue page (if this is a feature coming soon, please not comment on the issue page, but wait for the release update) : 

1.  A description of the bug or issue, along with steps to reproduce it.
2.  The relevant markdown text that triggers the issue.  
3.  Enable debug mode in the settings tab, and provide the console log (Ctrl + Shift + I in Obsidian). 


If u have knowledge about plugin development, you can also find which function is causing the bug or issue, provide testing cases or make pull requests to fix the bug or issue. 

Also, if u have any suggestion or question for this plugin, feel free to leave it in the issue page.

> [!note] 
> **Contributors and maintainers are always welcome!**
>
> I developed this plugin to help my daily work and follow my personal interests. It's totally free, I would be very glad if anyone can fork this repo and help me to maintain this plugin (since I'm busy during school time). 
>
> You can contribute to this plugin by simply forking this repo, submitting a PR and describe what you have done (**Please test your code carefully before submitting!**). 
>
> Very appreciate for your contributions! 
