import { parseMarkdownLine } from "@/utils/string_processing/string_utils";
import Debugger from "@/debug/debugger";
import { QuoteCitationPrefix } from "@/settings/defaultSettings";

/**
 * The matched callout/quote information
 */
export interface CalloutMatch {
    raw: string;              // Full callout content (all lines)
    type: string;             // Type of callout (e.g., "table", "thm", "def")
    tag: string;              // e.g., "1.1", "2.3" (without prefix like "table:")
    label: string;            // Full label with prefix, e.g., "table:1.1"
    prefix: string;           // The prefix used (e.g., "table:", "thm:")
    content: string;          // The callout content (without the citation line)
    lineStart: number;        // Starting line number
    lineEnd: number;          // Ending line number
    quoteDepth: number;       // Depth of the quote/callout
}

/**
 * Parse callout citation from the first line of a callout block
 * Format: > [!prefix:tag] or > [!prefix:tag|color] where type matches a configured prefix
 * Examples:
 *   > [!table:1.1]
 *   > [!thm:2.3]
 *   > [!table:1.1|yellow]
 *
 * @param line - The line to parse
 * @param prefixes - Array of configured citation prefixes
 * @returns Object with type, tag, label, prefix if found, null otherwise
 */
function parseCalloutCitation(
    line: string,
    prefixes: QuoteCitationPrefix[]
): { type: string; tag: string; label: string; prefix: string } | null {
    // Match callout syntax: [!anything]
    const calloutMatch = line.match(/^\[!([^\]]+)\]/);
    if (!calloutMatch) return null;

    // Get only the first part before pipe (e.g., "table:1.1|yellow" -> "table:1.1")
    // Parts after | are treated as metadata by Obsidian
    const calloutContent = calloutMatch[1].split('|')[0].trim();
    
    // Check each configured prefix
    for (const prefixConfig of prefixes) {
        const prefix = prefixConfig.prefix; // e.g., "table:", "thm:"

        // Check if callout content starts with this prefix
        if (calloutContent.startsWith(prefix)) {
            const tag = calloutContent.substring(prefix.length).trim(); // Remove prefix to get tag

            if (tag) { // Only valid if there's a tag after the prefix
                // Extract type from prefix (remove trailing colon)
                const type = prefix.endsWith(':') ? prefix.slice(0, -1) : prefix;

                return {
                    type,
                    tag,
                    label: `${prefix}${tag}`,
                    prefix
                };
            }
        }
    }

    return null;
}

/**
 * Parse all callouts with citations in markdown content
 *
 * A callout block is:
 * - A continuous sequence of lines starting with >
 * - The first line contains [!prefix:tag] where prefix is configured
 * - All subsequent lines with > are part of the same callout until a non-quote line
 *
 * Example:
 * ```
 * > [!table:1.1]
 * > This is a table
 * > with multiple lines
 * ```
 *
 * @param markdown - The markdown content to parse
 * @param prefixes - Array of configured citation prefixes from settings
 * @returns Array of CalloutMatch objects
 */
export function parseAllCalloutsFromMarkdown(
    markdown: string,
    prefixes: QuoteCitationPrefix[]
): CalloutMatch[] {
    if (!markdown.trim() || !prefixes || prefixes.length === 0) return [];

    const lines = markdown.split('\n');
    const callouts: CalloutMatch[] = [];

    let inCodeBlock = false;
    let inCallout = false;
    let calloutStartLine = 0;
    let calloutBuffer: string[] = [];
    let calloutCitation: { type: string; tag: string; label: string; prefix: string } | null = null;
    let calloutQuoteDepth = 0;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Parse line to check environment
        const parseResult = parseMarkdownLine(line, true, inCodeBlock);

        // Update code block state
        if (parseResult.isCodeBlockToggle) {
            inCodeBlock = !inCodeBlock;
        }
        
        // Skip lines in code blocks
        if (inCodeBlock) continue;

        // Check if we're currently in a callout block
        if (inCallout) {
            // Check if this line continues the callout (is still a quote line with same depth)
            if (parseResult.inQuote && parseResult.quoteDepth === calloutQuoteDepth) {
                // Add the original line to preserve the > quote marks
                calloutBuffer.push(line);
            } else {
                // Callout block ended - process and store it
                inCallout = false;
                if (calloutCitation && calloutBuffer.length > 0) {
                    const rawContent = calloutBuffer.join('\n');

                    // Remove the citation line from content (first line with [!...])
                    const contentLines = calloutBuffer.slice(1); // Skip first line
                    const content = contentLines.join('\n').trim();

                    callouts.push({
                        raw: rawContent,
                        type: calloutCitation.type,
                        tag: calloutCitation.tag,
                        label: calloutCitation.label,
                        prefix: calloutCitation.prefix,
                        content,
                        lineStart: calloutStartLine,
                        lineEnd: lineNum - 1,
                        quoteDepth: calloutQuoteDepth
                    });

                    Debugger.log(`Parsed callout at lines ${calloutStartLine}-${lineNum - 1}: type=${calloutCitation.type}, tag=${calloutCitation.tag}`);
                }

                // Reset state
                calloutBuffer = [];
                calloutCitation = null;
            }
        }

        // Check if this line starts a new callout with citation
        if (!inCallout && parseResult.inQuote) {
            const citation = parseCalloutCitation(parseResult.processedContent, prefixes);

            if (citation) {
                // Start a new callout block
                inCallout = true;
                calloutStartLine = lineNum;
                calloutQuoteDepth = parseResult.quoteDepth;
                calloutBuffer = [line]; // Use original line to preserve > quote marks
                calloutCitation = citation;
            }
        }
    }

    // Handle unclosed callout at end of document
    if (inCallout && calloutCitation && calloutBuffer.length > 0) {
        const rawContent = calloutBuffer.join('\n');
        const contentLines = calloutBuffer.slice(1);
        const content = contentLines.join('\n').trim();

        callouts.push({
            raw: rawContent,
            type: calloutCitation.type,
            tag: calloutCitation.tag,
            label: calloutCitation.label,
            prefix: calloutCitation.prefix,
            content,
            lineStart: calloutStartLine,
            lineEnd: lines.length - 1,
            quoteDepth: calloutQuoteDepth
        });

        Debugger.log(`Parsed unclosed callout at lines ${calloutStartLine}-${lines.length - 1}: type=${calloutCitation.type}, tag=${calloutCitation.tag}`);
    }

    Debugger.log(`Total callouts parsed: ${callouts.length}`);
    return callouts;
}

/**
 * Parse the first callout with the given tag in the markdown content
 *
 * @param markdown - The markdown content to parse
 * @param tag - The tag to search for (without prefix, e.g., "1.1" not "table:1.1")
 * @param prefixes - Array of configured citation prefixes from settings
 * @returns The first CalloutMatch with the matching tag, or undefined if not found
 */
export function parseFirstCalloutInMarkdown(
    markdown: string,
    tag: string,
    prefixes: QuoteCitationPrefix[]
): CalloutMatch | undefined {
    if (!markdown.trim() || !tag.trim() || !prefixes || prefixes.length === 0) {
        return undefined;
    }

    const allCallouts = parseAllCalloutsFromMarkdown(markdown, prefixes);
    return allCallouts.find(callout => callout.tag === tag);
}
