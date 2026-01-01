# Update Changelog for Equation Citator Plugin 

## 1.0 - 1.1 Version Series  

### Version 1.0.0 
Version 1.0.0 - Initial release  

🚀 Main features of V1.0.0 include : 
1. Inline citation (support render in both Live Editor and Reading mode)
2. Cross-file Citation; Continuous citation; 
3. Equation auto numbering. 
4. PDF export support (by exporting a markdown copy). 
5. Preview is only available in Live Editor Mode. 

since the release version has been tested with unsafe and unstable code, We will not provide the download link for this version. 

### Version 1.1.0 
Version 1.1.0 - Bug fixes and main improvements. 

🐛 Fixed Bugs :  
- equation render style : now the hover frame will be extend to fit the equation content.  
- now Equation preview window adjust its position to avoid overflowing the viewport. 

Other Fixes ([Pull Request #7298](https://github.com/obsidianmd/obsidian-releases/pull/7298)) : 
1. Fix: Use `app.fileManager.trashFile(file: TAbstractFile)` instead of `delete()` to delete files. 
2. Change Color Setting Mechanisms to avoid directly setting style by Javascipt. All `setProperty()` are now removed. 
3. All the setting callback functions are used `async` to ensure the settings save correctly. and add `Debugger.log` For Debugging. 
4. Remove unsafe `innerHTML` operations  

✨ New Features :  
1. Auto-Complete Feature is now available! 
2. Preview for Equations is now available in Reading mode!

## 1.2 - 1.2.x Version Series 
### Version 1.2.0  
Version 1.2.0 - functionally improvements.  

🐛 Fixed Bugs : 
- Now auto-complete will not show up in source mode if `enableInSourceMode` setting is disabled. (fixed in release edit of 1.1.0)
- Equation Auto-complete will now add space after the delimiter in single-line equation block case. 
- Now if no alias (label) is provided for a footnote, it will use the file name as the alias. 
- Fix some blank line problem in tutorial. also add tutorials for new features. 
- Refactor the equation utils functions, combine several fucntions into one. 

> Release Patch : Provide an option to enable/disable citation update when auto-numbering equations. 


✨ New Features : 
1. **Link Jump** : **Double click** to jump to equation.  **Ctrl + double click** to create an adjacent window and jump to the equation. (Only support in Live preview mode) 

2. **Rename Tags** : Now you can select tags and right-click to rename it. The citations will be updated automatically.  

3. **Equation Auto-numbering** : Now equation auto-numbering will automatically update the relevant citations to ensure the numbering is consistent.  

### Version 1.2.1 
Version 1.2.1 - bug fixes and minor improvements. 

🐛 Fixed Bugs : 
- Auto-number may not work correctly when there are spaces before the code block 
- Fixed Equation Jump issue [BUG #6](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/6), now ctrl + double click jump correctly. 
- When there are multiple views and hover on an non-active view, now double-click will also jump correctly (also [BUG #6](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/6)).
- Possible deletion bug when renaming tags with `delete unused tags` on (also imporve the efficiency of renaming tags) 
- Fixed the bug when auto-numbering equations, citations in the original file not updated correctly.
- Fixed some equation citation issues in tutorial. 

> Release Patch :  fix bug : rename tag will fail if show repeat prompt

🚀 Optimizations :  
- Auto Number and tag renaming now show informations of renamed citations. 

✨ New Features : 
- **(Beta Feature) Cite with inline code in callout** : Add this feature to render citations in callout block. (for [bug #4](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/4)). For limitations, see [Tutorial](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials/Equation%20Citator%20Tutorial.md) 


### Version 1.2.2  
Version 1.2.2 - many critical bug fixes and significant improvements for user experience.  

🐛 Fixed Bugs & Optimizations : 
 - [x] **(Critical Bug Fix)** Fix [Bug #14](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/14), and now the current file will be auto-numbered correctly even with 1-line tags. (Now note will not become a mass after auto-numbering😅) 
 - [x] Fix [Bug #15](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/15), now citations will be rendered in LiveEditor preview Widget. 
 - [x] Fix [Bug #16](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/16), now auto-complete will work correctly and not  create redundant space 
 - [x] Fix [Bug #17](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/17),  citation suggest will work normally when complete in mid position.
 - [x] Fix multiple same equations render processing, now it will auto matically be combined, `$\ref{eq:1.1.1, 1.1.1, 1.1.2, 1.1.2, 1.1.3, 1.1.4, 1.1.6,  }$`  now should be rendered as  `(1.1.1~4), (1.1.6)`, which is rendered as `(1.1.1~2), (1.1.2~4), (1.1.6)` in previous versions. 
 - [x] Fix the citation not rendered correctly when there are spaces between ref brace and citation prefix (e.g. `ref{ eq:1.1}` will not be rendered correctly) 
 - [x] Fix PDF export issue : The markdown prepend the path name instead of creating it under the same folder. 

✨ New Features : 
- [x] **(Significant Improvement)** Cross-File Citation now support use inner braces in citation (A large refactor has been made for this, PDF support and autocomplete are also updated to support this feature). 
- [x] Optimize the tutorial and readme file, add new features, remove unnecessary parts and duplicates. Moved rules part from readme to tutorial.
- [x] **(slight improvement)** Optimize user experience : Now if type a space after citation, the plugin stop suggesting. 
- [x] **(User Experience Improvement)**  Add a new command for inserting tag with auto-number. (allows quick insertion of tags more easily) 

```markdown
$\ref{eq:2^{1.1}}$    // inner braces in citation 
```

### Version 1.2.3  
Version 1.2.3 - improvements and some minor bug fixes. 

🐛 Fixed Bugs : 
- [x] Fix [Bug #24](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/24), now insert command replace selection by insert content.  

- [x] Better footnote recognition (writing `#` and `^` in pure footnote format) is supported now. 

- [x] Fix style problem [glitch #23](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/23) 

🚀 improvements : 
- [x] When tag is repeated, auto-number only update the citation of the first tag occurrence, which enables you to append a part with repeated tags into note and then use auto-number normally. 

- [x] More precise tag location when inserting tag in equations. 

- [x] add how to add this plugin tutorial in readme. 

- [x] **(main improvement)** Build plugin using production mode((use `npm run build`) in this version, reducing the size of the plugin and improves the performance, the size of the plugin reduced from 593kb to 73kb) 

✨ New Features : 
- [x] Citation file superscript now render the footnote in popover when hover on it. 

- [x] Add support for text-only and web-link format footnote in superscript popover render  

- [x] Customize the width of equation popover in settings Tab  

🛠️ Release Patch : 
- [x] Now using brace `{}` as delimiter in settings is prohibited. 


### Version 1.2.4  
Version 1.2.4 - bug fixes and minor improvements. 

🐛 Fixed Bugs :
- [x] Fix [bug #34](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/34) now amrkdonw export can work correctly for escaped dollar sign. 

- [x] **(Critical)** Fix [Critical #35](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/35), when no tag to rename and delete unused tags is enabled, the plugin will delete unused tags normally😅.  

- [x] Fix [bug #31](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/31), now citations can rendered correctly both in outline preview and embedded link preview. 

🚀 Enhancements : 
- [x] add [enhancement #32](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/32), file superscripts will be rendered as footnotes in pdf export. Also change default citation color as same as file superscript color. 

- [x] open the exported file after export pdf command.  

- [x] set default equation widget width to 500px. 

- [x] better empty citation rendering (now empty citations will be rendered as `()` instead of ``)

🛠️ Tooling :
- [x] Add Copilot instruction file for default base branch policy [copilot]


### Version 1.2.5  
Version 1.2.5 - bug fixes and a bit improvements.

🐛 Fixed Bugs :
- [x] Fix auto-number function: In 1.2.4 Auto-number still may incorrectly pushes the second and third tag renaming case, Now it will always correctly update only the first occurrence of tag.
- [x] (**Critical**) Fix citation update issue [bug #53](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/53), now citations in the current file will be updated correctly after auto-numbering.    
- [x] (**Critical**) Fix problem in citations updating[bug #54](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/54), delete unused citations now only affect citations of the same file. 
- [x] Press `enter` key in renaming tag widget will now accept renaming tag. 
- [x] Better prefix settings check (not allow brace and dollar or leave it blank), also dollar is now prohibited in delimiter since its unsafe. 
- [x] Fix style problem [#51](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/51), add margin and now limit the maximum alias rending width to 380 px. 
- [x] Fix description for PDF citation color [#49](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/49) 
- [x] Fix escaped dollar problem [#40](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/40) 


🚀 Enhancements: 
- [x] add enhancement [#52](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/52), now will use mutli-citaion-delimiter + space by default (set in settings tab) for better render. 

### Version 1.2.6
Version 1.2.6 - bug fixes

🐛 Fixed Bugs : 
- [x] (Critical) Fix Bug [#63](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/63), Now multiple citations in a row can update correctly  
- [x] Fix bug  [#60](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/60), auto-number now correctly number with not enough depth in absolute numbering method. 
- [x] Fix bug [#56](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/56),  width settings will be correctly rendered. 
- [x] Fix bug [#64](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/64) Auto complelte will also parse unclosed citation, and complete it now. 

🚀 Enhancements: 
- [x] Add enhancement [#61](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/61), enhancement when autocomplete in continuous citations. 
- [x] Add enhancement [#62](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/62), add option to manually clear cache in settings tab. 


## 1.3 - 1.3.x Version Series
### Version 1.3.0 

Version 1.3.0 - New features, Refactors, Main improvements and User friendly improvements.

🐛 Bug Fixes : 
- [x] Fix [bug #70](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/70), the auto-numbering behavior is now fixed. 

⭐ New Features :
- [x] **Brand New Settings Tab** with grouped settings and sub-panels, which make setting more convenient than before. **No more annoying scrolling**.   
- [x] **Citation for figures** (from [feature #7](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/7) by Akucecomma) are now supported, titles, numbers and descriptions. 
- [x] **Citations for Callout**, We can add tables to callout to make a citation to it. This feature also gives you flexibility to cite tables, text pieces and even theorems (quote all tables in callout to cite it). 
- [x] Add PDF export support for figures and callouts. 
- [x] **Add Equations Manage Panels**, Allowing you to retrieve all citations of specific equations, and also jump to their locations 
  - [x] **Outline View, filter and collapse** : Both List view and outline view are supported.
  - [x] **Drag-and Drop to citation** : You can now drag-and-drop equation from equations manage panel to cite it.
  - [x] **Support the cross-file citations by dragging** 
  - [x] **Prompt when drag no-tag equations** 
  - [x] **Dynamic Update panel when change file and type in editor**
  - [x] **interactive** : support double-click jump and ctrl + double-click (new panel+jump)

🏗️ Refactors : 
- [x] For settings part, refactor code and split it into mutlitple modules.

🚀Enhancements & improvements : 
- [x] Add [enhancement #50](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/50), better behavior for relocating cursor after auto-number equations. 
- [x] When jump to equations in another panel now check if there already a panel of this file, and jump in this panel if there is. 
- [x] Now debugging mode configurations will be saved after restarting Obsidian, so you needn't toggle debug mode every time. 
- [x] Remake a brand-new and more concise tutorial. 
- [x] Remake Readme file to be more friendly and concise. Also add a Chinese translation of Readme. 


### Version 1.3.1

Version 1.3.1 - some new features, Refactors, bug fixes and many enhancements.

⭐ New Features :
- [x] Add support for typst (by [azyarashi](https://github.com/azyarashi) in PR [#73](https://github.com/FRIEDparrot/obsidian-equation-citator/pull/73))


🐛 Bug Fixes :
- [x] Fix [bug #78](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/78), now equation panel can correctly refreshed when firstly open equations manage panel. 
- [x] Fix [bug #89](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/89), drag-drop will correctly recognize current footnote 

🚀Enhancements : 
- [x] Add Eslint obsidian plugin for better code check before submitting, run `npm run check` before submitting PR
- [x] Add lock button [#88](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/88) into equations manage panel
- [x] Add enhancement [#81](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/81), add show headings only panel, so in outline view, we can just use it as outline panel.
- [x] Optimize `renderImageCaptions` function, now it will not parse Markdown every time when fast typing.
- [x] Add enhancement [#91](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/91), stop auto-numbering when theres content after equation block.
- [x] Add colorful callout support [#88](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/88)
- [x] Add `render title and description in figure preview` option in settings tab.
- [x] Remove `Continuous Citation Delimiter` from advanced settings.
- [x] Remove precise width and height settings for equation widgets, use multiple sizes instead. 
- [x] Remove settings for `display widget style`, and now the style of widgets will automatically change according to the theme applied.

🏗️ Refactors For review :
- [x] Change `fetch` to `requestUrl` for fetching equations
- [x] Fixed async & await functions 
- [x] Remove unicode in quoteRegex
- [x] change `console.log` to `console.debug`
- [x] removed unnecessary assertions 
- [x] use `then` to replace `await` in eventListener to avoid ts error
- [x] fixed some incorrect `debugger.error`
- [x] fixed UI text case 
- [x] rafactor style settings, fix style managers, remove style settings code from hoverpopover.


### Version 1.3.2

Version 1.3.2 - some new features, enhancements, refactors and bug fixes.

⭐ New Features :
- [x] Add [feature #104](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/104), add a button to forbid equation panel to be refreshed.
- [x] Add [feature #105](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/105). Add a settings in auto-numbering settings tab, only number equations already with tags.
  - [x] Correct the behavior when insert equation with tags into specific file (only count the number before cursor).  
- [x] Add [feature #107](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/107), show only tagged equations in equations manage panel.  
- [x] Fixed bugs in heading collapse hehavior in equations manage panel, now it behavior correctly after chevron clicked to change collapsed state.
- [x] Add List view in settings tab for search purpose.

🚀Enhancements :
- [x] Use `MathJax` to render equations instead of `MarkdownRenderer` (in [PR #108](https://github.com/FRIEDparrot/obsidian-equation-citator/pull/108)), improve performance greately.
- [x] Remove `Lock to current file` button, now `Disable-Refresh` do all the job.
  - New behavior : `Disable-Refresh` will diable the change of `file` and `equations`, but will still refresh if : 
    1. View mode changed (from `outline` to `list`) or other view selections (like `sort mode`, `filter options`, etc) 
    2. search query changed  
  - This design is more user friendly, and also during refresh process, there would no file reading, which improves performance on large markdown files.
- [x] Add setting buttons for some default state of equation panel when opened.


🏗️ Refactors : 
- [x] Fix bugs mentioned in [PR #7298](https://github.com/obsidianmd/obsidian-releases/pull/7298)
  - [x] Change README title banner image. 
  - [x] Change `innerHTML` to `.empty()`
  - [x] for every `TargetElCompoponent`, now it create  in constructor and reuse it.
  - [x] replace `app.vault.modify()` by `app.vault.process()` 
  - [x] Change UI text to sentence case 
    - [x] Settings tab
    - [x] Equation panel
    - [x] other pages
  - [x] Avoid render title on settings tab
  - [x] Avoid "Settings" in settings tab 
  - [x] Remove check updates button 
  - [x] Refactor section headings creation to use `new Settings().setName().setTitle()`
- [x] Refactored the rendering function for equation Manage Panel to improve readability and maintainability.

🐛 Bug Fixes :
- [x] Fix [bug #112](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/112), equations now correctly auto-numbered when `auto number equations in quotes` is enabled.
- [x] Fix [bug #74](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/74), retain better equation written format after auto-numbering. 
- [x] Fix [issue #113](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/113), remove `.github` in gitignore file, and then add CI workflow.
- [x] Fix [bug #110](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/110), PDF won't be parsed for equation display. 
- [x] Fix the bug that change widget size settings don't take effect.
- [x] Fix [bug #119](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/119), Cross file jump and citation now work correctly when equation panel locks refresh. 
- [x] Fix [bug #118](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/118), when file is firstly opened, the panel should be rendered correctly.
- [x] Fix [bug #126](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/126).
  1. when put text to make illegal equaion at the last equation position, the auto-numbering will stop. 
  2. corrected the line number information shown in notice.
  3. detect single-line illegal equation.
  4. For some case, the code block is counted in, which leads to incorrect line number information. Now fixed.

### 🚢 Comming Soon : 
1. Auto-number and citation complete add for tables and figures 
2. Check citations of figures and tables, all in one 😄
