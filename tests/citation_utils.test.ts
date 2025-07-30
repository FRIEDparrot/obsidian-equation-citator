import {
    splitFileCitation,
    isValidEquationPart,
    extractCommonPrefix,
    extractLastNumber,
    combineContinuousEquationTags,
    parseCitationsInMarkdown
} from '@/utils/citation_utils';

describe('splitFileCitation', () => {
    test('should split local and cross-file parts with ^ delimiter', () => {
        expect(splitFileCitation('1.3.1^1', '^')).toEqual({
            local: '1.3.1',
            crossFile: '1'
        });
    });

    test('should handle missing file delimiter', () => {
        expect(splitFileCitation('1.3.1', '^')).toEqual({
            local: '1.3.1',
            crossFile: null
        });
    });

    test('should handle custom delimiters', () => {
        expect(splitFileCitation('1.3.1@1', '@')).toEqual({
            local: '1.3.1',
            crossFile: '1'
        });
    });

    test('should preserve full string before delimiter', () => {
        expect(splitFileCitation('1.3.1~3^1', '^')).toEqual({
            local: '1.3.1~3',
            crossFile: '1'
        });
    });
});

describe('isValidEquationPart', () => {
    const validDelimiters = ['.', '-', ':', '_'];

    test('should validate correct patterns', () => {
        expect(isValidEquationPart('1.2.3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('1-2-3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('1:2:3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('1_2_3', validDelimiters)).toBe(true);
        expect(isValidEquationPart('123', validDelimiters)).toBe(true); // 纯数字
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

describe('extractCommonPrefix', () => {
    const validDelimiters = ['.', '-', ':', '_'];

    test('should extract common prefix with dot delimiter', () => {
        expect(extractCommonPrefix('1.3.1', '1.3.3', validDelimiters)).toBe('1.3.');
    });

    test('should extract common prefix with hyphen delimiter', () => {
        expect(extractCommonPrefix('1-3-1', '1-3-3', validDelimiters)).toBe('1-3-');
    });

    test('should handle no common prefix', () => {
        expect(extractCommonPrefix('1.2.3', '4.5.6', validDelimiters)).toBe('');
    });

    test('should handle partial match', () => {
        expect(extractCommonPrefix('1.2.3', '1.2.4.5', validDelimiters)).toBe('1.2.');
    });

    test('should handle different delimiters', () => {
        expect(extractCommonPrefix('1.2-3', '1.2-4', validDelimiters)).toBe('1.2-');
    });
});

describe('extractLastNumber', () => {
    test('should extract number after prefix', () => {
        expect(extractLastNumber('1.3.1', '1.3.')).toBe(1);
    });

    test('should handle multi-digit numbers', () => {
        expect(extractLastNumber('1.3.123', '1.3.')).toBe(123);
    });

    test('should return null for invalid number', () => {
        expect(extractLastNumber('1.3.a', '1.3.')).toBeNull();
    });

    test('should handle empty prefix', () => {
        expect(extractLastNumber('123', '')).toBe(123);
    });

    test('should handle hyphen delimiters', () => {
        expect(extractLastNumber('1-3-1', '1-3-')).toBe(1);
    });
});

describe('combineContinuousEquationTags', () => {
    const rangeSymbol = '~';
    const validDelimiters = ['.', '-', ':', '_'];
    const fileDelimiter = '^';

    test('simplest case', () => {
        const input = ["1.1.1", "1.1.2"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~2"]);
    });

    test('should handle random-case input', () => {
        const input = ["EQ1", "EQ2", "EQ3"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["EQ1~3"]);
    });

    test('should combine continuous tags with file citations', () => {
        const input = ["P1", "1.1.1^2", "1.1.2^2", "1.1.3^2"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["P1", "1.1.1~3^2"]);
    });

    test('should handle mixed file citations', () => {
        const input = ["1.1.1^1", "1.1.2^1", "1.1.1^2", "1.1.2^2"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~2^1", "1.1.1~2^2"]);
    });

    test('should not combine non-consecutive tags', () => {
        const input = ["1.1.1", "1.1.3", "1.1.5"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1", "1.1.3", "1.1.5"]);
    });

    test('should handle different delimiters', () => {
        const input = ["1-1-1", "1-1-2", "1-1-3"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1-1-1~3"]);
    });

    test('should handle single tag groups', () => {
        const input = ["P1", "2.1.1", "3:1:1"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["P1", "2.1.1", "3:1:1"]);
    });

    test('should handle empty input', () => {
        const input: string[] = [];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual([]);
    });

    test('should maintain original order for non-continuous tags', () => {
        const input = ["1.1.3", "1.1.1", "1.1.2"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~3"]);
    });

    test('should handle mixed delimiters in same sequence', () => {
        const input = ["1.1-1", "1.1-2", "1.1-3"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1-1~3"]);
    });

    test('should not combine tags with different prefixes', () => {
        const input = ["1.1.1", "2.1.1", "1.1.2"];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~2", "2.1.1"]);
    });

    test('should handle complex mixed cases', () => {
        const input = [
            "P1",
            "1.1.1^1",
            "1.1.2^1",
            "2.1.1",
            "2.1.2",
            "1.1.1^2",
            "3-1-1",
            "3-1-2"
        ];
        const output = combineContinuousEquationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual([
            "P1",
            "1.1.1~2^1",
            "2.1.1~2",
            "1.1.1^2",
            "3-1-1~2"
        ]);
    });
});



// Comprehensive test cases
describe('parseCitationsInMarkdown', () => {
    // Basic functionality tests
    describe('Basic Cases', () => {
        it('should return empty array for empty markdown', () => {
            expect(parseCitationsInMarkdown('')).toEqual([]);
            expect(parseCitationsInMarkdown('   ')).toEqual([]);
        });

        it('should parse single equation citation', () => {
            const md = 'Here is a reference: $\\ref{eq1}$';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq1',
                line: 0,
                fullMatch: '$\\ref{eq1}$'
            }]);
        });

        it('should parse multiple citations on different lines', () => {
            const md = `
Line one with $\\ref{eqA}$
Another with $\\ref{eqB}$ and text
Line3: text
Fourth line $\\ref{eqC}$`;
            
            const result = parseCitationsInMarkdown(md);
            expect(result).toEqual([
                { label: 'eqA', line: 1, fullMatch: '$\\ref{eqA}$' },
                { label: 'eqB', line: 2, fullMatch: '$\\ref{eqB}$' },
                { label: 'eqC', line: 4, fullMatch: '$\\ref{eqC}$' }
            ]);
        });

        it('should parse multiple citations on the same line', () => {
            const md = 'Inline refs $\\ref{eq1}$ and $\\ref{eq2}$ together.';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([
                { label: 'eq1', line: 0, fullMatch: '$\\ref{eq1}$' },
                { label: 'eq2', line: 0, fullMatch: '$\\ref{eq2}$' }
            ]);
        });
    });

    // Malformed citation tests
    describe('Malformed Citations', () => {
        it('should ignore malformed citations', () => {
            const testCases = [
                'Missing dollar: \\ref{eq1}',
                'Wrong format: $ref{eq2}$',
                'Unclosed: $\\ref{eq3',
                'Display math: $$\\ref{eq4}$$'
            ];
            
            testCases.forEach(md => {
                expect(parseCitationsInMarkdown(md)).toEqual([]);
            });
        });

        it('should reject multiple \\ref in single formula', () => {
            const md = 'Invalid $\\ref{eq1} \\ref{eq2}$';
            expect(parseCitationsInMarkdown(md)).toEqual([]);
        });

        it('should reject spaces around $', () => {
            const testCases = [
                '$ \\ref{eq1}$',  // space after opening $
                '$\\ref{eq1} $',  // space before closing $
                '$ \\ref{eq1} $'  // spaces both sides
            ];
            
            testCases.forEach(md => {
                expect(parseCitationsInMarkdown(md)).toEqual([]);
            });
        });
    });

    // Code block handling tests
    describe('Code Block Handling', () => {
        it('should ignore citations in inline code blocks', () => {
            const md = 'The equation `$\\ref{eq1}$` will be rendered as: $\\ref{eq2}$';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq2',
                line: 0,
                fullMatch: '$\\ref{eq2}$'
            }]);
        });

        it('should handle mixed inline code and citations on same line', () => {
            const md = 'Use `$\\ref{eq1}$` syntax to get $\\ref{eq2}$ reference and `code with $\\ref{eq3}$` here.';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq2',
                line: 0,
                fullMatch: '$\\ref{eq2}$'
            }]);
        });

        it('should ignore citations in multiline code blocks', () => {
            const md = `Normal text with $\\ref{eq1}$
\`\`\`
Code block with $\\ref{eq2}$
More code $\\ref{eq3}$
\`\`\`
After code block $\\ref{eq4}$`;
            
            const result = parseCitationsInMarkdown(md);
            expect(result).toEqual([
                { label: 'eq1', line: 0, fullMatch: '$\\ref{eq1}$' },
                { label: 'eq4', line: 5, fullMatch: '$\\ref{eq4}$' }
            ]);
        });

        it('should handle escaped backticks', () => {
            const md = 'Text with \\`escaped backtick and $\\ref{eq1}$ reference';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq1',
                line: 0,
                fullMatch: '$\\ref{eq1}$'
            }]);
        });

        it('should handle multiple code blocks on same line', () => {
            const md = 'First `$\\ref{eq1}$` and second `$\\ref{eq2}$` with $\\ref{eq3}$ between.';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq3',
                line: 0,
                fullMatch: '$\\ref{eq3}$'
            }]);
        });
    });

    // Math formula tests
    describe('Math Formula Handling', () => {
        it('should match only inline math equations that contain \\ref{}', () => {
            const markdown = `$\\ref{eq:1.1.1}$, $\\gamma + 1 = 2$ equation  $txt1\\ref{eq:1.1}txt2$    equation3 $\\ref{}$

$$\\ref{eq:1.3}$$`;

            const result = parseCitationsInMarkdown(markdown);
            expect(result).toEqual([
                { label: 'eq:1.1.1', fullMatch: '$\\ref{eq:1.1.1}$', line: 0 },
                { label: 'eq:1.1', fullMatch: '$txt1\\ref{eq:1.1}txt2$', line: 0 },
                { label: '', fullMatch: '$\\ref{}$', line: 0 }
            ]);
        });

        it('should skip block math formulas', () => {
            const markdown = `This is inline: $E = mc^2 + \\ref{eq:1.2}$

This is block:
$$
F = ma + \\ref{eq:3.4}
$$`;

            const result = parseCitationsInMarkdown(markdown);
            expect(result).toEqual([{
                label: 'eq:1.2',
                line: 0,
                fullMatch: '$E = mc^2 + \\ref{eq:1.2}$'
            }]);
        });

        it('should handle complex formula content', () => {
            const md = 'Complex $E = \\ref{eq1} + x^2$';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq1',
                line: 0,
                fullMatch: '$E = \\ref{eq1} + x^2$'
            }]);
        });
    });

    // Edge cases
    describe('Edge Cases', () => {
        it('should handle empty ref labels', () => {
            const md = 'Empty $\\ref{}$';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: '',
                line: 0,
                fullMatch: '$\\ref{}$'
            }]);
        });

        it('should allow tight wrapping', () => {
            const validCases = [
                { input: '$\\ref{eq1}$', expected: 'eq1' },
                { input: '$x=\\ref{eq1}$', expected: 'eq1' },
                { input: '$\\ref{eq1}+1$', expected: 'eq1' }
            ];

            validCases.forEach(({ input, expected }) => {
                const result = parseCitationsInMarkdown(input);
                expect(result[0]?.label).toBe(expected);
            });
        });

        it('should handle complex ref labels', () => {
            const md = 'Complex label $\\ref{eq:1.3.1~3^1, 2.1.1~2^1}$';
            const result = parseCitationsInMarkdown(md);
            
            expect(result).toEqual([{
                label: 'eq:1.3.1~3^1, 2.1.1~2^1',
                line: 0,
                fullMatch: '$\\ref{eq:1.3.1~3^1, 2.1.1~2^1}$'
            }]);
        });
    });
    
    // Performance test
    describe('Performance', () => {
        it('should handle large documents efficiently', () => {
            const largeDoc = Array(1000).fill('Content $\\ref{eq1}$').join('\n');
            const start = performance.now();
            const result = parseCitationsInMarkdown(largeDoc);
            const duration = performance.now() - start;

            expect(result.length).toBe(1000);
            expect(duration).toBeLessThan(100); // Should complete within 100ms
        });
    });
});
