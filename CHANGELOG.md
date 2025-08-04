## Update Changelog for Equation Citator Plugin 

### Version 1.0.0 
Version 1.0.0 - Initial release  

🚀 Main features include : 
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

