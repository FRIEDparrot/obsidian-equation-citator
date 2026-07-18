### Version 1.3.0

Version 1.3.0 - New features, Refactors, Main improvements and User friendly improvements.

🐛 Bug Fixes : 

- [x] Fix [bug #70](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/70), the auto-numbering behavior is now fixed. 

⭐ New Features :

- [x] **Brand New Settings Tab** with grouped settings and sub-panels, which make setting more convenient than before. **No more annoying scrolling**.   
- [x] **Citation for figures** (from [feature #7](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/7) by Alicecomma) are now supported, titles, numbers and descriptions. 
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

### Version 1.3.3

Version 1.3.3 - bug fixes, new features and enhancements.

---

Important Update summaries : 

- Excalidraw support is now available in figure citation preview!
- Auto complete for figure and callout citations is now available!
- Auto-number and rename tags for figures are now available! 
- Mobile support is now available!

Settings Updates : 

- We refactored the variable name `quoteCitationPrefixes` to `calloutCitationPrefixes` for clarity. So your current settings for callout citation prefix will be restored. Be sure to re-set the settings for `callout citation prefix` in settings tab to make the callout citation work.

--- 

⭐ New Features :

- [x] Autocomplete for figure citation and callout citations.
  - [x] Auto complete supports 2 modes : including rich mode and compact mode (Check `Settings > Advanced > Show full preview in autocomplete`). 
  - [x] For compact mode, hover on the autocomplete item will show the preview of the figure or callout. (Check `Settings > Advanced > Show preview on hover on autocomplete item`) 
- [x] Rename tags for figures.
- [x] Autonumber tags for figures. 
  - [x] Following figure citations should be updated after auto-numbering or renaming tags. 
- [x] Add Feature [#140](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/140), filter for boxed equations in equation manage panel. 
  - [x] Command for box current equation. 
- [x] Add Feature [#143](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/143), now we support Excalidraw in figure citation. 
- [x] Figure citaion format can now cite section preview.
- [x] Add support for mobile devices, also passed test on android devices.

🐛 Bug Fixes :

- [x] fix bug [#136](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/136), add tag for multi-line equation in callout now work correctly. 
- [x] fix glitch [#137](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/137), when the equation panel file and current active file is different, It will create a new window and jump to correct position.
- [x] fix bug [#135](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/135), when edit the file at location before some folded titles, it will not unfold now.
- [x] fig bug [#141](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/141), nested callouts now can be displayed correctly in callout citation preview.
- [x] fix bug [#142](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/142), now the figures in callout will be correctly recognized and rendered in preview.

🚀 enhancements :

- [x] fix the reorder button location style in settings tab.
- [x] add command `insert figure citation` for inserting figure citation quickly.
- [x] now hovering on Citation superscript for callouts and figures will show the file links.

- ❌ Stop supporting the caption for web link figure, and add why we not support it to Quickstart tutorial.

- [x] Now the plugin passed tests on emulator on desktop (`this.app.emulateMobile(true);`), also changed the `manifest.json` to support mobile platform.

🏗️ refactors : 

- [x] refactored autocomplete suggest to add support for figure and callout citations.
- [x] refactored drag and drop handler in equation panel for better code structure and readability.
- [x] refactored the equation panel file, extract the outline view renderer to a separate file.
- [x] rename `other settings` in categorical settings tab to `others` (Obsidian plugin rule)
- [x] added `normalizePath()` to clean up the path throughout the plugin (Obsidian plugin rule)
- [x] refactor the auto-number function part for better code structure, reuse in figure auto-numbering and scalability. 
- [x] remove node assert calls for mobile support  
- [x] fixed lots of sonar issues for better code quality.
- [x] Change MarkdownfileProcessor callback function to sync function.

### Version 1.3.4

Version 1.3.4 - Multi-Platform Support, bug fixes and improvements.

---

Breaking Update Changes : 

- Now we use a configurable math renderer, we changed default renderer to a slow one for better stability, but you can still use the fast one by `Settings > Display (Categorical) > Equation Panel > Use fast math renderer in equation panel`.

----- 

✈️ Full-Cross-Platform Support :

- [x] Test this plugin on Linux and Mac platform (thanks to my friend [@Tiddlefox](https://github.com/tiddlefox))

⭐ New Features :

- [x] right-click to copy equations (both in equation panel and editor popover).
- [x] Show figures and callouts in the equation panel, not only equations.
  - [x] Better Style + interaction for figure and callout items in the panel.
  - [x] correct render for section view (better store at cache). 

🐛 Fixed Bugs : 

- [x] fix bug [#153](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/153), the collapse all button were combined into one and can work correctly now. 
- [x] refactor `collapsedHeadings` to `parsedCollapsedHeadings` to prevent collapse state from growing indefinitely when switching between files.
- [x] Fix bug [#152](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/152), line number information will refresh after editing the file before some headings.
- [x] Add `data-line` reassign mechanism for `viewStateEqual` case. So the line-number information still refresh correctly when editing at middle at pure-text files. 
- [x] fix [issue #151](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/151), add css to make up for style change in `obsidian 1.12.4` 
- [x] Fix all new sonar issues for better code quality. 
- [x] (Critical) Fix [critical #157](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/157), by default we use slow but more stable obsidian build-in renderer. But `MathJax` is still available by `Settings > Display (Categorical) > Equation Panel > Use fast math renderer in equation panel`. 

📖 Documentation : 

- [x] Add settings usage | equation panel button usage | rich auto complete mode in tutorial.
- [x] Updated Chinese translation for readme 
- [x] Remade readme file for full feature introduction. 

🔩 Improvements

- [x] Rename `auto-number xxx in quotes` to `auto-number xxx in callouts` for better clarity (issue [#154](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/154)).
- [x] Remove `basePath=.` in `manifest.json` for further compatibility.
- [x] Simplify `Auto numbering` in some of setting options to `Auto number`
- [x] Improved auto-number logging : different tips on different autonumber types. 
- [x] when click 'open equation panel' button will also reveal it in right panel.
- [x] **Better PDF export configs** : optional captions and descriptions in PDF export for image

### Version 1.3.5

Bug fixes, improvements on PDF export function, added : 
1. Major support for the webpage notes export. (NPM package + batch export with metadata)
2. Major Chinese UI translation supports. (Including settings, commands, and tooltips)
3. Website-hosted documentation for all tutorials, changelogs and API documentations.

✨ New features : 

- [x] Added feature [#168](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/168), the available citation type will be auto-completed when the `ref{}` is empty. 
- [x] Added markdown rendering support for both image caption and description (see [PR #171](https://github.com/FRIEDparrot/obsidian-equation-citator/pull/171))
- [x] Added full pdf support for markdown rendering result for image caption and description. 
- [x] **Added support for web-note rendering**: provide metadata injection option to the pdf, which retains the metadata for the figures. It will also add detailed citation data to the 
- [x] Added better spacing for the image export of PDF, preventing images to become crowd in many cases 
- [x] Added batch markdown export command `Sync repository to the website notes folder` to sync the entire repository to the target website notes folder.
- [x] Added `sync files/folders to the website notes folder` options to the file explorer, Added `sync current file to website notes folder` command.
- [x] Added Option `Render image captions and descriptions` in settingsTab for the rendering of image captions/descriptions 
- [x] Added [#179](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/179), now drag 
- [x] **Added support for Chinese translation for all the UI of the SettingsTab options, Tooltips and Commands** (Check [PR #176](https://github.com/FRIEDparrot/obsidian-equation-citator/pull/176))

🔩 Improvements :
- [x] Adjusted the style of figure preview widget for better width limit, now checking the figure preview widget does not need horizontal scrolling. 
- [x] Added caption and description for Excalidraw/markdwon sections in preview widget. 

📖 Documetations : 
- [x] Migrated the **tutorials**, **Change logs** and the **API documentations** to a **Webpage version**.
- [x] Support citation preview/jump at the webpage building process. 
- [x] Build the npm package for easy web note integration (https://www.npmjs.com/package/@friedparrot/equation-citator)
- [x] Refine the documentation, split tutorials/changelogs into several parts, and added some other useful techniques. 
- [x] Added **full Chinese translation** for **tutorials** and **Change logs**. 

🐛 Fixed Bugs : 

- [x] fixed [#162](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/162), viewState refresh correctly when switch files 
- [x] fixed [#169](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/169), the colon is forced to be added in the citation prefix 
- [x] fixed [#163](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/163), when switch between files, the initial fold state will be stored. 
- [x] fixed [#164](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/164), code blocks now render correctly in callouts. 
- [x] fixed critical [#173](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/173), the PDF export can work correctly at the case some disturbing dollars are put inline. 
- [x] fixed [#172](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/172), when export without meta-data, the image width are still kept. 
- [x] fixed [#175](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/175), add recognition for native svg element of excalidraw when adding the caption and description for figures
- [x] fixed [#177](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/177), the caption and description is rendered by markdown grammar in options part. 
- [x] fixed [#178](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/178), widget size will be preserved after the obsidian is reloaded or restarted. 
- [x] fixed [#180](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/180), ctrl + right-click behavior is now correct for callouts in manage panel. 

🏗️ refactors : 

- [x] refactored and shortened pdf export code part
- [x] refactored `getEquationAtCursor` and function in box current equations 
- [x] refactored figure citation wrapper function 
- [x] refactored the figure caption extension part for better mainability 
- [x] resolved sonar issues to make sure that the code quality gate is passed after pushing to main branch. 

### Version 1.3.6 
Minor issue fix. Fixed

Make sure the quality of the "Review" part is excellent in obsidian plugins. 

Resolved Obsidian reivew state issues : 
- [x] resolved `npm run check` issues after re-enabling all the rules
- [x] Use 'activeDocument' instead of 'document' for popout window compatibility. 
- [x] Unsafe assignment of an error or any typed value 
- [x] Use 'window.setTimeout()' instead of 'activeWindow.setTimeout()'. Timer functions should use 'window'. 
- [x] Use 'window.clearTimeout()' instead of 'clearTimeout()' for popout window compatibility.
- [x] Use 'window.clearInterval()' instead of 'clearInterval()' for popout window compatibility. 
- [x] Avoid using 'globalThis'. Use 'window' or 'activeWindow' for popout window compatibility. 
- [x] Do not import Node.js built-in module "node:path"/"node:fs/promises". Node.js APIs are not available on mobile. Use a dynamic import() or require() guarded by Platform.isDesktop instead.
- [x] Use '.instanceOf(HTMLElement)' instead of 'instanceof HTMLElement' for cross-window safe type checking. 
- [x] README contains unfilled placeholder text
- [x] Removed vulnerability advisory denpendence (now all dependences are dev dependences)
- [x] Uses document.createElement instead of Obsidian's createEl helpers 

### 🚢 If you want following features, you can request it in issue page :

1. Check citations of equations, figures and tables in equation manage panel.
