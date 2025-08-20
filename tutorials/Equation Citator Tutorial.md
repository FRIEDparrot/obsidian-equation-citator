<h1>📘 Equation Citator Plugin Tutorial</h1>
> Copy this file (and the **2 citation test files**) into your vault, then enable the plugin to follow this tutorial.

The first two equations are used to test **auto-numbering without headings** 
$$
\text{This is a no-heading equation, used in auto number section} \tag{P1}
$$
$$
\text{This is a no-heading equation test for continuous cite} \tag{P2}
$$

## 1. Begin Tutorial  
### (1) Basic Citations 

To cite an equation, add a tag with `\tag{1.1.1}` (just like in LaTeX)
$$
\Large\boxed{T ds = du + p dv = dh - vdp} \tag{1.1.1}
$$

Once you add `\tag{}` to the equation, this plugin will automatically resolve it. 

Use `\ref{eq:1.1.1}` for cite the equation $\ref{eq:1.1.1}$, for above 2 equations, use $\ref{eq:P1}$, $\ref{eq:P2}$ 

👉 **Utitlity Commands** : Use the command **`Insert equation citation at cursor`** to quickly insert `\ref{eq:}`. The command `Insert tag on cursor position with auto-number` is also provided to insert in equations and automatically number it.  

❌ **Wrong grammars** : The following (such as writing multiple `\ref{}` in a citation,  or have wrong prefix) is incorrect citation pattern, which will not be rendered. 
```latex
$\ref{eq:1.1} \ref{}$ ,  $\ref{123}$
```

> [!tip] 
> **Preview Equations by citation** : Hold `ctrl` and move mouse here to see the equation preview. 
> 
> **Link Jump**: You can use `double click` on the equation to jump to this equation, or use `ctrl + double click` to open it in an adjacent file panel. 

> [!Check] Feature : Rename tag 
> We allow you to **rename the tag of equations**. which allows you to change the citation number of equation easily. 
> 
> when you select `\tag{1.1.1}` above, you can right click on it and select `rename tag` to rename it to any other name. **When the tag is renamed, all the citations of it will be updated automatically**.   
> 

### (2) Cite multiple equations 
Multiple citations are separated by commas (default delimiter).  
For example, we can cite  1.1.1, 1.1.2 and 1.1.3 by $\ref{eq:1.1.1, 1.1.2, 1.1.3}$  
$$ \Large\boxed{G = H - TS} \tag{1.1.2} $$
$$ 
\boxed{T = \left( \frac{\partial u}{\partial s}\right)_{v} \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{1.1.3}
$$

If we enable the continuous citation, multiple equations write in a continuous sequence will also be rendered in continuous format.  For example, `$\ref{eq:1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5}` will be rendered as $\ref{eq:1.3.1~5}$. 

We can also directly use continuous grammar to cite multiple equations, such as `$\ref{eq:1.3.1~3, 1.2.1~2}$`, rendered as $\ref{eq:1.1.3.1~3, 1.2.1~2}$, or Similarly, `$\ref{eq:P1, P2}$` and `$\ref{eq:P1~2}$` , will be rendered as $\ref{eq:P1, P2}$. 

$$ \Large \boxed{du = T ds - p dv} \tag{1.3.1} $$

$$ \Large \boxed{\Large df = -s dT- pdv } \tag{1.3.2} $$

$$ \Large\boxed{G = H - TS} \tag{1.3.3} $$

$$ F = ma \tag{1.3.4} $$

$$ \Large \boxed{I = \frac{1}{12} ml^{2}} \tag{1.3.5} $$

### (3) Cross File Citation 
Use footnote format **(ctrl P + `insert footnote` )**, and in the page footer , use **pure file citation format**, Here we use [^1] [^2] for example.

```latex
%% Footnote Grammar :  
[^1]: [[another-file-you-need-to-cite|file alias to display]]
```

These are the two footnotes we used in this file (this denotes the file you want to cite)

[^1]: [[Cross-File Citation Test1|Article 1]] 

[^2]: [[Cross-File Citation Test2|Article 2]] 

We can cite equation by footnote number as following :

```latex
% cross-file citation before 1.2.2 
$\ref{eq:1^1.1}$, $\ref{eq:1^1.1.3, 1^1.1.4}$
% following recommended format (nested braces) is supported after 1.2.2  
$\ref{eq:1^{1.1}}$, $\ref{eq:1^{1.1.3}, 1^{1.1.4}}$
```

This is rendered as $\ref{eq:1^{1.1}}$, $\ref{eq:1^{1.1.3}, 1^{1.1.4}}$

### (4) Combine them all together 
We can also use cross file citation continuously, such as  `$\ref{eq:2^{1.3.1}, 2^{1.3.2}, 2^{2.1.1}, 2^{2.1.2}}$ `.  

This is render result :  $\ref{eq:2^{1.1.1~2},2^{1.2.1~2}}$  

or use continuous format :  
```latex
$\ref{eq:2^1.3.1~3, 2^2.1.1~2}$
% use following pattern is recommended (supported after version 1.2.2)
$\ref{eq:2^{1.3.1~3}, 2^{2.1.1~2}$
```

This will be rendered as $\ref{eq:2^{1.1.1~3},2^{1.2.1~2}}$.   

### (5) PDF Export 
When directly export the whole markdown document to PDF file, the obsidian can't render the citations correctly. 

So use command `Make markdown copy to export PDF` to **make a correctly-rendered markdown from current note to export pdf** (As is said in readme file). 

This command will create a new note with the same content as the current note, but with the citation format changed to the correct format for PDF export. 

## 2. Auto-number Settings

### (1) Auto-number equation feature 
Use auto-number command `(ctrl+p) -> Auto-number current file equations`. We use equation $\ref{eq:2.1.1~2}$ as example. Also you can use the function icon on your tool ribbon. 

We can **set numbering method (absolute or relative) level, and prefix** in  settings tab of plugin.   

> [!tip] Relative number method and  
> `Auto-number` numbers your equations by the title level in outline.  
> **Relative** number  

$$ g = h - Ts = u - v\left(\frac{\partial u}{\partial v}\right)_s - s\left( \frac{\partial u}{\partial s}\right)_{v} \tag{2.1.1} $$
$$ \Large \boxed{dg = - s dT+v dp } \tag{2.1.2} $$

For math equations **in quotation**, they will not be auto-numbered by default(we can still set it in settings tab). And we can always cite this equation by $\ref{eq:M}$ and $\ref{eq:N}$ :

> [!HINT] Toggle auto-number equations in Quotes option to auto number following
> 
> $$ \text{This is a equation in quotation} \tag{M}$$
> > $$ \text{nest equation} \tag{N} $$

### (2) Citations Update Rule Settings in Auto Numbering
👉🏻 `Auto-number Equations in Current File` Command will also **automatically updates all related `\ref{}` citations** throughout the document. This ensures all references remain consistent with the current equation labels. 

For example, if your document contains :
```markdown
$\ref{eq:1.1.1}$
```

if this equation is renumbered to following after auto-number :

```latex
\tag{1.1.1} -> \tag{3.2.1}
```

reference for this equation will be automatically updated to: 

```markdown
$\ref{eq:1.1.1}$ -> $\ref{eq:3.2.1}$
```

This process is handled automatically and does not require manual updates to citations.

**Important related Settings of auto-numbering citation update are as follows** : 
#### 1. Auto Delete Conflicting Tag Citations
If two citations in the file end up referring to the same tag (e.g., both become `\ref{eq:3.2.2}` after renaming), a **conflict** arises. 

* **When you are renaming a tag**, if there is conflict, the plugin will prompt you to manually resolve the conflict (e.g., by choosing to keep or delete the conflicting citation). 
* **This setting controls how the conflict is resolved in equation auto-numbering**, when enabled, the plugin will **delete the conflicting citation** to avoid incorrect references. (if it's not enabled, the conflicting citations will be kept).  

**Example**:
An old equation has `\tag{3.2.1}` and is referenced via `$\ref{eq:3.2.1}$`.
If the tag is renamed to `\tag{3.2.2}`, the reference will be updated to `$\ref{eq:3.2.2}$`.
But if there is already another `$\ref{eq:3.2.2}$` in the file that is **not renamed at the same time**, it will be **removed** automatically to prevent incorrect citations.

This behavior ensures that each `\ref{}` remains correctly and always associated with its intended equation. 

#### 2. Auto Delete Unused Tag Citations 
During auto-numbering, if an `\ref{}` citation exists in the file but no corresponding equation with a matching `\tag{}` is found, this citation would be considered  as **unused** and then removed. 

* **If this setting is enabled**, such orphaned citations will be automatically removed.
* This is useful when equations have been deleted or moved, preventing broken references from remaining in the file. 
* Since the auto-number would reset your equation tags, **I strongly recommend you enable this setting only when you always use auto-numbering to generate equation tags** (no manual tags like `\tag{A}`). 

Also, if a citation cites equation in quoted block (e.g., `> ...`) and the setting `Auto Numbering Equations in Quotes` is disabled, the citation will also be treated as unused and removed 

> [!warning] 
> What my recommendation is :  
> * Enable these options if you frequently reorganize or refactor equations, always use auto-numbering to generate equation tags, and want to avoid manually resolving broken or duplicate citations.
> * Leave them disabled if you prefer manual control over citation edits and conflict resolution. 

## 3. Simple writing guidelines you should follow 
This plugin relies on text parsing, so please follow these three very simple guidelines to ensure it works correctly. 
### (1) Code block format   
Always use 3 backticks for code block : 
```
Code block 
```

### (2)  In Tag | citations  

Avoid using `\}` in your tag or citation (this will cause the tag recognized incorrectly) 

```sh
\tag{1.2\}3}   # we will not support bracecs in tags 
$\ref{1.2\}}$  # not write redundant braces in citations  
```

### (3) Equation block 
**NOT WRITE ANY OTHER CONTENT IN THE  LINE OF EQUATION BLOCK** 

✅ CORRECT EXAMPLES :  

```python
# 1-line equation block format

# ```code
$$ \Large \boxed{dg = - s dT+v dp } $$  
# ``` 

# multi-line equation block format

$$
\Large \boxed{dg = - s dT+v dp }
$$

# write equation freely in multi-line is also supported and being tested

$$ du = \left(\frac{\partial u}{\partial s}\right)_v ds +\left( \frac{\partial u}{\partial v}\right)_s dv \rightarrow

\quad \boxed{T = \left( \frac{\partial u}{\partial s}\right)_v, \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{3.1.1} $$

```

❌ NOT SUPPORTED EXAMPLES : 

```sh 
Some Content $$equation$$   # not write any content before it ! 
# or 
this  is an $$ equation
$$ block  # not write content before or after equation block in one line!
```

## 4. Beta Features 
Beta features are features not fully supported yet, and we may not add full support for them in recent future. 

### (1) Cite with inline code in callout  
This plugin doesn't support citation in callout because of internal flaws (see [bug #4](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/4)), but if that is necessary for you, you can use \`\$\ref{eq:1.1}$\` to cite equation in callout by enabling this beta feature. 

For example, enable the beta feature and change the content of following callout (or re-open the file) to render citations in callout. 

> [!NOTE]
> Normal citations will be rendered incorrectly in callout $\ref{eq:1.1.1}$, but if you enable this beta feature, this is a  citation in callout  test for `$\ref{eq:1.1.3, 1.3.1, }$` 

> [!DANGER] **Limitations**
> 1. When equation tag is changed or auto-numbering is triggered, this citation will not be updated automatically. (need to manually update) 
> 2. Correct render of this citation is not supported in PDF export. (need your manually fix)

## 6. Todo list & In future 

**Core Features to do list** :

- [x] **Support for preview in reading mode** (added in version 1.1.0)

- [x] **Auto-Complete support** : (added in version 1.1.0)

- [x] **Double-click jump** :  double-click to jump to location of specific equation. (added in version 1.2.0)  

- [x] **Rename Equation Tag** : Update links when renaming equations in auto-numbering: when auto-number command triggered, automatically update citation number.  (added in version 1.2.0)

- [x] **Support Nested Braces** in file citation (version 1.2.2)  
```sh
$\ref{eq:1^{1.3.1}, 1^{1.3.2}}$    # this format may be supported in future.
```

- [x] Insert with auto-tag : command for insert tag and auto-number at the same time for quick add equations (version 1.2.2)
- [ ] **File superscript render** : file super-script will rendered as the corresponding footnote in future. 

**Other features I wanna to add in future** : 
- [ ] More support for figure and table citation (thanks for [Feature #7 by AliceComma](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/7))
- [ ] Your issues and feature suggestions here  

- By [FriedParrot](https://github.com/friedparrot) at  2025.8.3 
