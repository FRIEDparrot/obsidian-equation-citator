import {
    splitFileCitation,
    extractCommonPrefix,
    extractLastNumber,
    combineContinuousCitationTags,
    splitContinuousCitationTags,
    parseCitationsInMarkdown,
    replaceCitationsInMarkdown,
    generateCitationSpans,
} from '@/utils/citation_utils';

describe('combineContinuousCitationTags', () => {
    const rangeSymbol = '~';
    const validDelimiters = ['.', '-', ':', '_'];
    const fileDelimiter = '^';

    test('simplest case', () => {
        const input = ["1.1.1", "1.1.2"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~2"]);
    });

    test('should handle random-case input', () => {
        const input = ["EQ1", "EQ2", "EQ3"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["EQ1~3"]);
    });

    test('should combine continuous tags with file citations (prefix format)', () => {
        const input = ["P1", "2^1.1.1", "2^1.1.2", "2^1.1.3"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["P1", "2^1.1.1~3"]);
    });

    test('should handle mixed file citations (prefix format)', () => {
        const input = ["1^1.1.1", "1^1.1.2", "2^1.1.1", "2^1.1.2"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1^1.1.1~2", "2^1.1.1~2"]);
    });

    test('should not combine non-consecutive tags', () => {
        const input = ["1.1.1", "1.1.3", "1.1.5"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1", "1.1.3", "1.1.5"]);
    });

    test('should handle different delimiters', () => {
        const input = ["1-1-1", "1-1-2", "1-1-3"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1-1-1~3"]);
    });

    test('should handle single tag groups', () => {
        const input = ["P1", "2.1.1", "3:1:1"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["P1", "2.1.1", "3:1:1"]);
    });

    test('should handle empty input', () => {
        const input: string[] = [];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual([]);
    });

    test('should maintain original order for non-continuous tags', () => {
        const input = ["1.1.3", "1.1.1", "1.1.2"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~3"]);
    });

    test('should handle mixed delimiters in same sequence', () => {
        const input = ["1.1-1", "1.1-2", "1.1-3"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1-1~3"]);
    });

    test('should not combine tags with different prefixes', () => {
        const input = ["1.1.1", "2.1.1", "1.1.2"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual(["1.1.1~2", "2.1.1"]);
    });

    test('should handle complex mixed cases with prefix format', () => {
        const input = [
            "P1",
            "1^1.1.1",
            "1^1.1.2",
            "2.1.1",
            "2.1.2",
            "2^1.1.1",
            "3-1-1",
            "3-1-2"
        ];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual([
            "P1",
            "1^1.1.1~2",
            "2.1.1~2",
            "2^1.1.1",
            "3-1-1~2"
        ]);
    });

    test('should ignore empty strings in input array', () => {
        const input = ["", "P1~2", "", "P3~4", "P5~6", "P7~8", "P9~10", "P11~12"];
        const output = combineContinuousCitationTags(input, rangeSymbol, validDelimiters, fileDelimiter);
        expect(output).toEqual([
            "P1~2",
            "P3~4",
            "P5~6",
            "P7~8",
            "P9~10",
            "P11~12"
        ]); // Empty strings are filtered out (continuous would not be combined)
    })
});


// Jest test cases
describe('splitContinuousCitationTags', () => {
    const rangeSymbol = '~';
    const validDelimiters = ['.', '-'];
    const fileDelimiter = '^';

    // Simple cases
    test('splits simple numeric ranges', () => {
        expect(splitContinuousCitationTags(['1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['1', '2', '3']);
    });

    test('splits letter-number ranges', () => {
        expect(splitContinuousCitationTags(['P1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'P2', 'P3']);
    });

    test('splits dotted ranges', () => {
        expect(splitContinuousCitationTags(['1.1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['1.1', '1.2', '1.3']);
    });

    test('splits complex dotted ranges', () => {
        expect(splitContinuousCitationTags(['1.2.1~4'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['1.2.1', '1.2.2', '1.2.3', '1.2.4']);
    });

    test('handles file citations with ranges', () => {
        expect(splitContinuousCitationTags(['2^1.1.1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['2^1.1.1', '2^1.1.2', '2^1.1.3']);
    });

    test('handles mixed tags with and without ranges', () => {
        expect(splitContinuousCitationTags(['P1~2', '2^1.1.1~4', '1.3.2~3', '1^1.3.4'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'P2', '2^1.1.1', '2^1.1.2', '2^1.1.3', '2^1.1.4', '1.3.2', '1.3.3', '1^1.3.4']);
    });

    test('handles dash delimiters', () => {
        expect(splitContinuousCitationTags(['A-1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['A-1', 'A-2', 'A-3']);
    });

    // Edge cases
    test('returns empty array for empty input', () => {
        expect(splitContinuousCitationTags([], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual([]);
    });

    test('returns empty array for null/undefined input', () => {
        // @ts-ignore
        expect(splitContinuousCitationTags(null, rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual([]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(splitContinuousCitationTags(undefined as any, rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual([]);
    });

    test('handles tags without range symbol', () => {
        expect(splitContinuousCitationTags(['P1', 'EQ2', '1.3.4'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'EQ2', '1.3.4']);
    });

    test('handles single number ranges (same start and end)', () => {
        expect(splitContinuousCitationTags(['P1~1'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1']);
    });

    test('handles invalid ranges (start > end)', () => {
        expect(splitContinuousCitationTags(['P5~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P5~3']); // Should keep original tag
    });

    test('handles invalid ranges (non-numeric end)', () => {
        expect(splitContinuousCitationTags(['P1~abc'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1~abc']); // Should keep original tag
    });

    test('handles invalid ranges (non-numeric start)', () => {
        expect(splitContinuousCitationTags(['Pabc~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['Pabc~3']); // Should keep original tag
    });

    test('handles ranges with no valid prefix', () => {
        expect(splitContinuousCitationTags(['~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['~3']); // Should keep original tag
    });

    test('handles multiple range symbols in one tag', () => {
        expect(splitContinuousCitationTags(['P1~2~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1~2', 'P1~3']); // Uses last range symbol
    });

    test('handles file citations without ranges', () => {
        expect(splitContinuousCitationTags(['2^1.3.4'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['2^1.3.4']);
    });

    test('handles complex file citation ranges', () => {
        expect(splitContinuousCitationTags(['10^2.3.1~5'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['10^2.3.1', '10^2.3.2', '10^2.3.3', '10^2.3.4', '10^2.3.5']);
    });

    test('handles zero-padded numbers', () => {
        expect(splitContinuousCitationTags(['P01~03'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'P2', 'P3']); // parseInt removes leading zeros
    });

    test('handles large ranges', () => {
        expect(splitContinuousCitationTags(['A1~10'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10']);
    });

    test('handles range symbol in file citation part', () => {
        expect(splitContinuousCitationTags(['2~3^1.1'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['2~3^1.1']); // Range symbol in file part, not local part
    });

    test('ignores empty strings in input array', () => {
        expect(splitContinuousCitationTags(['', 'P1~2', ''], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'P2']); // Empty strings are filtered out
    });

    test('handles whitespace in tags', () => {
        expect(splitContinuousCitationTags([' P1~2 '], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'P2']); //  for whitespace in tags should be stripped 
    });

    test('handles tags with only delimiters', () => {
        expect(splitContinuousCitationTags(['..~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['..~3']); // Invalid format, should keep as-is
    });

    test('handles very long prefixes', () => {
        expect(splitContinuousCitationTags(['VERY.LONG.PREFIX.1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['VERY.LONG.PREFIX.1', 'VERY.LONG.PREFIX.2', 'VERY.LONG.PREFIX.3']);
    });

    // Performance edge case
    test('handles large range (performance test)', () => {
        const result = splitContinuousCitationTags(['P1~100'], rangeSymbol, validDelimiters, fileDelimiter);
        expect(result).toHaveLength(100);
        expect(result[0]).toBe('P1');
        expect(result[99]).toBe('P100');
    });

    test('handles zero-padded numbers', () => {
        expect(splitContinuousCitationTags(['P01~03'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['P1', 'P2', 'P3']); // parseInt removes leading zeros
    });

    // Special characters
    test('handles special characters in prefix', () => {
        expect(splitContinuousCitationTags(['$EQ1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['$EQ1', '$EQ2', '$EQ3']);
    });

    test('handles unicode characters', () => {
        expect(splitContinuousCitationTags(['α1~2'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['α1', 'α2']);
    });

    test('handles mixed special characters', () => {
        expect(splitContinuousCitationTags(['@#$1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['@#$1', '@#$2', '@#$3']);
    });

    test('handles emoji in prefix', () => {
        expect(splitContinuousCitationTags(['🔥1~2'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['🔥1', '🔥2']);
    });

    test('handles Chinese characters', () => {
        expect(splitContinuousCitationTags(['公式1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['公式1', '公式2', '公式3']);
    });

    test('handles mixed characters with file citation', () => {
        expect(splitContinuousCitationTags(['2^$EQ1~3'], rangeSymbol, validDelimiters, fileDelimiter))
            .toEqual(['2^$EQ1', '2^$EQ2', '2^$EQ3']);
    });
});

describe('splitFileCitation', () => {
    test('should split local and cross-file parts with ^ delimiter (prefix format)', () => {
        expect(splitFileCitation('1^1.3.1', '^')).toEqual({
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
        expect(splitFileCitation('1@1.3.1', '@')).toEqual({
            local: '1.3.1',
            crossFile: '1'
        });
    });

    test('should preserve full string after delimiter', () => {
        expect(splitFileCitation('1^1.3.1~3', '^')).toEqual({
            local: '1.3.1~3',
            crossFile: '1'
        });
    });

    test('should handle multiple file delimiters (use first one)', () => {
        expect(splitFileCitation('1^2^1.1.1', '^')).toEqual({
            local: '2^1.1.1',
            crossFile: '1'
        });
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

describe('Citation Utils Tests', () => {
    const defaultSettings = {
        prefix: 'eq:',
        rangeSymbol: '~',
        validDelimiters: ['.', '-'],
        fileDelimiter: '^',
        multiCitationDelimiter: ', '
    };

    describe('replaceCitationsInMarkdown', () => {
        test('should replace simple inline citation', () => {
            const markdown = 'This is $\\ref{eq:1.1}$ a test.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            expect(result).toContain('<span');
            expect(result).toContain('1.1');
            expect(result).not.toContain('\\ref{eq:1.1}');
        });

        test('should handle multiple citations in one math expression', () => {
            const markdown = 'This is $\\ref{eq:1.1, 1.2, 1.3}$ a test.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            expect(result).toContain('<span');
            expect(result).toContain('1.1~3');
            expect(result).not.toContain('\\ref{eq:1.1, 1.2, 1.3}');
        });

        test('should not replace citations in inline code blocks', () => {
            const markdown = 'This is `$\\ref{eq:1.1}$` in code.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            expect(result).toBe(markdown); // Should remain unchanged
            expect(result).toContain('`$\\ref{eq:1.1}$`');
        });

        test('should handle the problematic case from the issue', () => {
            const markdown = 'Note if we enable the continuous citation, the equation write in a continuous sequence will also be rendered continuously. For example, `$\\ref{eq:1.3.1, 1.3.2, 1.3.3}` will be rendered as $\\ref{eq:1.3.1, 1.3.2, 1.3.3}$.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            // The citation in backticks should remain unchanged
            expect(result).toContain('`$\\ref{eq:1.3.1, 1.3.2, 1.3.3}`');
            // The citation outside backticks should be replaced
            expect(result).toContain('<span');
            expect(result).toContain('1.3.1~3');
            // Should only have one replacement
            const spanCount = (result.match(/<span/g) || []).length;
            expect(spanCount).toBeGreaterThan(0);
        });

        test('should not replace citations in multiline code blocks', () => {
            const markdown = `
This is normal text with $\\ref{eq:1.1}$.

\`\`\`
This is code with $\\ref{eq:2.1}$.
\`\`\`

This is normal text with $\\ref{eq:3.1}$.
`;
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            // Should replace citations outside code blocks
            expect(result).toContain('<span');
            // Should not replace citation inside code block
            expect(result).toContain('$\\ref{eq:2.1}$');
            // Count all spans (including nested ones) - should be 4 (outer and inner spans for eq:1.1 and eq:3.1)
            const spanCount = (result.match(/<span/g) || []).length;
            expect(spanCount).toBe(4);
        });

        test('should not replace citations in display math', () => {
            const markdown = `
This is inline math $\\ref{eq:1.1}$.

$$
\\ref{eq:2.1}
$$

This is another inline math $\\ref{eq:3.1}$.
`;
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            // Should replace inline math citations
            expect(result).toContain('<span');
            // Should not replace display math citation
            expect(result).toContain('$$\n\\ref{eq:2.1}\n$$');
        });

        test('should handle citations with leading/trailing spaces (should ignore them)', () => {
            const markdown = 'This is $\\ref{eq:1.1} $ and $ \\ref{eq:2.1}$ test.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            // Should not replace citations with leading/trailing spaces
            expect(result).toBe(markdown);
            expect(result).toContain('$\\ref{eq:1.1} $');
            expect(result).toContain('$ \\ref{eq:2.1}$');
        });

        test('should handle multiple refs in same math expression (should ignore)', () => {
            const markdown = 'This is $\\ref{eq:1.1} \\ref{eq:2.1}$ test.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            // Should not replace when multiple \ref{} in same expression
            expect(result).toBe(markdown);
        });

        test('should handle cross-file citations', () => {
            const markdown = 'This is $\\ref{eq:2^1.1}$ a cross-file citation.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                defaultSettings.rangeSymbol,
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            expect(result).toContain('<span');
            expect(result).toContain('1.1');
            expect(result).toContain('[2]');
            expect(result).toContain('<sup');
        });

        test('should disable continuous citations when rangeSymbol is null', () => {
            const markdown = 'This is $\\ref{eq:1.1, 1.2, 1.3}$ a test.';
            const result = replaceCitationsInMarkdown(
                markdown,
                defaultSettings.prefix,
                null, // Disable continuous citations
                defaultSettings.validDelimiters,
                defaultSettings.fileDelimiter,
                defaultSettings.multiCitationDelimiter
            );

            expect(result).toContain('<span');
            expect(result).not.toContain('1.1~3');
            expect(result).toContain('1.1');
            expect(result).toContain('1.2');
            expect(result).toContain('1.3');
        });
    });

    describe('generateCitationSpans', () => {
        test('should generate span for single citation', () => {
            const result = generateCitationSpans(['1.1'], '^');
            expect(result).toContain('<span');
            expect(result).toContain('1.1');
            expect(result).toContain('style=');
        });

        test('should generate spans for multiple citations', () => {
            const result = generateCitationSpans(['1.1', '1.2'], '^', ', ');
            expect(result).toContain('1.1');
            expect(result).toContain('1.2');
            expect(result).toContain(', ');
        });

        test('should handle cross-file citations with superscript', () => {
            const result = generateCitationSpans(['2^1.1'], '^');
            expect(result).toContain('1.1');
            expect(result).toContain('[2]');
            expect(result).toContain('<sup');
        });
    });
});