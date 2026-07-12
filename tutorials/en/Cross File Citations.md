This file is create to showcase the cross-file citations in both **repository** and **web-browser** citations. 

We support the equations :
$$
eq \tag{2.3.1}
$$

Figures: 

![[img/Equation Citator Logo.png|fig:F1]]

and callouts : 

> [!table:basic-grammar] Basic grammar for equation Citator 
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
