## Update Changelog for Equation Citator Plugin 

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
4. Remove unsaft `innerHTML` operations  

✨ New Features :  
1. Auto-Complete Feature is now available! 
2. Preview for Equations is now available in Reading mode!


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
