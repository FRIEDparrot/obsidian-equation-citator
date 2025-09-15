import { escapeString, removeBraces, removeInlineCodeBlocks } from "@/utils/string_utils";
import { inlineMathPattern, isCodeBlockToggle, matchCitationsInLine, matchNestedCitation } from "@/utils/regexp_utils";

export interface CitationRef {
    label: string;
    line: number;
    fullMatch: string;
    position: {
        start: number;  // start index of the full match in the line (inline index)
        end: number;  // end index of the full match in the line  (inline index) 
    }
}

/**
 * Construct the standard crossfile citation : <file><delimiter>{<local>}
 */
export function buildCrossFileCitation(
    filePart: string,
    localPart: string,
    fileDelimiter: string
): string {
    const f = (filePart || '').trim();
    const l = removeBraces((localPart || '').trim());
    return `${f}${fileDelimiter}{${l}}`;
}

/**
 * Combines continuous equation tags with common prefixes and file citations.
 * Example: ["P1", "2^1.1.1", "2^1.1.2", "2^1.1.3"] → ["P1", "2^{1.1.1~3}"]
 */
export function combineContinuousCitationTags(
    tags: string[],
    rangeSymbol: string,
    validDelimiters: string[],
    fileDelimiter: string
): string[] {
    const cleanedTags = (tags ?? []).filter(tag => tag.trim() !== '');
    if (cleanedTags.length === 0) return [];

    // Group tags by their file citation suffix (if any)
    const groups: Record<string, { local: string, order: number }[]> = {}; // 1 : [1.1.1, 1.1.2] 
    let orderIdx = 0;
    for (const tag of cleanedTags) {
        const { local, crossFile } = splitFileCitation(tag, fileDelimiter);
        const key = crossFile ? `${crossFile}` : '';
        if (!groups[key]) groups[key] = [];
        groups[key].push({ local, order: orderIdx++ });
    }

    const result: { combinedTag: string; order: number }[] = [];
    // record seen tags to remove duplicates  
    const seenTags = new Set<string>();
    // Process each group separately
    for (const [filePrefix, tagInfos] of Object.entries(groups)) {
        const formatTag = (local: string) =>
            filePrefix ? buildCrossFileCitation(filePrefix, local, fileDelimiter) : local.trim();
        // Create a map of numeric tags grouped by prefix
        const numericGroups: Record<string, { local: string; num: number, order: number }[]> = {};

        // extract the before part and the number part of each tag
        for (const { local, order } of tagInfos) {
            if (local.includes(rangeSymbol)) {
                const formatted = formatTag(local);
                // already Continuous range, add as it is 
                if (!seenTags.has(formatted)) {
                    result.push({ combinedTag: formatted, order });
                    seenTags.add(formatted);
                }
                continue;  // move to next tag   
            }
            const num = extractLastNumberFromTag(local, validDelimiters);
            if (num !== null) {
                const prefix = extractPrefixBeforeLastNumber(local, validDelimiters);
                if (!numericGroups[prefix]) numericGroups[prefix] = [];
                numericGroups[prefix].push({ local, num, order });
            } else {
                // non-numeric tag, add as is  
                const formatted = formatTag(local);
                if (!seenTags.has(formatted)) {
                    result.push({ combinedTag: formatted, order });
                    seenTags.add(formatted);
                }
            }
        }
        // Process numeric groups to find continuous sequences
        for (const [prefix, tagInfos] of Object.entries(numericGroups)) { 
            tagInfos.sort((a, b) => a.num - b.num);  // sort tagInfos by num (not consider order)  
            let i = 0;
            while (i < tagInfos.length) {
                const start = i;
                let end = i;
                // Find continuous sequence range (can be same) 
                while (end + 1 < tagInfos.length &&
                    tagInfos[end + 1].num >= tagInfos[end].num  &&
                    tagInfos[end + 1].num <= tagInfos[end].num + 1) {
                    end++;
                }
                const startNum = tagInfos[start].num;
                const endNum = tagInfos[end].num; 
                
                const formatted = (startNum === endNum)
                    ? formatTag(tagInfos[start].local)
                    : formatTag(`${prefix}${startNum}${rangeSymbol}${endNum}`); 

                const firstOrder = tagInfos[start].order; // use the order of the first tag as the order for the combined tag 
                
                if (!seenTags.has(formatted)) {
                    result.push({ combinedTag: formatted, order: firstOrder });
                    seenTags.add(formatted);
                }
                i = end + 1;  // move to next position  
            }
        }
    }
    // Build result preserving original order, but only including each combined form once
    return result
        .sort((a, b) => a.order - b.order)
        .filter((item, index, array) =>
            index === array.findIndex(i => i.combinedTag === item.combinedTag)
        )
        .map(r => r.combinedTag);
}

/**
 * Splits continuous citation tags back into individual tags.
 * Example: ["P1~2", "1.3.2~3",  "2^1.1.1~4", "1.3.4"] 
 * → ["P1", "P2",  "1.3.2", "1.3.3", "2^{1.1.1}", "2^{1.1.2}", "2^{1.1.3}", "2^{1.1.4}", "1.3.4"]
 */
export function splitContinuousCitationTags(
    tags: string[],
    rangeSymbol: string,
    validDelimiters: string[],
    fileDelimiter: string
): string[] {
    const cleanedTags = (tags ?? []).filter(tag => tag.trim() !== ''); // Filter out empty tags
    if (cleanedTags.length === 0) return [];
    const result: string[] = [];

    for (const tag of cleanedTags) {
        // Split into file citation and local parts
        const { local, crossFile } = splitFileCitation(tag, fileDelimiter);
        // Check if the local part contains range symbol
        if (!local.includes(rangeSymbol)) {
            if (crossFile) {
                result.push(`${crossFile}${fileDelimiter}{${local}}`);  // use new format
            }
            else {
                result.push(local); // No range symbol, add as is 
            }
            continue;
        }
        // Extract range from local part
        const rangeIndex = local.lastIndexOf(rangeSymbol);
        const beforeRange = local.substring(0, rangeIndex); // front part
        const afterRange = local.substring(rangeIndex + rangeSymbol.length);  // next number part 

        // Try to parse the numbers
        const startNum = extractLastNumberFromTag(beforeRange, validDelimiters);
        const endNum = parseInt(afterRange, 10);

        if (startNum === null || isNaN(endNum) || startNum > endNum) {
            // Invalid range - only add original tag 
            result.push(tag);
            continue;
        }

        // Extract the prefix before the start number
        const prefix = extractPrefixBeforeLastNumber(beforeRange, validDelimiters);

        // Generate individual tags in the range
        for (let num = startNum; num <= endNum; num++) {
            const individualLocal = prefix + num;
            const individualTag = crossFile ?
                buildCrossFileCitation(crossFile, individualLocal, fileDelimiter) :
                individualLocal;
            result.push(individualTag);
        }
    }

    return result.map((r) => r.trim());
}

/**
 * Extracts the last number from a tag using valid delimiters or direct letter-number pattern
 * input : pure tag   (e.g., "1.1.1"), not contain file citation (e.g., "2^1.1.1")
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
        const match = tag.match(/^(.+?)(\d+)$/);
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
 * e.g. EQ1 -> EQ 
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
        const match = tag.match(/^(.+?)(\d+)$/);
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
 * Example: "2^{1.3.1~2}" → { local: "1.3.1~2", crossFile: "2" }
 */
export function splitFileCitation(eqStr: string, fileDelimiter: string): { local: string; crossFile: string | null } {
    if (!fileDelimiter || !eqStr.includes(fileDelimiter)) {
        return { local: removeBraces(eqStr), crossFile: null }; // No file citation, return as is 
    }
    const index = eqStr.indexOf(fileDelimiter); // Changed from lastIndexOf to indexOf
    const crossFile = eqStr.substring(0, index);
    const localPart = eqStr.substring(index + fileDelimiter.length); 
    const processedLocal = removeBraces(localPart); // Remove braces from local part 
    return {
        crossFile: crossFile.trim(),
        local: processedLocal.trim() // Now local is the suffix
    };
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


/**
 * Parses all inline equation cite references in a markdown string. 
 * Nested brace support 
 */
export function parseCitationsInMarkdown(md: string): CitationRef[] {
    if (!md.trim()) return [];
    const result: CitationRef[] = [];
    const lines = md.split('\n');
    let inCodeBlock = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Handle multiline code blocks
        if (isCodeBlockToggle(line)) inCodeBlock = !inCodeBlock;
        if (inCodeBlock) continue;

        // Remove inline code blocks (replace the code block with spaces) 
        const processedLine = removeInlineCodeBlocks(line);

        // Find all inline math expressions with \ref{} 
        const matches = matchCitationsInLine(processedLine);
        for (const match of matches) {
            const { fullMatch, label, position } = match;
            result.push({
                label: label,
                line: lineNum,
                fullMatch: fullMatch,
                position: {
                    start: position.start,
                    end: position.end
                }
            });
        }
    }
    return result;
}

////////////////////  Following Functions are for PDF export usage  ///////////////////////// 

export interface SpanStyles {
    citationColorInPdf: string;
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
export function replaceCitationsInMarkdownWithSpan(
    markdown: string,
    prefix: string,
    rangeSymbol: string | null,
    validDelimiters: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ',',
    citationFormat = '(#)',
    spanStyles = {} as SpanStyles
): string {
    if (!markdown.trim()) return markdown;

    const lines = markdown.split('\n');
    let inMultilineCodeBlock = false;
    let inDisplayMath = false;

    const processedLines = lines.map((line, lineNum) => {
        let processedLine = line;
        // Handles multiline code block state
        if (isCodeBlockToggle(line)) {
            inMultilineCodeBlock = !inMultilineCodeBlock;
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
            line, prefix, rangeSymbol, validDelimiters, fileDelimiter, multiCitationDelimiter, citationFormat, spanStyles
        );
        return processedLine;
    });
    return processedLines.join('\n');
}

/**
 * Processes inline citations to span while avoiding inline code blocks
 */
function processInlineReferences(
    line: string,
    prefix: string,
    rangeSymbol: string | null,  // if null, not use continuous equation tags 
    validDelimiters: string[],
    fileDelimiter: string, // if null, not use file citations 
    multiCitationDelimiter = ',',
    citationFormat = '(#)',
    spanStyles = {} as SpanStyles
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
        // check for unescaped dollar sign 
        if (line[i] === '$' && (i === 0 || line[i - 1] !== '\\')) {
            if (i + 1 < line.length && line[i + 1] === '$') {
                // Double dollar - display math
                dollarPositions.push({ pos: i, type: 'double' });
                i += 2;
            } else {
                // Single dollar - inline math
                dollarPositions.push({ pos: i, type: 'single' }); // dollar Position  
                i += 1;
            }
        } else {
            i += 1;
        }
    }

    // Finds all valid inline math patterns by dollar positions  
    const inlineMathRanges: Array<{ start: number, end: number }> = [];
    for (let j = 0; j < dollarPositions.length - 1; j++) {
        const current = dollarPositions[j];
        const next = dollarPositions[j + 1];
        if (current.type === 'single' && next.type === 'single') {
            // Check if both positions are outside code blocks
            if (isInCodeBlock(current.pos) || isInCodeBlock(next.pos)) continue;
            // match the math pattern 
            const content = line.substring(current.pos, next.pos + 1); 
            if (content.match(inlineMathPattern)) {
                // only add if it's a inline math pattern  
                inlineMathRanges.push({ start: current.pos, end: next.pos });
                j++; // Skip the next position as it's already paired
            }
        }
    }

    // Find citations within valid inline math ranges
    const matches: Array<{
        mathStart: number,
        mathEnd: number,
        content: string,
        citations: string[]
    }> = [];
    for (const mathRange of inlineMathRanges) {
        // this has been a valid math content checked
        const mathContent = line.substring(mathRange.start + 1, mathRange.end); // +1 to skip opening $
        const match = matchNestedCitation(mathContent, prefix);  
        // Check for exactly one \ref{} in this math expression
        
        if (match) {
            const citations = match.label.split(',').map(c => c.trim()).filter(c => c.length > 0);
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
            combineContinuousCitationTags(
                citations,
                rangeSymbol,
                validDelimiters,
                fileDelimiter
            );

        // Generates replacement HTML
        const replacement = generateCitationSpans(
            combinedCitations, fileDelimiter, multiCitationDelimiter, citationFormat, spanStyles
        );
        // Performs replacement
        result = result.substring(0, mathStart) + replacement + result.substring(mathEnd);
    });
    return result;
}


/**
 * Default styles for PDF print citations
 */
const DEFAULT_CONTAINER_STYLE = 'cursor: default;';
const DEFAULT_CITATION_STYLE = 'text-decoration: none; cursor: pointer;';

/**
 * Generates span tags for citations
 */
export function generateCitationSpans(
    citations: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ',',
    citationFormat = '(#)',
    spanStyles = {} as SpanStyles
): string {
    const spans = citations.map((citation, index) => {
        const { local, crossFile } = splitFileCitation(citation, fileDelimiter);
        const citationColorInPdf = spanStyles.citationColorInPdf || '#000000';

        // Combine default styles with color
        const containerStyle = escapeString(
            DEFAULT_CONTAINER_STYLE + ` color: ${citationColorInPdf};`,
            "\""
        );

        const citationStyle = escapeString(
            DEFAULT_CITATION_STYLE + ` color: ${citationColorInPdf};`,
            "\""
        );
        let result = `<span style="${containerStyle}">` + citationFormat.replace('#', `<span style="${citationStyle}">${local}</span>`);
        result += '</span>';
        if (crossFile) {
            result += `${'[^' + crossFile + ']'}`;
        } 

        return result;
    });
    return spans.join(multiCitationDelimiter + ' '); // Joins all spans with comma separator
}


///////////////////////// Auto Complete Functions  //////////////////// 
export function extractAutoCompleteInputTag(content: string, delimiter: string): string {
    if (!content) return "";
    const cleanedContent = content.trim();
    if (/\s$/.test(content) || cleanedContent.endsWith(delimiter)) {
        return ""; // Do not autocomplete if the user is typing a delimiter ","
    }
    const allTags = content.split(delimiter);
    if (allTags.length === 0) {
        return "";
    }
    const lastTag = allTags[allTags.length - 1].trim();  // Get the last tag
    return lastTag;
}
