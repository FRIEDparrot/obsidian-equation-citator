# Callout Parser Test Cases

This file contains test cases for the callout/quote citation parser.

## Valid Callouts

### Basic table callout
> [!table:1.1]
> This is a basic table callout
> with multiple lines of content

### Theorem callout
> [!thm:2.3]
> **Theorem**: This is an important theorem
> that spans multiple lines.
>
> The proof is left as an exercise.

### Definition callout
> [!def:3.5]
> **Definition**: A callout is a special block
> that can contain formatted content.

### Various tag formats
> [!table:1.1]
> Tag with dot separator

> [!thm:2-3]
> Tag with dash separator

> [!def:A.5]
> Tag with letter prefix

> [!table:10.20.30]
> Tag with multiple levels

## Edge Cases

### Single line callout
> [!table:4.2]
> Just one line of content

### Callout with markdown table
> [!table:5.1]
> | Column 1 | Column 2 |
> |----------|----------|
> | Data 1   | Data 2   |
> | Data 3   | Data 4   |

### Callout with code block inside
> [!def:6.1]
> This definition includes code:
> ```python
> def example():
>     return True
> ```

### Empty lines in callout
> [!thm:7.1]
> First paragraph
>
> Second paragraph after empty line

### Callout with nested quote
> [!table:8.1]
> Outer content
> > Nested quote (part of the callout content)
> > More nested content
> Back to outer level

## Invalid Cases (Should NOT be parsed)

### Regular quote without citation
> This is just a regular quote
> without any citation tag
> Should not be parsed as callout

### Callout in code block
```
> [!table:999]
> This should not be parsed
> because it's in a code block
```

### Inline code with callout syntax
This is inline code: `> [!table:100]` and should be ignored.

### Callout with unconfigured prefix
> [!example:1.1]
> This uses "example:" prefix which is not configured
> Should not be parsed

> [!note:2.2]
> This uses "note:" prefix which is not configured
> Should not be parsed

### Callout without tag
> [!table]
> Missing the tag part (no colon and number)
> Should not be parsed

> [!table:]
> Has prefix but no tag after colon
> Should not be parsed

## Multiple Callouts

### Sequential callouts
> [!table:10.1]
> First table

Some regular text between callouts.

> [!thm:10.2]
> First theorem

More regular text.

> [!def:10.3]
> First definition

### Mixed with regular content
Regular paragraph before.

> [!table:11.1]
> Table in the middle

Another regular paragraph.

> Regular quote without citation
> Just a normal quote

> [!thm:11.2]
> Theorem after regular quote

Final paragraph.

## Line Number Tracking

> [!table:12.1]
> Line 1 of callout
> Line 2 of callout
> Line 3 of callout

The above callout should track correct line start and end positions.

## Quote Depth

> [!table:13.1]
> Depth 1 callout

>> [!table:13.2]
>> This is depth 2 (if supported)
>> Should track different quote depth

## Unclosed Callout (at end of file)

> [!table:14.1]
> This callout is at the end
> and has no closing (no non-quote line after)
> Should still be parsed correctly
