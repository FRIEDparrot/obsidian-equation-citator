import {
    getEquationTag,
    parseEquationsInMarkdown,
    isValidEquationPart
} from "@/utils/equation_utils";

describe('getEquationNumber', () => {
    test('should extract tag numbers correctly', () => {
        expect(getEquationTag('E = mc^2 \\tag{1.1}')).toBe('1.1');
        expect(getEquationTag('F = ma \\tag{newton}')).toBe('newton');
        expect(getEquationTag('P = F/A \\tag{3.2.1}')).toBe('3.2.1');
        expect(getEquationTag('No tag here')).toBeUndefined();
        expect(getEquationTag('\\tag{}')).toBeUndefined();
        expect(getEquationTag('\\tag{ }')).toBeUndefined();
        expect(getEquationTag('\\tag{ M }')).toBe('M');
        expect(getEquationTag('\\tag{1.2.3.4} \\tag{5.6}')).toBe('1.2.3.4');
    });
});



describe('isValidEquationPart', () => {
    const validDelimiters = ['.', '-', ':', '_'];

    test('should validate correct patterns', () => {
        expect(isValidEquationPart('1.2.3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('1-2-3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('1:2:3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('1_2_3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('123', validDelimiters)).toBe(true);
    });

    test('should reject invalid patterns', () => {
        expect(isValidEquationPart('1.2.a', validDelimiters)).toBe(false);
        expect(isValidEquationPart('1!2!3', validDelimiters)).toBe(false);
        expect(isValidEquationPart('1 2 3', validDelimiters)).toBe(false);
    });

    test('should handle empty string', () => {
        expect(isValidEquationPart('', validDelimiters)).toBe(false);
    });
});

describe('parseEquationsInMarkdown', () => {
    test('should handle equations in quote blocks and ignore inline code', () => {
        const markdown = `
For math equation **in quotation**, it will not be auto-numbered. But we can still cite this equation $\\ref{eq:M}$
> [!NOTE] 
> $$\\text{This is a equation in quotation} \\tag{M}$$
The following shouldn't be parsed : $\\ref{eq:N}$ -> this is a equation in inline-code 
\`$$ This is a malicious equation \\tag{N}$$\` 
And we add another cases : 
> [!HINT] Toggle equation block test : 
> \`\`\`python
> $$\\text{This is also a equation} \\tag{Q}$$
> \`\`\`
The above case also shouldn't be parsed.`;

        const equations = parseEquationsInMarkdown(markdown, true);

        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('M');
        expect(equations[0].content).toBe('\\text{This is a equation in quotation} \\tag{M}');
        expect(equations[0].raw).toBe('$$\\text{This is a equation in quotation} \\tag{M}$$');
    });

    test('should handle single-line equation blocks', () => {
        const markdown = `
# Simple Equations
$$ E = mc^2 $$
$$ F = ma \\tag{1.1} $$
$$ \\Large \\boxed{dg = - s dT+v dp } $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(3);
        expect(equations[0].content).toBe('E = mc^2');
        expect(equations[0].tag).toBeUndefined();
        expect(equations[1].content).toBe('F = ma \\tag{1.1}');
        expect(equations[1].tag).toBe('1.1');
        expect(equations[2].content).toBe('\\Large \\boxed{dg = - s dT+v dp }');
    });

    test('should handle multi-line equation blocks', () => {
        const markdown = `
$$
F = ma
$$

$$
E = mc^2 \\tag{einstein}
$$`;
        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(2);
        expect(equations[0].content).toBe('F = ma');
        expect(equations[0].lineStart).toBe(1);
        expect(equations[0].lineEnd).toBe(3);
        expect(equations[1].content).toBe('E = mc^2 \\tag{einstein}');
        expect(equations[1].tag).toBe('einstein');
    });

    test('should handle complex multi-line equations', () => {
        const markdown = `$$ du = \\left(\\frac{\\partial u}{\\partial s}\\right)_v ds +\\left( \\frac{\\partial u}{\\partial v}\\right)_s dv \\rightarrow 
\\quad \\boxed{T = \\left( \\frac{\\partial u}{\\partial s}\\right)_v, \\quad p = - \\left(\\frac{\\partial u}{\\partial v} \\right)_s} \\tag{3.1.1} $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('3.1.1');
        expect(equations[0].content).toContain('du = \\left(\\frac{\\partial u}{\\partial s}\\right)_v ds');
        expect(equations[0].lineStart).toBe(0);
        expect(equations[0].lineEnd).toBe(1);
    });

    test('should ignore equations in code blocks', () => {
        const markdown = `
Here's a normal equation:
$$ E = mc^2 \\tag{valid} $$

\`\`\`python
# This should be ignored
$$ F = ma \\tag{invalid1} $$
print("hello")
$$
G = mg \\tag{invalid2}
$$
\`\`\`

Another valid equation:
$$ P = F/A \\tag{valid2} $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(2);
        expect(equations[0].tag).toBe('valid');
        expect(equations[0].content).toBe('E = mc^2 \\tag{valid}');
        expect(equations[1].tag).toBe('valid2');
        expect(equations[1].content).toBe('P = F/A \\tag{valid2}');
        expect(equations.some(eq => eq.tag === 'invalid1')).toBe(false);
        expect(equations.some(eq => eq.tag === 'invalid2')).toBe(false);
    });

    test('should handle nested quote blocks and callouts', () => {
        const markdown = `
> [!NOTE] Simple Note
> $$ a^2 + b^2 = c^2 \\tag{pythagoras} $$

> [!WARNING] 
> > Nested quote
> > $$ \\sin^2(x) + \\cos^2(x) = 1 \\tag{trig} $$

> [!INFO] Multi-line equation in callout
> $$
> \\int_0^\\infty e^{-x} dx = 1
> \\tag{integral}
> $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(3);
        expect(equations[0].tag).toBe('pythagoras');
        expect(equations[0].content).toBe('a^2 + b^2 = c^2 \\tag{pythagoras}');
        expect(equations[1].tag).toBe('trig');
        expect(equations[1].content).toBe('\\sin^2(x) + \\cos^2(x) = 1 \\tag{trig}');
        expect(equations[2].tag).toBe('integral');
        expect(equations[2].content).toBe('\\int_0^\\infty e^{-x} dx = 1\n\\tag{integral}');
    });

    test('should handle edge case: unclosed equation block', () => {
        const markdown = `
$$
F = ma \\tag{unclosed}
This should still be parsed even without closing`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('unclosed');
        expect(equations[0].content).toBe('F = ma \\tag{unclosed}\nThis should still be parsed even without closing');
        expect(equations[0].lineStart).toBe(1);
        expect(equations[0].lineEnd).toBe(3);
    });

    test('should handle malformed equations', () => {
        const markdown = `
$$ E = mc^2  // missing closing $$
$$  // empty equation $$
$$$ F = ma $$$  // triple dollars should not match
$ E = mc^2 $   // single dollars should not match`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(2);
        expect(equations[0].content).toBe('E = mc^2  // missing closing');
        expect(equations[1].content).toBe('// empty equation');
    });

    test('should preserve original formatting in raw field', () => {
        const markdown = `
> [!NOTE] 
>    $$   E = mc^2 \\tag{spaced}   $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(1);
        expect(equations[0].raw).toBe('$$   E = mc^2 \\tag{spaced}   $$');
        expect(equations[0].content).toBe('E = mc^2 \\tag{spaced}');
        expect(equations[0].tag).toBe('spaced');
    });

        test('should handle inline code blocks with backticks', () => {
        const markdown = `
Normal equation: 
$$ E = mc^2 \\tag{normal} $$
Inline code with equation: \`$$ F = ma \\tag{inline} $$\` should be ignored
Another equation:
$$ P = F/A \\tag{pressure} $$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(2);
        expect(equations[0].tag).toBe('normal');
        expect(equations[0].content).toBe('E = mc^2 \\tag{normal}');
        expect(equations[1].tag).toBe('pressure');
        expect(equations[1].content).toBe('P = F/A \\tag{pressure}');
        expect(equations.some(eq => eq.tag === 'inline')).toBe(false);
    });

    test('should handle mixed scenarios with code blocks in quotes', () => {
        const markdown = `
> [!TIP] 
> Normal equation in quote:
> $$ F = ma \\tag{valid} $$
> 
> But this is in code:
> \`\`\`
> $$ E = mc^2 \\tag{invalid} $$
> \`\`\`
>
> And this is valid again:
> $$ P = F/A \\tag{valid2} $$`;
        
        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(2);
        expect(equations[0].tag).toBe('valid');
        expect(equations[0].content).toBe('F = ma \\tag{valid}');
        expect(equations[1].tag).toBe('valid2');
        expect(equations[1].content).toBe('P = F/A \\tag{valid2}');
        expect(equations.some(eq => eq.tag === 'invalid')).toBe(false);
    });

    

    test('should handle equations with complex formatting', () => {
        const markdown = `
> [!EQUATION] Maxwell Equations
> $$
> \\begin{align}
> \\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\epsilon_0} \\\\
> \\nabla \\cdot \\mathbf{B} &= 0 \\\\
> \\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} \\\\
> \\nabla \\times \\mathbf{B} &= \\mu_0\\mathbf{J} + \\mu_0\\epsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}
> \\end{align}
> \\tag{maxwell}
> $$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('maxwell');
        expect(equations[0].content).toContain('\\begin{align}');
        expect(equations[0].content).toContain('\\nabla \\cdot \\mathbf{E}');
        expect(equations[0].content).toContain('\\tag{maxwell}');
    });

    test('should handle empty content', () => {
        expect(parseEquationsInMarkdown('')).toEqual([]);
        expect(parseEquationsInMarkdown('   ')).toEqual([]);
        expect(parseEquationsInMarkdown('Just some text without equations')).toEqual([]);
    });

   

    test('should handle multiple backticks and code switching', () => {
        const markdown = `
Valid equation: 
$$ E = mc^2 \\tag{valid1} $$
\`code\` with \`$$ fake \\tag{fake1} $$\` inside
Another valid:
$$ F = ma \\tag{valid2} $$
Multiple \`back\`ticks\` with \`$$ another fake \\tag{fake2} $$\`\
\`$$ another fake \\tag{fake2} $$\` 
Final valid:
$$ P = F/A \\tag{valid3} $$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(3);
        expect(equations.map(eq => eq.tag)).toEqual(['valid1', 'valid2', 'valid3']);
        expect(equations.some(eq => eq.tag === 'fake1')).toBe(false);
        expect(equations.some(eq => eq.tag === 'fake2')).toBe(false);
    });






    test('should reject equations with content on same line', () => {
        const markdown = `
valid equation $$ P = F/A \\tag{invalid} $$  // should not parse
valid equation: 
$$ P = F/A \\tag{valid} $$`;  // should parse

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('valid');
        expect(equations[0].content).toBe('P = F/A \\tag{valid}');
    });

    test('should handle equations with leading/trailing whitespace', () => {
        const markdown = `
$$
   E = mc^2 \\tag{whitespace}   
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('whitespace');
        expect(equations[0].content).toBe('E = mc^2 \\tag{whitespace}');
    });

    test('should handle equations in list items', () => {
        const markdown = `
- First item
- Second item with equation:
  $$
  a^2 + b^2 = c^2 \\tag{list}
  $$
- Third item`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('list');
        expect(equations[0].content).toBe('a^2 + b^2 = c^2 \\tag{list}');
    });

    test('should handle equations in blockquotes (not callouts)', () => {
        const markdown = `
> This is a regular blockquote
> 
> $$
> x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\tag{quadratic}
> $$
> 
> End of blockquote`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('quadratic');
        expect(equations[0].content).toBe('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\tag{quadratic}');
    });

    test('should handle equations with special characters', () => {
        const markdown = `
$$
\\frac{\\partial}{\\partial t} \\rho(\\mathbf{r},t) = 
- \\nabla \\cdot \\mathbf{j}(\\mathbf{r},t) \\tag{continuity}
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('continuity');
        expect(equations[0].content).toContain('\\frac{\\partial}{\\partial t}');
    });

    test('should handle multiple equations in sequence', () => {
        const markdown = `
$$
E = mc^2 \\tag{energy}
$$

$$
F = ma \\tag{force}
$$

$$
PV = nRT \\tag{gas}
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(3);
        expect(equations[0].tag).toBe('energy');
        expect(equations[1].tag).toBe('force');
        expect(equations[2].tag).toBe('gas');
    });

    test('should handle equations with line breaks in content', () => {
        const markdown = `
$$
\\begin{aligned}
& \\text{First line of equation} \\\\
& \\text{Second line of equation} \\\\
& \\text{Third line of equation} \\tag{multiline}
\\end{aligned}
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('multiline');
        expect(equations[0].content).toContain('First line of equation');
        expect(equations[0].content).toContain('Second line of equation');
    });

    test('should handle equations with LaTeX comments', () => {
        const markdown = `
$$
% This is a LaTeX comment
E = mc^2 \\tag{commented} % Another comment
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('commented');
        expect(equations[0].content).toContain('E = mc^2');
    });

    test('should handle equations in table cells (should not parse)', () => {
        const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | $$ invalid \\tag{table} $$ |`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(0);
    });
    
    test('should handle equations with escaped dollar signs', () => {
        const markdown = `
$$
\\text{Cost: } \\$100 \\tag{money}
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('money');
        expect(equations[0].content).toContain('\\$100');
    });
});
