**Copy this File (and also 2 citation test) to your vault and enable the plugin to finish the tutorial.** 

Firstly,  we use `tag{}` for equation just as in latex grammar like follows :
equation1 :
$$
\text{This is a no-heading equation, used in auto number section} \tag{P1}
$$
equation2 :
$$
\text{This is a no-heading equation test for continuous cite} \tag{P2}
$$

We use  $\ref{eq:P1}$ and $\ref{eq:P2}$ to cite above equations, **==Hold ctrl and move mouse here to see the equation preview (If you are in reading mode, just move mouse over it)==**. 

You can use **double click** on the equation to jump to this equation, or use **ctrl + double click** to open it in an adjacent file panel. 

> [!note] 
> Once you add `\tag{}` to the equation, the plugin will resolve it automatically (no need to add any properties to file!)

## 1. Begin Tutorial  
### (1) Basic Citations 
We use  `\ref{eq:1.1.1}` for cite the equation $\ref{eq:1.1.1}$ in file :

$$
\Large\boxed{T ds = du + p dv = dh - vdp} \tag{1.1.1}
$$

- **How to cite equations faster**

There is a command in equation citator `insert equation citation on cursor position` this command will directly insert `\ref{eq:}` at cursor,  add it a hot key to cite faster!

Here we cite $\ref{eq:1.1.2}$
$$ \Large\boxed{G = H - TS} \tag{1.1.2} $$
Also, citing multi equations in one citation is always allowed. This is set in `SettingsTab > Multi Equation Deliminator`, which is default comma. We can cite  1.1.1 and 1.1.3 by $\ref{eq:1.1.1,1.1.3}$ 
$$ \boxed{T = \left( \frac{\partial u}{\partial s}\right)_{v} \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{1.1.3} $$

### (2) Cross File Citation 

Use footnote format **(ctrl P + `insert footnote` )**, and in the page footer , use **pure file citation format** 

```markdown
[^1]: [[another-file-you-need-to-cite]]
```

These are the two footnotes we used in this file (this denotes the file you want to cite)

[^1]: [[Cross-File Citation Test1|Article 1]]

[^2]: [[Cross-File Citation Test2|Article 2]]


We can cite equation by footnote $\ref{eq:1^1.1}$  . Hold ctrl and move mouse over to see preview.

### (3) Continuous Citation
The equation `$\ref{eq:1^1.3.1~3,1^2.1.1~2}$ ` will be rendered  as :  $\ref{eq:1^1.3.1~3,1^2.1.1~2}$

Note if we enable the continuous citation, the equation write in a continuous sequence will also be rendered continuously.  For example, `$\ref{eq:1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5}` will be rendered as $\ref{eq:1.3.1~5}$ .

Similarly, we can use `$\ref{eq:P1, P2}$`, which will be rendered as $\ref{eq:P1~2}$, but we can also simply use $\ref{eq:P1~2}$ 
$$ \Large \boxed{du = T ds - p dv} \tag{1.3.1} $$
$$ \Large \boxed{\Large df = -s dT- pdv } \tag{1.3.2} $$
$$ \Large\boxed{G = H - TS} \tag{1.3.3} $$
$$ F = ma \tag{1.3.4} $$
$$ \Large \boxed{I = \frac{1}{12} ml^{2}} \tag{1.3.5} $$

We can also use cross file citation continuously, such as  `$\ref{eq:2^1.3.1, 2^1.3.2, 2^2.1.1, 2^2.1.2}$ `.  This is render result :  $\ref{eq:2^1.3.1, 2^1.3.2, 2^2.1.1, 2^2.1.2}$   

or use continuous format : 
```
$\ref{eq:2^1.3.1~3, 2^2.1.1~2}$
```

This will be rendered as $\ref{eq:2^1.3.1~3,2^2.1.1~2}$.  Note multi continuous will citation will also combined, such as :   $\ref{eq:1~2,3~4}$

The following (such as writing multiple `\ref{}` in a citation,  or have wrong prefix) is incorrect citation pattern, which will not be rendered.  
```
$\ref{eq:1.1} \ref{}$ ,  $\ref{123}$
```
The above is rendered as :  $\ref{eq:1.1} \ref{}$ ,  $\ref{123}$

## 2. Some Useful Features 

### (1) Jump to equation

You can **use `double-click` to jump to the equation position** in the file.

Also, **use `ctrl + double-click` to open a new tab at right side and jump to the equation.**

Here you can use this for test : $\ref{eq:1.1.1,2^1.3.1}$  

### (2) Rename tag 
We allow you to rename the tag of equations. which allows you to insert a new equation of change the citation number of equation easily. 

$$
\boxed{T ds = du + p dv = dh - vdp} \tag{2.2.1}
$$

when you select `\tag{2.1.1}`, you can right click on it and select `rename tag` to rename it to any other name. **When the tag is renamed, all the citations of it will be updated automatically**. 

## 3. Auto-number Settings

### (1) Auto-number equation feature

Use auto-number command `(ctrl+p) -> Auto-number current file equations`. We use equation $\ref{eq:3.1.1~2}$ as example. Also you can use the function icon on your tool ribbon. 

> NOTE : auto-number command will not work at reading mode

We can **set level, prefix and numbering method (absolute or relative)** in  settings tab of plugin. 
$$ g = h - Ts = u - v\left(\frac{\partial u}{\partial v}\right)_s - s\left( \frac{\partial u}{\partial s}\right)_{v} \tag{3.1.1} $$
$$ \Large \boxed{dg = - s dT+v dp } \tag{3.1.2} $$

For math equations **in quotation**, they will not be auto-numbered by default(we can still set it in settings tab). And we can always cite this equation by $\ref{eq:M}$ and $\ref{eq:N}$ :

> [!HINT] Toggle auto-number equations in Quotes option to auto number following
> 
> $$ \text{This is a equation in quotation} \tag{M}$$
> > $$ \text{nest equation} \tag{N} $$

### (2) Citations Update Rule Settings in Auto Numbering
When using the `Auto-number Equations in Current File` command, the plugin not only assigns `\tag{}` labels to unnumbered equations, but also **automatically updates all related `\ref{}` citations** throughout the document. This ensures all references remain consistent with the current equation labels.

For example, if your document contains:

```markdown
$\ref{eq:1.1.1}$
```

and the corresponding equation is renumbered to:

```latex
\tag{3.2.1}
```

then the reference will be automatically updated to:

```markdown
$\ref{eq:3.2.1}$
```

This process is handled automatically and does not require manual updates to citations.

**Important related Settings of auto-numbering citation update are as follows:**

#### 1. Auto Delete Conflicting Tag Citations
If two citations in the file end up referring to the same tag (e.g., both become `\ref{eq:3.2.2}` after renaming), a **conflict** arises.

* **When you are renaming a tag**(see [[#2. Rename tag]]), if there is conflict, the plugin will prompt you to manually resolve the conflict (e.g., by choosing to keep or delete the conflicting citation). 
* **This setting controls how the conflict is resolved in equation auto-numbering**, when enabled, the plugin will **automatically remove the conflicting citation** in order to avoid incorrect references. (if it's not enabled, the conflicting citation will be kept). 

**Example**:
An old equation has `\tag{3.2.1}` and is referenced via `$\ref{eq:3.2.1}$`.
If the tag is renamed to `\tag{3.2.2}`, the reference will be updated to `$\ref{eq:3.2.2}$`.
But if there is already another `$\ref{eq:3.2.2}$` in the file that was **not renamed at the same time**, it will be **removed** automatically to prevent incorrect citations.

This behavior ensures that each `\ref{}` remains correctly and always associated with its intended equation. 

#### 2. Auto Delete Unused Tag Citations 
During auto-numbering, if a `\ref{}` citation exists in the file but no corresponding equation with a matching `\tag{}` is found, this citation would be considered  as **unused** and then removed. 

* **If this setting is enabled**, such orphaned citations will be automatically removed.
* This is useful when equations have been deleted or moved, preventing broken references from remaining in the file. 
* Since the auto-number would reset your equation tags, I strongly recommend you enable this setting only when you always use auto-numbering to generate equation tags (no manual tags like `\tag{A}`). 

Also, if a citation appears inside a quoted block (e.g., `> ...`) and the setting **Auto Numbering Equations in Quotes** is disabled, the citation will also be treated as unused and removed. 

> [!warning] 
> What my recommendation is :  
> * Enable these options if you frequently reorganize or refactor equations, always use auto-numbering to generate equation tags, and want to avoid manually resolving broken or duplicate citations.
> * Leave them disabled if you prefer manual control over citation edits and conflict resolution. 

## 4. Follow this rule

The auto-number command scan the file and add number add numbers to each equation block. So for it works correctly, you should follow this format when writing equation blocks :

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

NOT WRITE ANY OTHER CONTENT IN THE  LINE OF EQUATION BLOCK, FOLLOWING FORMAT IS NOT SUPPORTED FOR AUTO NUMBERING :  

```sh 
Some Content $$equation$$   # not write any content before it ! 
# or 
this  is an $$ equation
$$ block  # not write content before or after equation block in one line!
```

## 5. Beta Features 

Beta features are features not fully supported yet, and we may not add full support for them in recent future. 

### (1) Cite with inline code in callout  
This plugin doesn't support citation in callout because of internal flaws (see [bug #4](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/4)), but if that is necessary for you, you can use \`\$\ref{eq:1.1}\$\` to cite equation in callout by enabling this beta feature. 

For example, enable the beta feature and change the content of following callout (or re-open the file) to render citations in callout. 


> [!NOTE]
> Normal citations will be rendered incorrectly in callout $\ref{eq:1.1.1, }$, but if you enable this beta feature, this is a  citation in callout  test for `$\ref{eq:1.1.3, 1.3.1, }$` 

> [!WARNING]
> **Limitations** : 
> 1. When equation tag is changed or auto-numbering is triggered, this citation will not be updated automatically. (need to manually update) 
> 2. Correct render of this citation is not supported in PDF export. (need your manually fix)

## 6. Todo list & In future 

**Core Features to do list** :

- [x] **Support for preview in reading mode** (added in version 1.1.0)

- [x] **Auto-Complete support** : (added in version 1.1.0)

- [x] **Double-click jump** :  double-click to jump to location of specific equation. (added in version 1.2.0)  

- [x] **Rename Equation Tag** : Update links when renaming equations in auto-numbering: when auto-number command triggered, automatically update citation number.  (added in version 1.2.0)


**Other features I wanna to add in future (will not update recently)** : 
1. **File superscript render** : file super-script will render the corresponding footnote in future. 
2. Auto-tag while Editing : add an option to auto-tag when cursor move out of equation blocks.

3. may support bracket pair in file citation, i.e. : 

```sh
$\ref{eq:1^{1.3.1}, 1^{1.3.2}}$    # this format may be supported in future.
```

4. **More pdf support**  :  In-file citation may can be rendered as link which can jump to correct position in pdf. But obsidian didn't provide any API to do this,  link jump is also not available, so I still not figure it out.  Also I still not figure out how to  modify the exported content in pdf (since `@print` can only control styles of original content)  

> [!note] 
> If you have knowledges about obsidian plugin development, you can contribute to this plugin by forking this repo and making pull requests. 
>
> Very appreciate for your contributions! 

- By [FriedParrot](https://github.com/friedparrot) at  2025.8.3 
