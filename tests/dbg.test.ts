import { replaceCitationsInMarkdown } from "@/utils/citation_utils";

const defaultSettings = {
        prefix: 'eq:',
        rangeSymbol: '~',
        validDelimiters: ['.', '-'],
        fileDelimiter: '^',
        multiCitationDelimiter: ', '
    };

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
