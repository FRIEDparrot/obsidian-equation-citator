import { removeBraces, removeInlineCodeBlocks } from "@/utils/string_processing/string_utils";
import { isCodeBlockToggle, matchCitationsInLine } from "@/utils/string_processing/regexp_utils";
import { extractLastNumberFromTag, extractPrefixBeforeLastNumber } from "@/utils/parsers/equation_parser";

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
            if (num === null) {
                // non-numeric tag, add as is  
                const formatted = formatTag(local);
                if (!seenTags.has(formatted)) {
                    result.push({ combinedTag: formatted, order });
                    seenTags.add(formatted);
                }
            } else {
                const prefix = extractPrefixBeforeLastNumber(local, validDelimiters);
                if (!numericGroups[prefix]) numericGroups[prefix] = [];
                numericGroups[prefix].push({ local, num, order });
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
        .toSorted((a, b) => a.order - b.order)
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
        const endNum = Number.parseInt(afterRange, 10);

        if (startNum === null || Number.isNaN(endNum) || startNum > endNum) {
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
    const num = Number.parseInt(numStr, 10);
    return Number.isNaN(num) ? null : num;
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
    const lastTag = allTags.at(-1)?.trim() || "";  // Get the last tag
    return lastTag;
}
