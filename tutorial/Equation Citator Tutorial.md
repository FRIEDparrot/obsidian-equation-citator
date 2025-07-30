Firstly,  we use `tag{}` for equation just as in latex grammar like follows : 
equation1 : 
$$
\text{This is a no-heading equation, used in auto number section} \tag{P1}
$$
equation2 : 
$$
\text{This is a no-heading equation test for continuous cite} \tag{P2}
$$

## 1. Introduction
### (1) Basic Citations 
We use  `\ref{eq:1.1.1}` for cite the equation $\ref{eq:1.1.1}$ in file : 
$$
\Large\boxed{T ds = du + p dv = dh - vdp} \tag{1.1.1}
$$
- **How to cite equations faster** 
There is a command in equation citator `insert equation citation on cursor position` this command will directly insert `\ref{eq:}` at cursor,  add it a hot key to cite faster!
$$ \Large\boxed{G = H - TS} \tag{1.1.2} $$
Also, citing multi equations in one citation is always allowed. This is set in `SettingsTab > Multi Equation Deliminator`, which is default comma. We can cite  1.1.1 and 1.1.3 by $\ref{eq:1.1.1, 1.1.3}$ 
$$ \boxed{T = \left( \frac{\partial u}{\partial s}\right)_{v} \quad p = - \left(\frac{\partial u}{\partial v} \right)_s} \tag{1.1.3} $$

### (2) Cross File Citation
Use footnote format (ctrl P + `insert footnote` ), and in the page footer , use **pure file citation format** 

```markdown
[^1]: [[another-file-you-need-to-cite]]
```

We can cite equation by footnote $\ref{eq:1.1^1}$. Hold ctrl to see preview. 

### (3) Continuous Citation
The equation `$\ref{eq:1.3.1~3^1, 2.1.1~2^1}$ ` will be rendered  as :  $\ref{eq:1.3.1~3^1 , 2.1.1~2^1}$  

Note if we enable the continuous citation, the equation write in a continuous sequence will also be rendered continuously.  For example, `$\ref{eq:1.3.1, 1.3.2, 1.3.3}` will be rendered as $\ref{eq:1.3.1, 1.3.2, 1.3.3}$. 

Similarly, we can use `$\ref{eq:P1, P2}$`, which will be rendered as $\ref{eq:P1, P2}$ 
$$ \Large \boxed{du = T ds  - p dv} \tag{1.3.1} $$
$$ \Large \boxed{\Large df = -s dT- pdv } \tag{1.3.2} $$
$$ \Large\boxed{G = H - TS} \tag{1.3.3} $$

We can also use cross file citation continuously, such as  `$\ref{eq:1.3.1^2, 1.3.2^2, 1.3.3^2, 2.1.1~2^2}$ `.   $\ref{eq:1.3.1^2, 1.3.2^2, 1.3.3^2, 2.1.1~2^2}$ 

## 2. Auto-number Settings 
### (1) Auto-number equation feature 
Use auto-number command `(ctrl+p) -> Auto-number current file equations`. We use equation $\ref{eq:2.1.1, 2.1.2, 2.1.3}$ as example. Also you can use the function icon on your tool ribbon. 

> NOTE : auto-number command will not work at reading mode 

We can **set level, prefix and numbering method (absolute or relative)** in  settings tab of plugin. 
$$ g = h - Ts = u - v\left(\frac{\partial u}{\partial v}\right)_s - s\left( \frac{\partial u}{\partial s}\right)_v \tag{2.1.1} $$
$$ \Large \boxed{dg = - s dT+v dp } \tag{2.1.2} $$

For math equation **in quotation**, it will not be auto-numbered. But we can still cite this equation : 

> [!NOTE] 
> $$\text{This is a equation in quotation}$$

### (2) Follow this rule 
The auto-number command scan the file and add number add numbers to each equation block. So for it works correctly, you should follow this format when writing equation blocks : 

```python
# 1-line equation block format  
$$ \Large \boxed{dg = - s dT+v dp } $$     

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


### (3) TO DO LIST 

1. **Update links when renaming equations** : when auto-number command triggered, automatic update citation.  

2. **More pdf support**  :  in-file citation may be rendered as link which can jump to correct position in pdf in the future version  



[^1]: [[test file for citation]]


- By [FriedParrot](https://github.com/friedparrot) at  2025.7  

