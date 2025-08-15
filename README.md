<h1> <center> Obsidian Equation Citator </center> </h1>

<center><span>
  <img src="https://img.shields.io/badge/Latest%20Version-1.2.1-blue" alt="Release">
  <img src="https://img.shields.io/github/stars/FRIEDparrot/obsidian-equation-citator?style=flat-square&label=Stars&color=yellow" alt="Stars">
  <img src="https://img.shields.io/badge/License-Apache%202.0-red" alt="License">
</span></center>

<center>
    <div><small> First Release : Aug 3, 2025       Last Updated : Aug 14, 2025 </small></div>
</center>
<p></p>

**5 mins Quick Start** : see [Full Tutorial](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials) 

**Complete Features & Updates** : see [Changelog](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/CHANGELOG.md) 

**Video Tutorial**: I'll make a video tutorial if this plugin has 5000 downloads or this repo gets 50 stars.

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

## Main Features
1.  🚀 **Easy Citation, Preview and Rename Tags**

Use simple inline `$\ref{eq:A}$` format to cite equation block with `\tag{A}` and preview it just as links in obsidian.  

Ctrl + hover to preview the equation of following tag (just hover when in reading mode). 

**Select tag (`\tag{1.2}`) and right click to edit tag**, and its **citation will be automatically updated**. 

<center><img src="img\rename_tag.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px; " /></center>



2.  🔗**Cross-file citation, Multi/Consecutive citation and easy jump**

Support cross-file citation **by footnote format**. Citing several equations by delimiter `,` is also supported. 

Consecutive citations will be automatically recognized and rendered in simple format for concise purpose, and you can also use consecutive format (`~`) to cite multiple equations. 

```sh
# for example
$\ref{eq:1^1.3.1~3, 1^2.1.1~2}$
# the above citation is same as the below :  
$\ref{eq:1^1.1.1, 1^1.1.2, 1^1.1.3, 1^2.1.1, 1^2.1.2}$  
# the above will be automatically combined together as continuous citation. 
```

This will render multiple equations in a window, and **you can use double click on an equation to jump here, or ctrl + double click to open on the right and jump** : 

<center><img src="img\crossfile_jump.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px; " /></center>



3.  ✈️ **Auto complete citations**

When you are typing citation format, The plugin will suggest you the available equations and citation format and fill in the equation number as you click. Which is shown in the following picture : 

<center><img src="img\auto-complete.gif" alt="continuous-cross-file" style="zoom:67%; max-height: 750px;" /></center>



4.  ⚡**One-click outline-based Equation AutoNumber**

This plugin gives you full control of auto number method for equations.

Customize auto-number method (absolute or relative, title level, format, chapter prefix and more). 

You can auto number all the equations in your current file by command or just simply one click on the sidebar icon :

<center><img src="img\sidebar-autonumber.png" alt="continuous-cross-file" style="zoom:67%; max-height: 350px; " /></center>



5.  📜**PDF export support** 

Original PDF export in obsidian can fail to render citation, so a command is provided to make markdown for export to pdf correctly.  




## Write Guidelines
This plugin relies on text parsing, so please follow these three very simple guidelines to ensure it works correctly.

1. **Always write code blocks with 3 backticks** (```) without space before at the beginning and end of the equation block. 

2. **Never write any other content in the line of equation blocks** (but it support quote block).

3. Avoid using `\}` in your tag or citation (this will cause the tag recognized incorrectly) 




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
> 
>
> You can contribute to this plugin by simply fork it, submitting a PR and describe what you have done (**Please test your code carefully before submitting!**). 
>
> 
>
> If you find this plugin helpful, consider  and I will be very happy! 



Also if you think this plugin is helpful to you, consider **starring this repo** or support me by :  

<center><a href="https://space.bilibili.com/1185195559" target="_blank"><img src="https://img.shields.io/badge/dynamic/json?color=ff69b4&label=Follow%20me%20on%20bilibili&query=data.follower&url=https%3A%2F%2Fapi.bilibili.com%2Fx%2Frelation%2Fstat%3Fvmid%3D1185195559&logo=bilibili&logoColor=white&labelColor=fe7398&style=for-the-badge"></img></a></center>

