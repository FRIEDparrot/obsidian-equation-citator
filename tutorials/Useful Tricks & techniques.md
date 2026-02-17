# Common Usage Techniques and Tricks

> [!summary] 
> This tutorial gives a collection for **practical tricks and advanced auto-numbering techniques** based on frequent user feedback and common scenarios.
> 
> Each section addresses a specific need (like skipping numbers, tagging only key equations, etc.).  
> 

## 1. Auto-numbering tricks 
### (1) Ignore (Exclude) a specific equation from Auto-Numbering
If most equations in a file are numbered automatically, but you want one equation to retain a fixed custom tag (e.g. `eq:M1`), you can exclude it from auto-numbering by wrapping it in a quote (or a callout).

Example original equation (that would normally be renumbered):
```
$$
k = \frac{F \Delta l}{l} \tag{1.1}
$$
```

To keep a custom tag:
> $$
> k = \frac{F \Delta l}{l} \tag{eq:M1}
> $$

Notes:
- Putting the equation in a one-line block with extra inline text both before and after (e.g. inside a table row) can also prevent auto-numbering, but using a quote (`>`) is cleaner and more intentional.

### (2) Ignore a heading from heading list 
This is a common case when you are drafting an essay and there are **several chapters before the first chapter**, like **Abstract** or **Preface**. You don't want to share the numbering between **abstract** and the main part, you can use HTML format for headings.

```html
<h1> Abstract </h1>
```

The above heading will be ignored from the auto-numbering heading list. You can check `settings > Basic > Auto number no heading prefix` and set it as you need (e.g., `A`), then the result would just like : 
```
<h1> Abstract </h1>
$$... \tag{A1}$$
# Chapter1
$$... \tag{1.1}$$
```

### (3) Only Number Important Equations 
If a file contains many derivation steps but you only want to assign numbers to a few key equations you intend to cite:

1. Enable the option: 
   - `Settings > Categorial > Auto number tagged equations only`
2. Add tags manually to the equations you care about:
   - At the end: use your shortcut (e.g. “Insert tag on cursor position auto-number”).
   - Mid-expression: insert with `\tag{A}` or some other, then run auto-numbering. 

After that, only tagged equations will receive numbers. In that case, non-tagged derivations stay unnumbered, while key equations remain stable and citable.

> [!NOTE] An easier way to filter important equations
> Since the above method still need some effort to manually add tags, After v1.3.3, we added another feature `filter the boxed equation` in equation panel, so I suggest just **add `\boxed{}` to those important equations**. So that you can auto number all equations and just filter them when you need.

## 2. Figure & Table Citation Tricks
### (1) Editing a Table Inside a Callout More Easily
Editing tables inside callouts can be awkward because each line begins with `>`. Here is a workflow to simplify that (see also [feature #7](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/7)):

1. Temporarily remove the quote markers:
   - Use `Ctrl + Shift` + vertical drag (to place multiple cursors).
   - Delete the leading `>` from each table line.
2. Edit the table normally.
3. Re-wrap the table in a callout:
   - Insert a callout (e.g. press `Ctrl + Q`) to re-add `>` to all lines.
   - Ensure the callout header line (e.g. `> [!note]`) is positioned correctly above the table.
4. Merge adjoining blocks if they split.

## 3. Move Equations and Footnotes from One File into Another
When migrating a section (including equations and footnotes) into a larger document while preserving clean numbering, you can follow these steps. 
#### Step 1. Update Footnote References Before Moving

If your source file has footnote definitions like:
```
[^2]: Some note referencing [[test article]]
```
And the target file already uses footnotes up to `[^5]`, then:
- Rename `[^2]` → `[^6]`
- Update all inline citation patterns associated with `2^{…}` if that’s your nested cross-file citation style.

Efficient search:
- Use `Ctrl + H` with the search term: `2^{` , or search the citation format `\ref{eq:` 
- Replace carefully with: `6^{` , update all citations manually. 

> [!warning]
> Don't replace all at once, patterns like `2^{100}` (exponent expressions) may accidentally match your citation format.

#### Step 2. Apply a Prefix to the Equations in the Source File

1. Go to: `Settings > Categorial > Auto numbering > Enable auto number prefix`
2. Set a prefix (e.g. `M`) 
3. Run auto-numbering in the source file.

After this, equations become:
- `M1.1`, `M1.2`, `M1.3`, …

This distinguishes migrated equations from native ones in the destination.

#### Step 3. Move Content

Copy or append :
- Any content and prefixed equations
- Updated footnotes 

Paste them into the target file in the desired section.

#### Step 4. Update Backlinks

Open the backlink panel for the original (now empty) file and update references to point to the merged target file if needed (especially if other notes link to the old section).

#### Step 5. Re-run Auto-Numbering and Clean Up

In the target file:
1. Re-auto-number (if the integration recalculates numbers globally).
2. Verify all citations still resolve.
3. Delete the original source file if it is fully migrated.

