import { getStyleFromStyleSheet } from "@/utils/styles_utils";
import { escapeRegExp, escapeString } from "@/utils/string_utils";

/**
 * Combines continuous equation tags with common prefixes and file citations.
 * Example: ["P1", "2^1.1.1", "2^1.1.2", "2^1.1.3"] → ["P1", "2^1.1.1~3"]
 */
export function combineContinuousEquationTags(
    tags: string[],
    rangeSymbol: string,
    validDelimiters: string[],
    fileDelimiter: string
): string[] {
    if (tags.length === 0) return [];

    // Create a mapping from original tags to their combined form
    const tagMapping = new Map<string, string>();
    const processedTags = new Set<string>();

    // Group tags by their file citation suffix (if any)
    const groups: Record<string, string[]> = {};
    for (const tag of tags) {
        const { local, crossFile } = splitFileCitation(tag, fileDelimiter);
        const key = crossFile ? `${crossFile}` : '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(local);
    }

    // Process each group separately
    for (const [filePrefix, localTags] of Object.entries(groups)) {
        // Create a map of numeric tags grouped by prefix
        const numericGroups: Record<string, { tag: string; num: number }[]> = {};
        const nonNumericTags: string[] = [];

        for (const tag of localTags) {
            const num = extractLastNumberFromTag(tag, validDelimiters);
            if (num !== null) {
                const prefix = extractPrefixBeforeLastNumber(tag, validDelimiters);
                if (!numericGroups[prefix]) numericGroups[prefix] = [];
                numericGroups[prefix].push({ tag, num });
            } else {
                nonNumericTags.push(tag);
            }
        }

        // Process numeric groups to find continuous sequences
        for (const [prefix, tagInfos] of Object.entries(numericGroups)) {
            // Sort by number
            tagInfos.sort((a, b) => a.num - b.num);

            let i = 0;
            while (i < tagInfos.length) {
                const start = i;
                let end = i;

                // Find continuous sequence
                while (end + 1 < tagInfos.length &&
                    tagInfos[end + 1].num === tagInfos[end].num + 1) {
                    end++;
                }

                // Create combined tag or single tag
                let combinedTag: string;
                if (start === end) {
                    // Single tag
                    combinedTag = filePrefix ? filePrefix + fileDelimiter + tagInfos[start].tag : tagInfos[start].tag;
                } else {
                    // Continuous sequence
                    const startNum = tagInfos[start].num;
                    const endNum = tagInfos[end].num;
                    const rangeLocal = `${prefix}${startNum}${rangeSymbol}${endNum}`;
                    combinedTag = filePrefix ? `${filePrefix}${fileDelimiter}${rangeLocal}` : rangeLocal; 
                }

                // Map all tags in this sequence to the combined form
                for (let j = start; j <= end; j++) {
                    const originalTag =  filePrefix? `${filePrefix}${fileDelimiter}${tagInfos[j].tag}` : tagInfos[j].tag;
                    tagMapping.set(originalTag, combinedTag);
                    processedTags.add(originalTag);
                }
                i = end + 1;
            }
        }

        // Add non-numeric tags to mapping (they map to themselves)
        for (const tag of nonNumericTags) {
            const fullTag = filePrefix ? `${filePrefix}${fileDelimiter}${tag}` : tag;
            tagMapping.set(fullTag, fullTag);
            processedTags.add(fullTag);
        }
    }

    // Build result preserving original order, but only including each combined form once
    const result: string[] = [];
    const addedCombined = new Set<string>();

    for (const tag of tags) {
        const combinedForm = tagMapping.get(tag);
        if (combinedForm && !addedCombined.has(combinedForm)) {
            result.push(combinedForm);
            addedCombined.add(combinedForm);
        }
    }

    return result;
}

/**
 * Extracts the last number from a tag using valid delimiters or direct letter-number pattern
 */
function extractLastNumberFromTag(tag: string, validDelimiters: string[]): number | null {
    // Find the last delimiter
    let lastDelimiterIndex = -1;
    for (const delimiter of validDelimiters) {
        const index = tag.lastIndexOf(delimiter);
        if (index > lastDelimiterIndex) {
            lastDelimiterIndex = index;
        }
    }

    let numStr: string;
    if (lastDelimiterIndex >= 0) {
        // Extract number after last delimiter
        numStr = tag.substring(lastDelimiterIndex + 1);
    } else {
        // No delimiter found - check for letter-number pattern (e.g., "EQ1")
        const match = tag.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
            numStr = match[2];
        } else {
            numStr = tag;
        }
    }

    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : num;
}

/**
 * Extracts the prefix before the last number
 */
function extractPrefixBeforeLastNumber(tag: string, validDelimiters: string[]): string {
    // Find the last delimiter
    let lastDelimiterIndex = -1;
    for (const delimiter of validDelimiters) {
        const index = tag.lastIndexOf(delimiter);
        if (index > lastDelimiterIndex) {
            lastDelimiterIndex = index;
        }
    }

    if (lastDelimiterIndex >= 0) {
        return tag.substring(0, lastDelimiterIndex + 1);
    } else {
        // No delimiter found - check for letter-number pattern (e.g., "EQ1")
        const match = tag.match(/^([A-Za-z]+)(\d+)$/);
        if (match) {
            return match[1]; // Return the letter part (e.g., "EQ")
        } else {
            return '';
        }
    }
}

/**
 * Splits an equation string into local and cross-file parts.
 * Example: "2^1.3.1~3" → { local: "1.3.1~3", crossFile: "2" }
 */
export function splitFileCitation(eqStr: string, fileDelimiter: string): { local: string; crossFile: string | null } {
    const index = eqStr.indexOf(fileDelimiter); // Changed from lastIndexOf to indexOf
    if (index >= 0) {
        return {
            crossFile: eqStr.substring(0, index), // Now crossFile is the prefix
            local: eqStr.substring(index + fileDelimiter.length) // Now local is the suffix
        };
    }
    return { local: eqStr, crossFile: null };
}

/**
 * Checks if an equation part uses only valid delimiters.
 */
export function isValidEquationPart(part: string, validDelimiters: string[]): boolean {
    if (!part) return false;

    // Escape delimiters for regex and join with | (for OR matching)
    const escapedDelimiters = validDelimiters.map(d =>
        d === '.' ? '\\.' : (d === '-' ? '\\-' : escapeRegExp(d))
    ).join('|');

    // Pattern: numbers separated by valid delimiters
    const validPattern = new RegExp(`^\\d+(?:[${escapedDelimiters}]\\d+)*$`);
    return validPattern.test(part);
}

/**
 * Extracts the common prefix between two equation numbers.
 * Example: "1.3.1" and "1.3.3" → returns "1.3."
 */
export function extractCommonPrefix(a: string, b: string, validDelimiters: string[]): string {
    let prefix = '';
    const minLength = Math.min(a.length, b.length);

    for (let i = 0; i < minLength; i++) {
        if (a[i] === b[i]) {
            prefix += a[i];
        } else {
            break;
        }
    }

    // Find the last delimiter in the common prefix
    const lastDelimiterIndex = Math.max(
        ...validDelimiters.map(d => prefix.lastIndexOf(d))
    );

    return lastDelimiterIndex >= 0 ? prefix.substring(0, lastDelimiterIndex + 1) : '';
}

/**
 * Extracts the last number from an equation string after a given prefix.
 * Example: ("1.3.1", "1.3.") → 1
 */
export function extractLastNumber(eq: string, prefix: string): number | null {
    const numStr = eq.substring(prefix.length);
    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : num;
}

export interface EquationRef {
    label: string;
    line: number;
    fullMatch: string;
}

/**
 * Parses all inline equation cite references in a markdown string. 
 */
export function parseCitationsInMarkdown(md: string): EquationRef[] {
    if (!md.trim()) return [];

    const result: EquationRef[] = [];
    const lines = md.split('\n');
    let inMultilineCodeBlock = false;

    // Regex to match inline math with \ref{} - excludes display math $
    // Uses negative lookbehind and lookahead to ensure single $ not preceded/followed by $
    const inlineRefRegex = /(?<!\$)\$(?!\$)([^$]*?\\ref\{([^}]*)\}[^$]*?)\$(?!\$)/g;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Handle multiline code blocks
        const codeBlockMatches = line.match(/```/g);
        if (codeBlockMatches) {
            // Toggle for each ``` found
            for (let i = 0; i < codeBlockMatches.length; i++) {
                inMultilineCodeBlock = !inMultilineCodeBlock;
            }
        }

        if (inMultilineCodeBlock) continue;

        // Remove inline code block`s (content between backticks)
        const processedLine = removeInlineCodeBlocks(line);

        // Reset regex lastIndex for each line
        inlineRefRegex.lastIndex = 0;

        // Find all inline math expressions with \ref{}
        let match;
        while ((match = inlineRefRegex.exec(processedLine)) !== null) {
            const [fullMatch, content, label] = match;

            // Skip if there are spaces immediately after opening $ or before closing $
            if (content.startsWith(' ') || content.endsWith(' ')) {
                continue;
            }

            // Skip if multiple \ref{} in same formula
            const refCount = (content.match(/\\ref\{/g) || []).length;
            if (refCount > 1) {
                continue;
            }

            result.push({
                label: label,
                line: lineNum,
                fullMatch: fullMatch
            });
        }
    }
    return result;
}

function removeInlineCodeBlocks(line: string): string {
    let result = '';
    let inCodeBlock = false;
    let i = 0;

    while (i < line.length) {
        if (line[i] === '`' && (i === 0 || line[i - 1] !== '\\')) {
            // Toggle code block state
            inCodeBlock = !inCodeBlock;
            result += ' '; // Replace backtick with space
        } else if (inCodeBlock) {
            // Replace code content with spaces
            result += ' ';
        } else {
            // Keep normal content
            result += line[i];
        }
        i++;
    }

    return result;
}


/**
 * Replaces inline citations in markdown with <span> tags
 * Ignores: 1. Multiline code blocks 2. Inline code blocks 3. Citations in display math ($$ $$)
 * 
 * @param markdown - Original markdown string
 * @param rangeSymbol - Range symbol, defaults to '~', if null, not use continuous equation tags 
 * @param validDelimiters - Valid delimiters, defaults to ['.', '-']
 * @param fileDelimiter - File delimiter, defaults to '^'
 * @returns Processed markdown string
 */
export function replaceCitationsInMarkdown(
    markdown: string,
    prefix: string,
    rangeSymbol: string | null,
    validDelimiters: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ','
): string {
    if (!markdown.trim()) return markdown;

    const lines = markdown.split('\n');
    let inMultilineCodeBlock = false;
    let inDisplayMath = false;

    const processedLines = lines.map((line, lineNum) => {
        let processedLine = line;
        // Handles multiline code block state
        const codeBlockMatches = line.match(/```/g);
        if (codeBlockMatches) {
            for (let i = 0; i < codeBlockMatches.length; i++) {
                inMultilineCodeBlock = !inMultilineCodeBlock;
            }
        }
        if (inMultilineCodeBlock) {
            return line; // In code block - skip processing
        }
        // Handles display math block state
        const displayMathMatches = line.match(/\$\$/g);
        if (displayMathMatches) {
            for (let i = 0; i < displayMathMatches.length; i++) {
                inDisplayMath = !inDisplayMath;
            }
        }
        if (inDisplayMath) {
            return line; // In display math block - skip processing
        }
        processedLine = processInlineReferences(
            line, prefix, rangeSymbol, validDelimiters, fileDelimiter, multiCitationDelimiter
        );
        return processedLine;
    });
    return processedLines.join('\n');
}

/**
 * Processes inline citations while avoiding inline code blocks
 */
function processInlineReferences(
    line: string,
    prefix: string,
    rangeSymbol: string | null,  // if null, not use continuous equation tags 
    validDelimiters: string[],
    fileDelimiter: string, // if null, not use file citations 
    multiCitationDelimiter = ','
): string {
    // First marks all inline code block positions
    const codeBlockRanges: Array<{ start: number, end: number }> = [];
    let i = 0;

    while (i < line.length) {
        if (line[i] === '`' && (i === 0 || line[i - 1] !== '\\')) {
            const start = i;
            i++; // Skips opening backtick 
            // Finds closing backtick
            while (i < line.length) {
                if (line[i] === '`' && line[i - 1] !== '\\') {
                    codeBlockRanges.push({ start, end: i });
                    break;
                }
                i++;
            }
        }
        i++;
    }

    // Checks if position is within a code block
    const isInCodeBlock = (pos: number): boolean => {
        return codeBlockRanges.some(range => pos >= range.start && pos <= range.end);
    };
    // Find all potential inline math expressions first
    const dollarPositions: Array<{ pos: number, type: 'single' | 'double' }> = [];
    i = 0;
    while (i < line.length) {
        if (line[i] === '$') {
            if (i + 1 < line.length && line[i + 1] === '$') {
                // Double dollar - display math
                dollarPositions.push({ pos: i, type: 'double' });
                i += 2;
            } else {
                // Single dollar - inline math
                dollarPositions.push({ pos: i, type: 'single' });
                i += 1;
            }
        } else {
            i += 1;
        }
    }

    // Finds all valid inline math patterns 
    const inlineMathRanges: Array<{ start: number, end: number }> = [];
    for (let j = 0; j < dollarPositions.length - 1; j++) {
        const current = dollarPositions[j];
        const next = dollarPositions[j + 1];

        if (current.type === 'single' && next.type === 'single') {
            // Check if both positions are outside code blocks
            if (!isInCodeBlock(current.pos) && !isInCodeBlock(next.pos)) {
                inlineMathRanges.push({ start: current.pos, end: next.pos });
                j++; // Skip the next position as it's already paired
            }
        }
    }

    // Find citations within valid inline math ranges 
    const refRegex = new RegExp(`\\\\ref\\{${escapeRegExp(prefix)}([^}]*)\\}`, 'g');
    const matches: Array<{
        mathStart: number,
        mathEnd: number,
        content: string,
        citations: string[]
    }> = [];


    for (const mathRange of inlineMathRanges) {
        const mathContent = line.substring(mathRange.start + 1, mathRange.end); // +1 to skip opening $

        // Skip if content has leading/trailing spaces
        if (mathContent.startsWith(' ') || mathContent.endsWith(' ')) {
            continue;
        }

        // Check for exactly one \ref{} in this math expression
        const refMatches = [...mathContent.matchAll(/\\ref\{/g)];
        if (refMatches.length !== 1) {
            continue;
        }

        // Extract the citation
        refRegex.lastIndex = 0;
        const refMatch = refRegex.exec(mathContent);
        if (refMatch) {
            const citations = refMatch[1].split(',').map(c => c.trim()).filter(c => c.length > 0);
            matches.push({
                mathStart: mathRange.start,
                mathEnd: mathRange.end + 1, // +1 to include closing $
                content: mathContent,
                citations
            });
        }
    }

    // Replace from end to start 
    let result = line;
    matches.reverse().forEach(({ mathStart, mathEnd, citations }) => {
        // Combines continuous citation tags
        const combinedCitations = (rangeSymbol === null) ?
            citations :
            combineContinuousEquationTags(
                citations,
                rangeSymbol,
                validDelimiters,
                fileDelimiter
            );

        // Generates replacement HTML
        const replacement = generateCitationSpans(combinedCitations, fileDelimiter, multiCitationDelimiter);

        // Performs replacement
        result = result.substring(0, mathStart) + replacement + result.substring(mathEnd);
    });
    return result;
}

/**
 * Generates span tags for citations
 */
export function generateCitationSpans(
    citations: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ',',
    citationFormat = '(#)'
): string {
    const spans = citations.map((citation, index) => {
        const { local, crossFile } = splitFileCitation(citation, fileDelimiter);
        const default_style = 'color: #000000;'
    
        const citationColorInPdf = document.documentElement.style.getPropertyValue('--em-math-citation-color-print') || '#000000';
        const superScriptColorInPdf = document.documentElement.style.getPropertyValue('--em-math-citation-file-superscript-color-print') || '#000000' ;

        // Gets styles
        const containerStyle = escapeString(getStyleFromStyleSheet(
            'em-math-citation-container-print',
            default_style,
        ), "\"") + ` color: ${citationColorInPdf};`;

        const citationStyle = escapeString(getStyleFromStyleSheet(
            'em-math-citation-print',
            default_style,
        ), "\"") + ` color: ${citationColorInPdf};`

        const superscriptStyle = escapeString(
            getStyleFromStyleSheet(
                'em-math-citation-file-superscript-print',
                default_style + 'font-size: 0.7em; vertical-align: super; margin-left: 1px;'
            ), "\""
        ) + ` color: ${superScriptColorInPdf};`
        
        let result = `<span style="${containerStyle}">` +  citationFormat.replace('#', `<span style="${citationStyle}">${local}</span>`);
        
        if (crossFile) {
            result += `<sup style="${superscriptStyle}">${'[' + crossFile + ']'}</sup>`;
        }

        result += '</span>';

        return result;
    });
    return spans.join(multiCitationDelimiter + ' '); // Joins all spans with comma separator
}
