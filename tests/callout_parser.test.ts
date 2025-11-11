// callout_parser.test.ts
import {
    parseAllCalloutsFromMarkdown,
    parseFirstCalloutInMarkdown,
} from "@/utils/parsers/callout_parser";
import { QuoteCitationPrefix } from "@/settings/defaultSettings";

// Configure test prefixes
const testPrefixes: QuoteCitationPrefix[] = [
    { prefix: "table:", format: "Table. #" },
    { prefix: "thm:", format: "Theorem #" },
    { prefix: "def:", format: "Definition #" },
];

describe('parseCalloutCitation', () => {
    it('should parse basic table callout', () => {
        const markdown = `> [!table:1.1]
> This is a table callout`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].type).toBe('table');
        expect(callouts[0].tag).toBe('1.1');
        expect(callouts[0].label).toBe('table:1.1');
        expect(callouts[0].prefix).toBe('table:');
    });

    it('should parse multi-line callout content', () => {
        const markdown = `> [!thm:2.3]
> **Theorem**: This is an important theorem
> that spans multiple lines.
>
> The proof is left as an exercise.`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].type).toBe('thm');
        expect(callouts[0].tag).toBe('2.3');
        expect(callouts[0].content).toContain('Theorem');
        expect(callouts[0].content).toContain('proof');
    });

    it('should parse multiple callouts in same document', () => {
        const markdown = `> [!table:1.1]
> Table content

Some text

> [!thm:2.3]
> Theorem content

> [!def:3.5]
> Definition content`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(3);
        expect(callouts[0].tag).toBe('1.1');
        expect(callouts[1].tag).toBe('2.3');
        expect(callouts[2].tag).toBe('3.5');
    });
});

describe('parseAllCalloutsFromMarkdown - edge cases', () => {
    it('should ignore regular quotes without citation tags', () => {
        const markdown = `> This is a regular quote
> without any citation tag`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(0);
    });

    it('should ignore callouts in code blocks', () => {
        const markdown = `\`\`\`
> [!table:999]
> This should not be parsed
\`\`\``;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(0);
    });

    it('should parse single-line callout', () => {
        const markdown = `> [!table:4.2]
> Single line content`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].tag).toBe('4.2');
        expect(callouts[0].content).toBe('Single line content');
    });

    it('should handle callouts with various tag formats', () => {
        const markdown = `> [!table:1.1]
> Content 1

> [!thm:2-3]
> Content 2

> [!def:A.5]
> Content 3`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(3);
        expect(callouts[0].tag).toBe('1.1');
        expect(callouts[1].tag).toBe('2-3');
        expect(callouts[2].tag).toBe('A.5');
    });

    it('should end callout at non-quote line', () => {
        const markdown = `> [!table:1.1]
> Line 1
> Line 2
Regular text
> [!thm:2.1]
> Another callout`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(2);
        expect(callouts[0].content).toContain('Line 1');
        expect(callouts[0].content).toContain('Line 2');
        expect(callouts[0].content).not.toContain('Regular text');
    });

    it('should ignore callouts with unconfigured prefixes', () => {
        const markdown = `> [!example:1.1]
> This uses an unconfigured prefix

> [!table:2.2]
> This uses a configured prefix`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].tag).toBe('2.2');
        expect(callouts[0].type).toBe('table');
    });

    it('should handle empty prefixes array', () => {
        const markdown = `> [!table:1.1]
> Content`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, []);

        expect(callouts).toHaveLength(0);
    });

    it('should handle empty markdown', () => {
        const callouts = parseAllCalloutsFromMarkdown('', testPrefixes);

        expect(callouts).toHaveLength(0);
    });
});

describe('parseFirstCalloutInMarkdown', () => {
    it('should find first callout with specific tag', () => {
        const markdown = `> [!table:1.1]
> First table

> [!table:2.2]
> Second table

> [!thm:1.1]
> Theorem with same tag`;

        const callout = parseFirstCalloutInMarkdown(markdown, '1.1', testPrefixes);

        expect(callout).toBeDefined();
        expect(callout?.type).toBe('table');
        expect(callout?.tag).toBe('1.1');
        expect(callout?.content).toContain('First table');
    });

    it('should return undefined for non-existent tag', () => {
        const markdown = `> [!table:1.1]
> Content`;

        const callout = parseFirstCalloutInMarkdown(markdown, '999', testPrefixes);

        expect(callout).toBeUndefined();
    });

    it('should return undefined for empty tag', () => {
        const markdown = `> [!table:1.1]
> Content`;

        const callout = parseFirstCalloutInMarkdown(markdown, '', testPrefixes);

        expect(callout).toBeUndefined();
    });
});

describe('CalloutMatch structure', () => {
    it('should include correct line numbers', () => {
        const markdown = `Line 0
Line 1
> [!table:1.1]
> Line 3
> Line 4
Line 5`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].lineStart).toBe(2); // Zero-indexed
        expect(callouts[0].lineEnd).toBe(4);
    });

    it('should track quote depth', () => {
        const markdown = `> [!table:1.1]
> Content at depth 1`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].quoteDepth).toBe(1);
    });

    it('should include raw content', () => {
        const markdown = `> [!table:1.1]
> Content line`;

        const callouts = parseAllCalloutsFromMarkdown(markdown, testPrefixes);

        expect(callouts).toHaveLength(1);
        expect(callouts[0].raw).toContain('[!table:1.1]');
        expect(callouts[0].raw).toContain('Content line');
    });
});
