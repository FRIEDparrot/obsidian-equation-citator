# Image Parser Test Cases

This file contains test cases for the image parser.

## Type 1: Weblink Format (Obsidian's ![[]] syntax)

### Valid weblink images
![[image.png|fig:3.1|title:Test Figure|desc:A test description]]
![[photo.jpg|fig:4-1|desc:Another test]]
![[diagram.svg|fig:1.1|title:Data Table]]

### Excalidraw (Type 3)
![[drawing.excalidraw.svg|fig:5.1|desc:Architecture diagram]]
![[sketch.excalidraw|fig:6.2|title:Wireframe]]

## Type 2: Markdown Format

### Valid markdown images
![fig:4-1|desc:Wikipedia source](https://example.com/image.png)
![fig:7.1|title:Remote Image](https://example.com/photo.jpg)
![table:2.1|desc:External data](./local/image.png)

## Invalid Cases (Should NOT be parsed)

### Images with text on same line
Some text ![[image.png|fig:99.1]] more text

### Images in code blocks
```
![[image.png|fig:100.1]]
![fig:101.1](https://example.com/image.png)
```

### Images in quotes (should be ignored)
> ![[quoted-image.png|fig:200.1|desc:In quote]]
> ![fig:201.1](https://example.com/quoted.jpg)

### Invalid formats
![[no-tag-image.png]]
![no tag](https://example.com/image.png)
[not an image](https://example.com)

## Edge Cases

### Multiple metadata
![[complex.png|fig:10.1|title:Complex Title|desc:Long description here|other:metadata]]

### No metadata except tag
![[simple.jpg|fig:11.1]]
![fig:12.1](https://example.com/simple.png)

### Empty metadata
![[empty.png||fig:13.1||]]
