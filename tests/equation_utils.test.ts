import {
    parseEquationsInMarkdown,
    isValidEquationPart, 
    parseFirstEquationInMarkdown 
} from "@/utils/equation_utils";

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
        expect(equations[0].contentWithTag).toBe('\\text{This is a equation in quotation} \\tag{M}');
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
        expect(equations[0].contentWithTag).toBe('E = mc^2');
        expect(equations[0].tag).toBeUndefined();
        expect(equations[1].contentWithTag).toBe('F = ma \\tag{1.1}');
        expect(equations[1].tag).toBe('1.1');
        expect(equations[2].contentWithTag).toBe('\\Large \\boxed{dg = - s dT+v dp }');
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
        expect(equations[0].contentWithTag).toBe('F = ma');
        expect(equations[0].lineStart).toBe(1);
        expect(equations[0].lineEnd).toBe(3);
        expect(equations[1].contentWithTag).toBe('E = mc^2 \\tag{einstein}');
        expect(equations[1].tag).toBe('einstein');
    });

    test('should handle complex multi-line equations', () => {
        const markdown = `$$ du = \\left(\\frac{\\partial u}{\\partial s}\\right)_v ds +\\left( \\frac{\\partial u}{\\partial v}\\right)_s dv \\rightarrow 
\\quad \\boxed{T = \\left( \\frac{\\partial u}{\\partial s}\\right)_v, \\quad p = - \\left(\\frac{\\partial u}{\\partial v} \\right)_s} \\tag{3.1.1} $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('3.1.1');
        expect(equations[0].contentWithTag).toContain('du = \\left(\\frac{\\partial u}{\\partial s}\\right)_v ds');
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
        expect(equations[0].contentWithTag).toBe('E = mc^2 \\tag{valid}');
        expect(equations[1].tag).toBe('valid2');
        expect(equations[1].contentWithTag).toBe('P = F/A \\tag{valid2}');
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
        expect(equations[0].contentWithTag).toBe('a^2 + b^2 = c^2 \\tag{pythagoras}');
        expect(equations[1].tag).toBe('trig');
        expect(equations[1].contentWithTag).toBe('\\sin^2(x) + \\cos^2(x) = 1 \\tag{trig}');
        expect(equations[2].tag).toBe('integral');
        expect(equations[2].contentWithTag).toBe('\\int_0^\\infty e^{-x} dx = 1\n\\tag{integral}');
    });

    test('should handle edge case: unclosed equation block', () => {
        const markdown = `
$$
F = ma \\tag{unclosed}
This should still be parsed even without closing`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('unclosed');
        expect(equations[0].contentWithTag).toBe('F = ma \\tag{unclosed}\nThis should still be parsed even without closing');
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
        expect(equations[0].contentWithTag).toBe('E = mc^2  // missing closing');
        expect(equations[1].contentWithTag).toBe('// empty equation');
    });

    test('should preserve original formatting in raw field', () => {
        const markdown = `
> [!NOTE] 
>    $$   E = mc^2 \\tag{spaced}   $$`;

        const equations = parseEquationsInMarkdown(markdown);

        expect(equations).toHaveLength(1);
        expect(equations[0].raw).toBe('$$   E = mc^2 \\tag{spaced}   $$');
        expect(equations[0].contentWithTag).toBe('E = mc^2 \\tag{spaced}');
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
        expect(equations[0].contentWithTag).toBe('E = mc^2 \\tag{normal}');
        expect(equations[1].tag).toBe('pressure');
        expect(equations[1].contentWithTag).toBe('P = F/A \\tag{pressure}');
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
        expect(equations[0].contentWithTag).toBe('F = ma \\tag{valid}');
        expect(equations[1].tag).toBe('valid2');
        expect(equations[1].contentWithTag).toBe('P = F/A \\tag{valid2}');
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
        expect(equations[0].contentWithTag).toContain('\\begin{align}');
        expect(equations[0].contentWithTag).toContain('\\nabla \\cdot \\mathbf{E}');
        expect(equations[0].contentWithTag).toContain('\\tag{maxwell}');
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
        expect(equations[0].contentWithTag).toBe('P = F/A \\tag{valid}');
    });

    test('should handle equations with leading/trailing whitespace', () => {
        const markdown = `
$$
   E = mc^2 \\tag{whitespace}   
$$`;

        const equations = parseEquationsInMarkdown(markdown);
        
        expect(equations).toHaveLength(1);
        expect(equations[0].tag).toBe('whitespace');
        expect(equations[0].contentWithTag).toBe('E = mc^2 \\tag{whitespace}');
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
        expect(equations[0].contentWithTag).toBe('a^2 + b^2 = c^2 \\tag{list}');
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
        expect(equations[0].contentWithTag).toBe('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\tag{quadratic}');
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
        expect(equations[0].contentWithTag).toContain('\\frac{\\partial}{\\partial t}');
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
        expect(equations[0].contentWithTag).toContain('First line of equation');
        expect(equations[0].contentWithTag).toContain('Second line of equation');
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
        expect(equations[0].contentWithTag).toContain('E = mc^2');
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
        expect(equations[0].contentWithTag).toContain('\\$100');
    });
});


describe('parseFirstEquationInMarkdown', () => {
  describe('Basic functionality', () => {
    it('should return undefined for empty markdown', () => {
      expect(parseFirstEquationInMarkdown('', '1')).toBeUndefined();
      expect(parseFirstEquationInMarkdown('   ', '1')).toBeUndefined();
    });

    it('should return undefined for empty tag', () => {
      const markdown = '$$ x = 1 \\tag{1} $$';
      expect(parseFirstEquationInMarkdown(markdown, '')).toBeUndefined();
      expect(parseFirstEquationInMarkdown(markdown, '   ')).toBeUndefined();
    });

    it('should return undefined when no equations exist', () => {
      const markdown = 'This is just plain text with no equations.';
      expect(parseFirstEquationInMarkdown(markdown, '1')).toBeUndefined();
    });

    it('should return undefined when no equations have the target tag', () => {
      const markdown = `
        $$ x = 1 \\tag{1} $$
        $$ y = 2 \\tag{2} $$
      `;
      expect(parseFirstEquationInMarkdown(markdown, '3')).toBeUndefined();
    });
  });

  describe('Single-line equations', () => {
    it('should find single-line equation with matching tag', () => {
      const markdown = '$$ x = 1 \\tag{eq1} $$';
      const result = parseFirstEquationInMarkdown(markdown, 'eq1');
      
      expect(result).toEqual({
        raw: '$$ x = 1 \\tag{eq1} $$',
        content: 'x = 1',
        contentWithTag: 'x = 1 \\tag{eq1}',
        lineStart: 0,
        lineEnd: 0,
        tag: 'eq1',
        inQuote: false
      });
    });

    it('should return first matching equation when multiple exist', () => {
      const markdown = `
        $$ x = 1 \\tag{same} $$
        Some text here
        $$ y = 2 \\tag{same} $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'same');
      
      expect(result).toEqual({
        raw: '$$ x = 1 \\tag{same} $$',
        content: 'x = 1',
        contentWithTag: 'x = 1 \\tag{same}',
        lineStart: 1,
        lineEnd: 1,
        tag: 'same',
        inQuote: false
      });
    });

    it('should handle equations with whitespace in tags', () => {
      const markdown = '$$ x = 1 \\tag{ eq 1 } $$';
      const result = parseFirstEquationInMarkdown(markdown, 'eq 1');
      
      expect(result?.tag).toBe('eq 1');
    });

    it('should skip equations without tags', () => {
      const markdown = `
        $$ x = 1 $$
        $$ y = 2 \\tag{found} $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'found');
      
      expect(result).toEqual({
        raw: '$$ y = 2 \\tag{found} $$',
        content: 'y = 2',
        contentWithTag: 'y = 2 \\tag{found}',
        lineStart: 2,
        lineEnd: 2,
        tag: 'found',
        inQuote: false
      });
    });
  });

  describe('Multi-line equations', () => {
    it('should find multi-line equation with matching tag', () => {
      const markdown = `
        $$
        x = 1 + 2 + 3
        \\tag{multiline}
        $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'multiline');
      
      expect(result).toEqual({
        raw: '$$\nx = 1 + 2 + 3\n\\tag{multiline}\n$$',
        content: 'x = 1 + 2 + 3', 
        contentWithTag: 'x = 1 + 2 + 3\n\\tag{multiline}',
        lineStart: 1,
        lineEnd: 4,
        tag: 'multiline',
        inQuote: false
      });
    });

    it('should handle complex multi-line equations', () => {
      const markdown = `
        $$
        \\begin{align}
        x &= a + b \\\\
        y &= c + d
        \\end{align}
        \\tag{complex}
        $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'complex');
      
      expect(result?.tag).toBe('complex');
      expect(result?.lineStart).toBe(1);
      expect(result?.lineEnd).toBe(7);
    });

    it('should handle unclosed multi-line equation blocks', () => {
      const markdown = `
        $$
        x = 1
        \\tag{unclosed}
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'unclosed');
      
      expect(result).toEqual({
        raw: '$$\nx = 1\n\\tag{unclosed}\n',
        content: 'x = 1',
        contentWithTag: 'x = 1\n\\tag{unclosed}',
        lineStart: 1,
        lineEnd: 4,
        tag: 'unclosed',
        inQuote: false
      });
    });
  });

  describe('Equations in quotes', () => {
    it('should find equation in quote block', () => {
      const markdown = `
        > This is a quote
        > $$ x = 1 \\tag{quoted} $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'quoted');
      
      expect(result).toEqual({
        raw: '$$ x = 1 \\tag{quoted} $$',
        content: 'x = 1',
        contentWithTag: 'x = 1 \\tag{quoted}',
        lineStart: 2,
        lineEnd: 2,
        tag: 'quoted',
        inQuote: true
      });
    });

    it('should find multi-line equation in quote block', () => {
      const markdown = `
        > $$
        > x = 1 + 2
        > \\tag{quoted-multi}
        > $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'quoted-multi');
      
      expect(result?.tag).toBe('quoted-multi');
      expect(result?.inQuote).toBe(true);
      expect(result?.lineStart).toBe(1);
      expect(result?.lineEnd).toBe(4);
    });
  });

  describe('Code block handling', () => {
    it('should ignore equations inside code blocks', () => {
      const markdown = `
        \`\`\`
        $$ x = 1 \\tag{code} $$
        \`\`\`
        $$ y = 2 \\tag{real} $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'code');
      expect(result).toBeUndefined();
      
      const result2 = parseFirstEquationInMarkdown(markdown, 'real');
      expect(result2?.tag).toBe('real');
    });

    it('should ignore equations in quoted code blocks', () => {
      const markdown = `
        > \`\`\`
        > $$ x = 1 \\tag{quoted-code} $$
        > \`\`\`
        > $$ y = 2 \\tag{quoted-real} $$
      `;
      const result = parseFirstEquationInMarkdown(markdown, 'quoted-code');
      expect(result).toBeUndefined();
      
      const result2 = parseFirstEquationInMarkdown(markdown, 'quoted-real');
      expect(result2?.tag).toBe('quoted-real');
    });
  });

  describe('Tag variations', () => {
    it('should handle numeric tags', () => {
      const markdown = '$$ x = 1 \\tag{123} $$';
      const result = parseFirstEquationInMarkdown(markdown, '123');
      expect(result?.tag).toBe('123');
    });

    it('should handle alphanumeric tags', () => {
      const markdown = '$$ x = 1 \\tag{eq1a} $$';
      const result = parseFirstEquationInMarkdown(markdown, 'eq1a');
      expect(result?.tag).toBe('eq1a');
    });

    it('should handle tags with special characters', () => {
      const markdown = '$$ x = 1 \\tag{eq-1.2} $$';
      const result = parseFirstEquationInMarkdown(markdown, 'eq-1.2');
      expect(result?.tag).toBe('eq-1.2');
    });

    it('should be case sensitive for tags', () => {
      const markdown = '$$ x = 1 \\tag{Case} $$';
      expect(parseFirstEquationInMarkdown(markdown, 'case')).toBeUndefined();
      expect(parseFirstEquationInMarkdown(markdown, 'Case')?.tag).toBe('Case');
    });
  });

  describe('Mixed content scenarios', () => {
    it('should work with complex markdown containing various elements', () => {
      const markdown = `
        # Title
        
        Some text with *emphasis*.
        
        \`\`\`javascript
        const x = 1; // $$ fake \\tag{fake} $$
        \`\`\`
        
        > Quote with equation:
        > $$ a = b \\tag{quote-eq} $$
        
        Regular equation:
        $$ c = d \\tag{regular} $$
        
        $$
        e = f + g
        \\tag{multiline-target}
        $$
        
        Final equation: $$ h = i \\tag{final} $$
      `;
      
      const result = parseFirstEquationInMarkdown(markdown, 'multiline-target');
      expect(result?.tag).toBe('multiline-target');
      expect(result?.contentWithTag).toContain('e = f + g');
    });

    it('should prioritize first occurrence in document order', () => {
      const markdown = `
        $$ first = 1 \\tag{target} $$
        
        $$
        second = 2
        \\tag{target}
        $$
        
        > $$ third = 3 \\tag{target} $$
      `;
      
      const result = parseFirstEquationInMarkdown(markdown, 'target');
      expect(result?.contentWithTag).toBe('first = 1 \\tag{target}');
      expect(result?.lineStart).toBe(1);
    });
  });
});