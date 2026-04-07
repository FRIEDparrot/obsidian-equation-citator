🚀 **Enable the plugin and copy all files in the tutorial folder to your vault to follow along interactively.**  

> [!summary] 
> 1. This tutorial covers all the essential features, basic grammars to get you started with this plugin. 
> 2. For more special needs like essay drafting, you may check [[Useful Tricks & techniques]] for more practical tricks that can be commonly used in this plugin. 
> 3. There are also several useful css snippets in the `tutorials/useful css snippets/` folder. You can also check them out. 

![[Equation Citator Logo.excalidraw|fig:1|title:Equation Citator|250]]

### ✨ Core Features

The Equation Citator plugin transforms Obsidian into a powerful academic writing environment with LaTeX-style citations. Making referencing in the vault easier than ever. The core features includes : 
- **Equation Citations**: Tag and reference equations with `\tag{}` and `\ref{}` 
- **Auto-numbering**: Automatically number equations for easy-management 
- **Cross-file Citations**: Reference content across multiple documents
- **PDF Export**: Generate properly formatted documents for publishing
- **Figure & Table Citations** (New in v1.3.0): Cite images and tables with custom syntax   
- **Drag & Drop Citations** (New in v1.3.0): Drag equations from the management panel

> [!tip]
> **Typst Mode support** : This plugin also support [obsidian typst mate](https://github.com/azyarashi/obsidian-typst-mate), you can set `settings > Display (Categorical) > Others > enable typst mode` make it compatible with typst syntax.

## 👋🏻 Before Everything start 
There are some very simple writing guidelines you should follow : 
### (1) Code block format 
Always use 3 backticks for code block like following (other numbers are not recommended) :  
```latex
Code block 
```

### (2) Equation block  
1.  We only cite equation blocks, not cite inline equations. 
2. For a correct-written equation block,  **NOT WRITE ANY OTHER CONTENT IN THE  LINE OF EQUATION BLOCK** (except the quote sign before it). e.g. :  

✅ CORRECT EXAMPLES :   
```latex
%1-line equation block format%  
$$ \Large \boxed{dg = - s dT+v dp } $$  

%multi-line equation block format%
$$
\Large \boxed{dg = - s dT+v dp }
$$

%or write equation freely in multi-line%
$$ du = \left(\frac{\partial u}{\partial s}\right)_v ds +\left( \frac{\partial u}{\partial v}\right)_s dv \rightarrow
\quad \boxed{T = \left( \frac{\partial u}{\partial s}\right)_v, \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{3.1.1} $$
```

❌ NOT SUPPORTED EXAMPLES :

```Latex
%% not write text before first $$, This will cause issue! just not do it!!!%%
this  is an $$ equation 1         # # text before equation block 
$$ 

%% not write text after $$, this will stop auto-numbering%% 
$$
Equation 2
$$ block  # text after equation block
```

**Q : Why we don't support this**? 

A : Deliberately writing text after equation block can cause equation render problem in reading mode (also cause issue in our auto-number). In that case, we will stop auto-number and give you a warning. You can open reading mode to check where this problem is. (You can go to [bug #74](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/74) for clarification) 

When this case happens, auto number will automatically fail and you'll get a notice `Detected illegal nested $$ in equation block at line xxx`.  You can enable `settings > Editor > Line Numbers` to fix it. So just not do that in your notes. 

### (3) Citing Clarity  
1. Avoid using `\}` in your tag or citation (this will cause the tag recognized incorrectly) 
2. Use number (1,2,3,.... ) for footnotes, not use characters. 
3.  To **cite a callout** after v1.3 :   
You can **select content and use command `insert callout` to quickly make content a callout**. For these callout **Every line should start with greater sign** `>`. Implicit callout line with no `>` sign would be neglected. 

### (4) Autonumber only when all contents correctly rendered 

You should autonumber all equations of file **Only when all contents correctly rendered and your markdown syntax is correct**. 

```markdown
$$
\text{equation content} 
# malicious heading 
\text{other content}
$$
```

This will cause heading dismatch in Auto-numbering, and `# title` grammar is prohibit in equations (in that case equation render incorrectly). So only auto-nuber when all your content are correctly rendered. 

> **Also do not write any heading or code block-like content in equations** 

> [!warning] 
> You should follow above rules if you use this plugin. Issues caused by not following above rules may be closed without being fixed. 

## ⚙️ How to use Settings Tab 
There are 3 different display options in settings Tab, including : 
1. Concise : only show important settings
2. Categorical : categorized settings. 
3. List : displays all settings, use this mode mainly for search settings. 

**IMPORTANT** : You will **not find all settings in concise mode since some settings are hidden in both "basic" and "advanced" section**, you need to enable it in "Customize Display sections" or **switch to "Categorical"** or **List** mode to find all settings. 

## 1. Basic Equation Citations 

The citation syntax are summarized as following table,  if you think these are very simple, you can jump to [[#3. Equations Manage Panel (New in v1.3.0)|Manage Panel Tutorial]] directly. 

> [!summary] Citation Syntax Table of below
>
> | Feature       | Syntax                                  | Example                        |
> | ------------- | --------------------------------------- | ------------------------------ |
> | Equation Tag  | `\tag{label}`                           | `\tag{2.1}`                    |
> | Equation Cite | `$\ref{eq:label}$`                      | `$\ref{eq:2.1}$`               |
> | Figure        | `![Caption\|fig:label\|desc:text](img)` | `![Graph\|fig:3.1](graph.png)` |
> | Table         | `> [!table:label] Title`                | `> [!table:3.1] Results`       |
> | Cross-file    | `$\ref{eq:footnote^{label}}$`           | `$\ref{eq:1^{2.3}}$`           |
> | Multiple      | `$\ref{eq:1.1, 2.1}$`               |  cite multiple equations |
> | Continuous    | `$\ref{eq:1.1~3}$`                      | Range notation                 |

### 1.1 Creating and Citing Equations 
Add a tag to any equation using `\tag{label}`: 
$$
\Large\boxed{E = mc^2} \tag{1.1}
$$

To cite this equation, type `\ref{eq:1.1}` which renders as: $\ref{eq:1.1}$

**Quick Commands** (use ctrl + p to search and add a hotkey to that😄!):  
- `Insert a citation in cursor position` : Quickly insert `\ref{}`
- `Insert equation citation on cursor position`: Quickly insert `\ref{eq:}`
- `Insert tag on cursor position with auto-number`: Add tags with automatic numbering when cursor is in an equation block.  

> [!tip] 
> **Auto-Complete Feature** : just inserting `\ref{eq:}` and typing is much faster than dragging citations, since we support auto-complete for all types of citations. 
> 
> For equations, just select what you want to insert in auto-complete panel. 
> 
> **Concise/Rich autocomplete mode**: for figures and callouts, by default only tag and title will show. You can preview contents by hovering your mouse on option. Or you can use `settings > citation > show full preview in autocomplete` to show full picture/callout in autocomplete options.

> [!warning]  
> You can **only cite 1 type** of either  equation, figure or callout in a citation, such as `$\ref{eq:1.1, 1.2, 1.3}$` or `$\ref{fig:1.1, 1.2, 1.3}$`,  and it will take the begin from `ref{` as the prefix to mark which type you cite. So mixed citation `\ref{eq:1.1, fig:1.2, table:1.3}` is not allowed.  

### 1.2 Multiple Citations
Cite multiple equations with commas: $\ref{eq:1.1, 1.2, 1.3}$ 
$$\boxed{F = ma} \tag{1.2}$$
$$\boxed{p = mv} \tag{1.3}$$

**Continuous Citations**: Enable in settings to render `$\ref{eq:1.1, 1.2, 1.3}$` as $\ref{eq:1.1~3}$ 

### 1.3 Cross-file Citations  

The cross-file citation **relies on the built-in footnote system of obsidian** : so you can create footnote using following syntax :  

```markdown
[^1]: [[Document_A|Paper A]]
[^2]: [[Document_B|Report B]]
```

The syntax is: `$\ref{eq:footnote^{tag}}$`,  For example,  As shown in equation $\ref{eq:1^{2.3.1}}$ from Paper A[^1]. 

### 1.4 Interactive Features
The following interactive features are really useful for you to quickly check and manage your equations, supports are listed in following table :

| Feature                                   | Editor Popover | Equation Panel | Equations | Figures | Callouts |
| ----------------------------------------- | ---------------- | -------------- | --------- | ------- | -------- |
| **Preview** (Hold `Ctrl` + hover)         | ✅                | already        | ✅         | ✅       | ✅        |
| **Jump to Source** (`Double-click`)       | ✅                | ✅              | ✅         | ✅       | ✅        |
| **Open in Split** (`Ctrl + Double-click`) | ✅                | ✅              | ✅         | ✅       | ✅        |
| **Rename Tag** (`Right-click` on tag)     | ✅                | ❌              | ✅         | ✅       | ❌        |
| **Right-Click Copy**                  | ✅                | ✅              | ✅<br>     | ❌       | ❌        |

- For **Open in Split**, if more than one editor is already open, it will reuse the existing adjacent editor rather than opening a new one 
- Select `\tag{}` to rename equation tag, select entire image `![[image.png|fig:1.1]]` to rename figure tag.
- You can customize what to copy in `settings > Display (Categorical) > Equation Panel > Equation widget right click copy content`, choose whether to copy the equation content with tag/braces

### 1.5 Rename equation tags 
Select the `\tag{}` in the equation you want to rename, then right-click and select `Rename equation tag`. Citations will be automatically updated to match the new tag.

## 2. Figure and Callout Citations (New in v1.3.0) 
### 1) Figure Citations 
#### 1. Grammar  
We use the enhanced image syntax to make figures citable : 

```markdown
%%wiki link format%%
![[James_Lovell.jpg|fig:3.1|desc:description]]

%%markdown link format%%
![fig:1.3|title:test|desc:Optional description](images.png) 
```

We support both wiki link and markdown link format.

![[test_image.png|fig:1.3|title:minecraft|desc:a test minecraft picture example|200]]
We can use $\ref{fig:1.3}$ to cite the above **figure**. 

This will create :
- A figure with label `fig:1.3`
- A caption displayed below the image
- A description for extended context 

#### 2. Support for Excalidraw and section preview

![[Excalidraw Support|fig:1.5]]
Also, after `v1.3.3`, we can also cite the `excalidraw` image with same syntax  $\ref{fig:1.5, }$. 

Note the `excalidraw` and `excalidraw.md` should be included in the `settings > Display (Categorical) > Others > Extension names using Markdown renderer`, the extension `excalidraw.md` must be added. 

But **since the grammar of external file link view `![[#(3) Citing Clarity|fig:1.6]]` is same as image**, we still reckon it a valid image. So when `md` is in the `Extension names using Markdown renderer` setting, we can even cite the section preview as $\ref{fig:1.6, }$ (but there would be no caption) :

![[#(3) Citing Clarity|fig:1.6]]

#### 3. Auto-numbering Figures and rename tags

This plugin also support **autonumber for figures** after v1.3.3, so you can use the ribbon button or command `auto-number current file figures` to auto-number all figures in current file.

To rename figure tags, you can right-click image to select the whole, and select `Rename tag for this picture`, then input new tag name.

#### 4. Limitations 

> Note this plugin doesn't support creating caption for markdown link format images from web-link. But you can still cite it with $\ref{fig:1.7}$. 
> 
> **Why we not support** : We add caption inside class `.internal-embed image-embed`, and web-link image is rendered as `<img>` without this wrapper class. Creating element outside those images would cause some issue in editing. You can simply use `copy image` in your browser and paste it to make it a local image file.

![fig:1.7|200](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJUGwUw60NYwnmZEKiGJtoRXpa56J1Ko0QjA&s)


### 2) Callout Citations 
#### 1. grammar
The plugin support citing callouts with customized types, **this give us flexibility to cite tables, theorems and any customized pieces**.  

You can configure customized prefix in `Callout/Quote Citation Prefixes` settings, by default `table:` are enabled

So here we give an example  for how to cite a table : 

> [!table:2.1] Sales Data Q4 2024 
> | Product | Revenue | Growth |
> |---------|---------|--------|
> | Widget A | $100K | +15% |
> | Widget B | $150K | +22% |

Cite the table using: `$\ref{table:2.1}$`, rendered as $\ref{table:2.1}$  

> [!hint] Edit table in callouts 
> Put table in callout makes it hard to edit. But we have a trick to edit it quicker. 
> 
> See [[Useful Tricks & techniques#(1) Editing a Table Inside a Callout More Easily]] for details 


Citation inside callouts must match case exactly. Example:

- Callout tag: `> [!NOTE:1]`
- Cite with: `$\ref:{NOTE:1}$` (case-sensitive)   

All figure and callout citations support syntax and interactive features in [[#1. Basic Equation Citations]]. 

#### 2. Custom Callout Colors

We also support customize callout colors by adding [callout.css](https://gist.github.com/LucasOe/0bed268951b90e897002ee1e31479c9c) to `Settings > Apperance > CSS Snippets`, so you can write a beautiful callout like this (this take effect after adding this snippet):

> [!table:1.1|red] Sales Data Q4 2024
> 
> This is a red callout table 
>  
> | Product | Revenue | Growth |
> |---------|---------|--------|
> | Widget A | 00K | +15% |
> | Widget B | 150K | +22% |
> | Widget C | 200K | +33% |

#### 3. Limitations 

1. Currently the plugin don't support autonumber and rename for callouts. Since there might not be a lot of them. You can manage them manually now. Or you can request this feature in the [issue page](https://github.com/FRIEDparrot/obsidian-equation-citator/issues) if you really need it.

2. Unfortunately, we don't support customize icon for callout yet. Since it use icon as `data-callout`. And we also use first field as citation label.

## 3. Equations Manage Panel (New in v1.3.0)

### 1) Open the Panel  
You can open the equation mange panel by : 
- Command palette: `Open Equations Manage Panel`
- Toolbar icon (if enabled) 

### 2) Math Renderer Settings
By default, the panel uses a **reliable rendering method** that ensures equations display correctly. If you have many equations and experience slow loading, enable **"Use fast math renderer"** in settings (**Settings > Display (Categorical) > Equation Panel > Use fast math renderer in equation panel**). The fast renderer may show empty containers initially, but they'll appear correctly after scrolling.

### 3) How to use this panel
Equation Manage panel is one of the most powerful feature of v1.3.0, it allows you to cite and search equation fast and easy, **No need to scroll or remember syntax or equation numbers!** 

#### 3.1 Usage of buttons on panel toolbar :

![Tool bar Image](panel_toolbars.png)

We use the button on `outline` mode for tutorial, The main panel includes following buttons :  
1. Preview item select : select between `equations`, `figures` and `callouts` to preview in the panel.
2. View mode buttons : Switch between `outline` view and `list` view.
3. Disable refresh : Disable auto refresh, Lock the **File, Equations and Headings rendered in panel**, but `view mode change`, `filters` and `search` will still work. 
4. Search : Search equations by content. 
5. More Options : show / fold subpanel. 

The subpanel includes :
1. Show headings only : Only show headings, hide equations (use the panel as an outline!).
2. Sort equations (In List mode) : Sort equations by their order in the file, or by their tag name.
3. Collapse / Expand all : Collapse or Expand all headings in outline view.
4. Show/Hide tags : Show or hide tags in the panel. 
5. Show all headings / Only show headings with equations.
6. Filters : 
    - 1.Show only tagged equations/figures/callouts. (This works for all types of content)
    - 2. show only boxed equations. (This only works for equations)

#### 3.2 Drag and Drop Citations 
1. **Drag** the item from the panel, **Drop** it into your text where you want the citation, the properly formatted `\ref{}` citation is automatically inserted
2. If you have **multiple files opened in editor**, you can also **drag equations to other files**. The plugin will **automatically create footnotes for cross-file citations**.
3. For callouts in panel, we don't support drag-cite callouts without correct tags (since it will break original prefix), please add tag for it manually.


#### 3.3 Special Filters

Filters are very useful features for you to manage important equations. Currently we provide 2 filters :

1. **Tag-only filter**: Show only equations with tags.

This is added for many derivates need no tags. See [issue #105](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/105) for details. But **I suggest to use boxed filter since this still need you to manually tag equations**.  

You may use this with `Auto-number tagged equations only`. see [[Useful Tricks & techniques#(3) Only Number Important Equations]] for details.

2. **boxed filters**: Show only equations wrapped with `\boxed{}`. Note for simplicity in this filter it only check if the first non-blank line of equations has `\boxed`. 

You can use Latex Suite `box current equation` command to box equations, we also provide a command `box current equation` in our plugin, so you can just select a equation and run this command to box it 

>  To support [typst mode](https://github.com/azyarashi/obsidian-typst-mate) box, this plugin use `boxed` as default typst box symbol (for `typst mate` plugin). This can be set at `settings > Display (Categorical) > Others > Typst box symbol`, see [feature #140](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/140) for details.

For some users, they use the first line of multi-line equation as class, we also provide an option to this. Check `Settings > Display (Categorical) > Equation Panel > Skip first line when filter boxed equation` to enable this feature.
```latex
$$phy
\boxed{
E = mc^2
}
$$
```

## 4. Auto-numbering System  
Use the command `Auto-number current file equations` or the toolbar button can automatically number all equations in current file based on heading level. 
### 1) Some important settings 

**Numbering Methods:**
- **Relative**: Numbers based on relative  heading hierarchy (2.1.1, 2.1.2, etc.)
- **Absolute**: Auto-number using the absolute heading level (1.1, 1.2 for #, etc.) 

**Numbering depth (1-6)** : controls the max level to auto-number `(1.1), (1.1.1)`  

### 2) Citation Updates During Auto-numbering 
When auto-numbering runs, all citations are automatically updated to match new numbers. This allows you insert or delete equations any where and no need to worry about renumbering or broken citations. 

But there are 2 settings to resolve the conflict in auto-numbering process: 
1. **Auto delete conflict tag citations** (default: true) : when a tag is renamed into another one, while the old citations for this tag still exist(not modified after auto-numbering), they will be automatically deleted to avoid wrong citations. 
2. **Auto delete unused tag citations** (default: false) :  if a citations is not used, it will be automatically deleted. (Only use this settings if you rely solely on auto-number for tag management).

## 5. PDF Export 

You need to run `Make markdown copy to export PDF` to export a markdown to ensure the styles are exported correctly.  

Note images may not centered after export, so I recommend you to add a simple snippet  (https://www.youtube.com/watch?v=ngcocqUPiE8), or just download a theme with image centered like `Blue Topaz`

## 6. Beta Features 

I strongly recommend you not to use `Cite with inline code block in callout`. Citations will failed to render inside the callout. Since its a built-in problem for links in obsidian, we won't fully support writing citations in callouts (Including not auto-update and not auto export). 

---------

Congrats 🎉! You are all ready to use this plugin😄 !

*Created for Equation Citator v1.3.4 - For updates and issues, visit the [GitHub repository](https://github.com/FRIEDparrot/obsidian-equation-citator)* 
