**Copy this File (and also 2 citation test) to your vault and enable the plugin to finish the tutorial.**

Firstly,  we use `tag{}` for equation just as in latex grammar like follows : 
equation1 : 
$$
\text{This is a no-heading equation, used in auto number section} \tag{P1}
$$
equation2 : 
$$
\text{This is a no-heading equation test for continuous cite} \tag{P2}
$$
We use  $\ref{eq:P1}$ and $\ref{eq:P2}$ to cite above equations, **Hold ctrl to see preview**.  

## 1. Begin Tutorial  
### (1) Basic Citations 
We use  `\ref{eq:1.1.1}` for cite the equation $\ref{eq:1.1.1}$ in file : 
$$
\Large\boxed{T ds = du + p dv = dh - vdp} \tag{1.1.1}
$$
- **How to cite equations faster** 
There is a command in equation citator `insert equation citation on cursor position` this command will directly insert `\ref{eq:}` at cursor,  add it a hot key to cite faster! 

Here we cite $\ref{eq:1.1.2}$ 
$$ \Large\boxed{G = H - TS} \tag{1.1.2} $$
Also, citing multi equations in one citation is always allowed. This is set in `SettingsTab > Multi Equation Deliminator`, which is default comma. We can cite  1.1.1 and 1.1.3 by $\ref{eq:1.1.1, 1.1.3}$ 
$$ \boxed{T = \left( \frac{\partial u}{\partial s}\right)_{v} \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{1.1.3} $$

### (2) Cross File Citation
Use footnote format (ctrl P + `insert footnote` ), and in the page footer , use **pure file citation format** 

```markdown
[^1]: [[another-file-you-need-to-cite]]
```

We can cite equation by footnote $\ref{eq:1^1.1}$. Hold ctrl to see preview. 

### (3) Continuous Citation
The equation `$\ref{eq:1^1.3.1~3, 1^2.1.1~2}$ ` will be rendered  as :  $\ref{eq: 1^1.3.1~3 , 1^2.1.1~2}$ 

Note if we enable the continuous citation, the equation write in a continuous sequence will also be rendered continuously.  For example, `$\ref{eq:1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5}` will be rendered as $\ref{eq:1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5}$ . 

Similarly, we can use `$\ref{eq:P1, P2}$`, which will be rendered as $\ref{eq:P1, P2}$, but we can also simply use $\ref{eq:P1~2}$ 
$$ \Large \boxed{du = T ds  - p dv} \tag{1.3.1} $$
$$ \Large \boxed{\Large df = -s dT- pdv } \tag{1.3.2} $$
$$ \Large\boxed{G = H - TS} \tag{1.3.3} $$

$$ F = ma \tag{1.3.4} $$
$$ \Large \boxed{I = \frac{1}{12} ml^{2}} \tag{1.3.5} $$

We can also use cross file citation continuously, such as  `$\ref{eq:2^1.3.1, 2^1.3.2, 2^1.3.3, 2^2.1.1~2}$ `.  This is render result :  $\ref{eq:2^1.3.1, 2^1.3.2, 2^1.3.3, 2^2.1.1~2}$  

For the 
```
$\ref{eq:2^1.3.1, 2^1.3.2, 2^1.3.3, 2^2.1.1~2}$
```  

This will be rendered as $\ref{eq:2^1.3.1, 2^1.3.2, 2^1.3.3, 2^2.1.1~2}$.  Note multi continuous will citation will also combined, such as :   $\ref{eq:1~2,3~4}$ 

The following (such as writing multiple `\ref{}` in a citation,  or have wrong pr
efix) is incorrect citation pattern, which will not be rendered.  

```
$\ref{eq:1.1} \ref{}$ ,  $\ref{123}$
```

rendered as :  $\ref{eq:1.1} \ref{}$ ,  $\ref{123}$ 

## 2. Auto-number Settings 
### (1) Auto-number equation feature 
Use auto-number command `(ctrl+p) -> Auto-number current file equations`. We use equation $\ref{eq:2.1.1, 2.1.2, 2.1.3}$ as example. Also you can use the function icon on your tool ribbon. 

> NOTE : auto-number command will not work at reading mode 

We can **set level, prefix and numbering method (absolute or relative)** in  settings tab of plugin. 
$$ g = h - Ts = u - v\left(\frac{\partial u}{\partial v}\right)_s - s\left( \frac{\partial u}{\partial s}\right)_{v} \tag{2.1.1} $$
$$ \Large \boxed{dg = - s dT+v dp } \tag{2.1.2} $$

For math equations **in quotation**, they will not be auto-numbered by default(we can still set it in settings tab). And we can always cite this equation by $\ref{eq:M}$ and $\ref{eq:N}$ : 

> [!NOTE] 
> $$ \text{This is a equation in quotation} \tag{M}$$
> > $$ \text{nest equation} \tag{N} $$


### (2) Follow this rule 
The auto-number command scan the file and add number add numbers to each equation block. So for it works correctly, you should follow this format when writing equation blocks : 

```python
# 1-line equation block format
# ```code
# $$ \Large \boxed{dg = - s dT+v dp } $$   
# ```
# multi-line equation block format
$$
\Large \boxed{dg = - s dT+v dp } 
$$

# write equation freely in multi-line is also supported and being tested 
$$ du = \left(\frac{\partial u}{\partial s}\right)_v ds +\left( \frac{\partial u}{\partial v}\right)_s dv \rightarrow 
\quad \boxed{T = \left( \frac{\partial u}{\partial s}\right)_v, \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{3.1.1} $$
```

NOT WRITE ANY OTHER CONTENT IN THE  LINE OF EQUATION BLOCK, FOLLOWING FORMAT IS NOT SUPPORTED FOR AUTO NUMBERING :  
```python 
Some Content $$equation$$   
# or 
this  is an $$ equation 
$$ block 
# not write content before or after equation block in one line!
```


### (3) Current glitches & to do list  
**Features coming soon** : 
1. **Support for preview in reading mode** : Now preview is not available in reading mode, which will be add in the next minor version 
2. **Auto-Complete support** : Both in-file and cross-file citation will support auto-complete when typing.
3. **Double-click jump** :  double-click to jump to location of specific equation. 
4. **File superscript render** : file super-script will render the corresponding footnote in future. 

**Features In future** : 
1. **Update links when renaming equations in auto-numbering(also provide rename citation option)** : when auto-number command triggered, automatically update citation number. 
2. Auto-tag while Editing : add an option to auto-tag when cursor move out of equation blocks. 
3. **More pdf support**  :  In-file citation may can be rendered as link which can jump to correct position in pdf. But obsidian didn't provide any API to do this,  link jump is also not available, so I still not figure it out.  Also I still not figure out how to  modify the exported content in pdf (since `@print` can only control styles of original content)  

[^1]: [[Cross-File Citation Test 1|Article 1]]
[^2]: [[Cross-File Citation Test2|Article 2]]

- By [FriedParrot](https://github.com/friedparrot) at  2025.8.3 
