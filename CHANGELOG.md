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
- Provide an option to enable/disable citation update when auto-numbering equations. 


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

🚀 Optimizations :  
- Auto Number and tag renaming now show informations of renamed citations. 

✨ New Features : 
- **(Beta Feature) Cite with inline code in callout** : Add this feature to render citations in callout block. (for [bug #4](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/4)). For limitations, see [Tutorial](https://github.com/FRIEDparrot/obsidian-equation-citator/blob/master/tutorials/Equation%20Citator%20Tutorial.md) 

