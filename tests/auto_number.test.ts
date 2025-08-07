import { autoNumberEquations, AutoNumberingType } from '@/utils/auto_number';
import { Heading } from '@/utils/heading';

// Mock dependencies
jest.mock('@/debug/debugger', () => ({
    Debugger: {}
}));

jest.mock('@/utils/heading', () => ({
    relativeHeadingLevel: (headings: Heading[], index: number) => {
        if (headings.length === 0 || index < 0 || index >= headings.length) {
            return 0;
        }

        const heading_arrays: number[] = [];
        for (let i = 0; i <= index; i++) {
            const heading = headings[i];
            while (heading_arrays.length > 0 && heading.level <= heading_arrays[heading_arrays.length - 1]) {
                heading_arrays.pop();
            }
            heading_arrays.push(heading.level);
        }
        return heading_arrays.length;
    }
}));

describe('autoNumberEquations', () => {
    describe('Relative Numbering', () => {
        test('should handle equations before any heading with P prefix', () => {
            const content = `$$ E = mc^2 $$

$$ F = ma $$

# Chapter 1

$$ G = mg $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ E = mc^2 \\tag{P1} $$');
            expect(result).toContain('$$ F = ma \\tag{P2} $$');
            expect(result).toContain('$$ G = mg \\tag{1.1} $$');
        });

        test('should handle first heading as ## (second level)', () => {
            const content = `## Section Start

$$ eq1 $$

### Sub A
$$ eq2 $$

## Section Next
$$ eq3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ eq3 \\tag{2.1} $$');
        });

        test('should handle complex multi-level headings', () => {
            const content = `$$ E = mc^2 $$

# Chapter 1

$$ G = mg $$

## Section A

$$ a^2 + b^2 = c^2 $$

#### Subsection A1

$$ x = y + z $$

### Section B

$$ \\int f(x) dx $$
$$ \\int f(t) dt $$

# Chapter 2

$$ a+b = c $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ E = mc^2 \\tag{P1} $$');
            expect(result).toContain('$$ G = mg \\tag{1.1} $$');
            expect(result).toContain('$$ a^2 + b^2 = c^2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ x = y + z \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ \\int f(x) dx \\tag{1.1.2.1} $$');
            expect(result).toContain('$$ \\int f(t) dt \\tag{1.1.2.2} $$');
            expect(result).toContain('$$ a+b = c \\tag{2.1} $$');
        });

        test('should handle maxDepth = 1 (simple numbering)', () => {
            const content = `# Chapter 1

$$ eq1 $$

## Section A

$$ eq2 $$

# Chapter 2

$$ eq3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 1, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1} $$');
            expect(result).toContain('$$ eq2 \\tag{2} $$');
            expect(result).toContain('$$ eq3 \\tag{3} $$');
        });

        test('should handle maxDepth = 2', () => {
            const content = `# Chapter 1

$$ eq1 $$

## Section A

$$ eq2 $$

### Sub A

$$ eq3 $$

# Chapter 2

$$ eq4 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 2, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.2} $$');
            expect(result).toContain('$$ eq3 \\tag{1.3} $$');
            expect(result).toContain('$$ eq4 \\tag{2.1} $$');
        });

        test('should handle multi-line equations', () => {
            const content = `# Chapter 1

$$
\\begin{align}
a &= b + c \\\\
d &= e + f
\\end{align}
$$

## Section A

$$
x = y + z
$$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$\n\\begin{align}\na &= b + c \\\\\nd &= e + f\n\\end{align} \\tag{1.1}\n$$');
            expect(result).toContain('$$\nx = y + z \\tag{1.1.1}\n$$');
        });

        test('should skip equations inside code blocks', () => {
            const content = `$$ eq1 $$

\`\`\`
$$ ignored $$
\`\`\`

# Chapter 1
$$ eq2 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{P1} $$');
            expect(result).toContain('$$ ignored $$');
            expect(result).toContain('$$ eq2 \\tag{1.1} $$');
        });

        test('should handle no headings (all P prefix)', () => {
            const content = `$$ eq1 $$

$$ eq2 $$

$$ eq3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{P1} $$');
            expect(result).toContain('$$ eq2 \\tag{P2} $$');
            expect(result).toContain('$$ eq3 \\tag{P3} $$');
        });

        test('should handle heading level jumps', () => {
            const content = `# H1
$$ e1 $$

#### H4
$$ e2 $$

## H2
$$ e3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ e1 \\tag{1.1} $$');
            expect(result).toContain('$$ e2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ e3 \\tag{1.2.1} $$');
        });

        test('should handle custom delimiter and prefix', () => {
            const content = `$$ eq1 $$

# Chapter 1
$$ eq2 $$

## Section A
$$ eq3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '-', 'EQ', '').md;

            expect(result).toContain('$$ eq1 \\tag{EQ1} $$');
            expect(result).toContain('$$ eq2 \\tag{1-1} $$');
            expect(result).toContain('$$ eq3 \\tag{1-1-1} $$');
        });

        test('should handle equations with existing tags (should be cleared)', () => {
            const content = `# Chapter 1
$$ E = mc^2 \\tag{old} $$

$$ F = ma \\tag{another} $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ E = mc^2 \\tag{1.1} $$');
            expect(result).toContain('$$ F = ma \\tag{1.2} $$');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty content', () => {
            const result = autoNumberEquations('', AutoNumberingType.Relative, 7, '.', 'P', '').md;
            expect(result).toBe('');
        });

        test('should handle content with no equations', () => {
            const content = `# Chapter 1

Some text here.

## Section A

More text.`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;
            expect(result).toBe(content);
        });

        test('should handle mixed code blocks and equations', () => {
            const content = `$$ eq1 $$

\`\`\`javascript
const x = 1;
$$ not an equation $$
\`\`\`

$$ eq2 $$

\`\`\`
Another code block
$$ also not an equation $$
\`\`\`

$$ eq3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{P1} $$');
            expect(result).toContain('$$ eq2 \\tag{P2} $$');
            expect(result).toContain('$$ eq3 \\tag{P3} $$');
            expect(result).toContain('$$ not an equation $$');
            expect(result).toContain('$$ also not an equation $$');
        });

        test('should handle maxDepth = 0 gracefully', () => {
            const content = `# Chapter 1
$$ eq1 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 0, '.', 'P','').md;

            expect(result).toContain('\\tag{');
        });

        test('should handle very deep heading levels', () => {
            const content = `# H1
$$ e1 $$
## H2  
$$ e2 $$
### H3
$$ e3 $$
#### H4
$$ e4 $$
##### H5
$$ e5 $$
###### H6
$$ e6 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '').md;

            expect(result).toContain('$$ e1 \\tag{1.1} $$');
            expect(result).toContain('$$ e2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ e3 \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ e4 \\tag{1.1.1.1.1} $$');
            expect(result).toContain('$$ e5 \\tag{1.1.1.1.1.1} $$');
            expect(result).toContain('$$ e6 \\tag{1.1.1.1.1.1.1} $$');
        });
    });

    describe('Absolute Numbering (Hierarchical)', () => {
        test('should number equations according to heading hierarchy', () => {
            const content = `# Chapter 1
$$ eq1 $$

## Section 1.1
$$ eq2 $$

### Subsection 1.1.1
$$ eq3 $$

$$ eq4 $$

#### Subsubsection 1.1.1.1
$$ eq5 $$

## Section 1.2
$$ eq6 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ eq3 \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ eq4 \\tag{1.1.1.2} $$');
            expect(result).toContain('$$ eq5 \\tag{1.1.1.1.1} $$');
            expect(result).toContain('$$ eq6 \\tag{1.2.1} $$');
        });

        test('should handle deep nesting with maxDepth limit', () => {
            const content = `# Level 1
$$ eq1 $$

## Level 2
$$ eq2 $$

### Level 3
$$ eq3 $$

#### Level 4
$$ eq4 $$

##### Level 5
$$ eq5 $$

###### Level 6
$$ eq6 $$

####### Not a real heading
$$ eq7 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 5, '.', 'P', '').md;
            
            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ eq3 \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ eq4 \\tag{1.1.1.1.1} $$');
            expect(result).toContain('$$ eq5 \\tag{1.1.1.1.2} $$');
            expect(result).toContain('$$ eq6 \\tag{1.1.1.1.3} $$');
            expect(result).toContain('$$ eq7 \\tag{1.1.1.1.4} $$');
        });

        test('should handle equations before any heading', () => {
            const content = `$$ pre1 $$
$$ pre2 $$

# First Heading
$$ first $$

$$ pre3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$ pre1 \\tag{P1} $$');
            expect(result).toContain('$$ pre2 \\tag{P2} $$');
            expect(result).toContain('$$ first \\tag{1.1} $$');
            expect(result).toContain('$$ pre3 \\tag{1.2} $$');
        });

        test('should handle complex heading structure', () => {
            const content = `# Main
$$ eq1 $$

## Section A
$$ eq2 $$

### Sub A1
$$ eq3 $$

## Section B
$$ eq4 $$

### Sub B1
$$ eq5 $$

### Sub B2
$$ eq6 $$

# Another Main
$$ eq7 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ eq3 \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ eq4 \\tag{1.2.1} $$');
            expect(result).toContain('$$ eq5 \\tag{1.2.1.1} $$');
            expect(result).toContain('$$ eq6 \\tag{1.2.2.1} $$');
            expect(result).toContain('$$ eq7 \\tag{2.1} $$');
        });

        test('should handle skipped heading levels', () => {
            const content = `# Level 1
$$ eq1 $$

### Level 3 (skipping 2)
$$ eq2 $$

##### Level 5
$$ eq3 $$

## Back to Level 2
$$ eq4 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ eq3 \\tag{1.1.1.1.1.1} $$');
            expect(result).toContain('$$ eq4 \\tag{1.2.1} $$');
        });

        test('should reset counters when heading level decreases', () => {
            const content = `# A
$$ eq1 $$

## B
$$ eq2 $$

### C
$$ eq3 $$

## D
$$ eq4 $$

### E
$$ eq5 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{1.1} $$');
            expect(result).toContain('$$ eq2 \\tag{1.1.1} $$');
            expect(result).toContain('$$ eq3 \\tag{1.1.1.1} $$');
            expect(result).toContain('$$ eq4 \\tag{1.2.1} $$');
            expect(result).toContain('$$ eq5 \\tag{1.2.1.1} $$');
        });

        test('should handle multi-line equations with hierarchical numbering', () => {
            const content = `# Chapter
$$
\\begin{align}
a &= b \\\\
c &= d
\\end{align}
$$

## Section
$$
x = y
$$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$\n\\begin{align}\na &= b \\\\\nc &= d\n\\end{align} \\tag{1.1}\n$$');
            expect(result).toContain('$$\nx = y \\tag{1.1.1}\n$$');
        });

        test('should handle documents with only equations and no headings', () => {
            const content = `$$ eq1 $$
$$ eq2 $$
$$ eq3 $$`;

            const result = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;

            expect(result).toContain('$$ eq1 \\tag{P1} $$');
            expect(result).toContain('$$ eq2 \\tag{P2} $$');
            expect(result).toContain('$$ eq3 \\tag{P3} $$');
        });

        test('should handle delimiter parameter correctly', () => {
            const content = `# A
$$ eq1 $$

## B
$$ eq2 $$`;

            const dotResult = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;
            const dashResult = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '-', 'P', '').md;

            expect(dotResult).toContain('$$ eq1 \\tag{1.1} $$');
            expect(dotResult).toContain('$$ eq2 \\tag{1.1.1} $$');

            expect(dashResult).toContain('$$ eq1 \\tag{1-1} $$');
            expect(dashResult).toContain('$$ eq2 \\tag{1-1-1} $$');
        });

        test('should handle noHeadingEquationPrefix parameter', () => {
            const content = `$$ eq1 $$
# A
$$ eq2 $$`;

            const prefixPResult = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'P', '').md;
            const prefixEQResult = autoNumberEquations(content, AutoNumberingType.Absolute, 6, '.', 'EQ', '').md;

            expect(prefixPResult).toContain('$$ eq1 \\tag{P1} $$');
            expect(prefixPResult).toContain('$$ eq2 \\tag{1.1} $$');

            expect(prefixEQResult).toContain('$$ eq1 \\tag{EQ1} $$');
            expect(prefixEQResult).toContain('$$ eq2 \\tag{1.1} $$');
        });
    });
});