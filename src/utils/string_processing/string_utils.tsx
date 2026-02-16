import { isCodeBlockToggle as isCbToggle, headingRegex, singleLineEqBlockPattern, equationBlockStartPattern, equationBlockEndPattern } from "@/utils/string_processing/regexp_utils";

export const DISABLED_DELIMITER = `§¶∞&#&@∸∹≑≒≓≌≍≎≏⋤⋥≔≕≖≗≘≙≚≛≜≝≞≟≠≇≈≉≊≋⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱`

// escapeString.ts
export function escapeString(str: string, quoteType: '"' | "'" = '"'): string {
    
    const quoteRegex =
        quoteType === '"'
            ? /["\\\b\f\n\r\t\v]/g
            : /['\\\b\f\n\r\t\v]/g;
    return str.replace(quoteRegex, (char: string) => {
        switch (char) {
            case '\\': return '\\\\';
            case '"': return quoteType === '"' ? String.raw`\"` : '"';
            case "'": return quoteType === "'" ? String.raw`\'` : "'";
            case '\b': return String.raw`\b`;
            case '\f': return String.raw`\f`;
            case '\n': return String.raw`\n`;
            case '\r': return String.raw`\r`;
            case '\t': return String.raw`\t`;
            case '\v': return String.raw`\v`;
            default: 
                return String.raw`\u${char.codePointAt(0)!.toString(16).padStart(4, '0')}`;
        }
    });
}

export function validateDelimiter(delimiter: string): boolean {
    // only allow special characters as delimiters. disallow unsafe characters { }, $ 
    if (!(/^[^a-zA-Z0-9\s]+$/.test(delimiter))) return false;
    if (/[{}$]/.test(delimiter)) return false;
    return true;
}

export function validateLetterPrefix(prefix: string): boolean {
    return /^[a-zA-Z]+$/.test(prefix);
}

export function validateDisplayFormat(format: string): boolean {
    // must contain only one `#` symbol
    return format.split("#").length === 2;
}

/**
 * Removes inline code blocks, by replacing it with spaces, 
 *            specifically for math environment detection 
 * Also this will not change the location of the matched content
 * Correctly handles escaped backticks
 */
export function removeInlineCodeBlocks(line: string): string {
    let result = '';
    let inCodeBlock = false;
    let i = 0;

    while (i < line.length) {
        if (line[i] === '`') {
            // Check if it's escaped
            let escapeCount = 0;
            let j = i - 1;
            while (j >= 0 && line[j] === '\\') {
                escapeCount++;
                j--;
            }

            // If the number of backslashes is even (including 0), the backtick is not escaped
            if (escapeCount % 2 === 0) {
                inCodeBlock = !inCodeBlock;
                result += ' '; // Replace backtick with space
            } else {
                // Escaped backtick, keep as is
                result += line[i];
            }
        } else if (inCodeBlock) {
            // Replace code block content with spaces
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
 * Removes all braces {} and extract the content in braces from the content  
 * @param content 
 * @returns 
 */
export function removeBraces(content: string) {
    // Remove all braces { and } 
    return content.replaceAll(/[{}]/g, '');
}

export function removePairedBraces(content: string): string {
    let cnt = 0;
    const result: string[] = [];
    for (const char of content) {
        if (char === '{') {
            cnt++;
            continue;
        }
        if (char === '}' && cnt > 0) {
            cnt--;
            continue;
        }
        result.push(char);
    }
    return result.join('');
}

/**
 * Determines if the specified position is within a Markdown inline code environment
 * Code environment definition: Surrounded by unescaped ` symbols
 * Example: `code` is an inline code block, while \`code` is not
 * 
 * @param line - The line to check
 * @param pos - The position to check (character index)
 * @returns Returns true if the position is within an inline code environment, otherwise false
 */
export function isInInlineCodeEnvironment(line: string, pos: number): boolean {
    // Boundary check
    if (pos < 0 || pos > line.length) {
        return false;
    }

    let inCodeBlock = false;
    let codeBlockStart = -1;
    let codeBlockEnd = -1;
    let i = 0;

    while (i < line.length) {
        if (line[i] === '`') {
            // Check if it's escaped
            let escapeCount = 0;
            let j = i - 1;
            while (j >= 0 && line[j] === '\\') {
                escapeCount++;
                j--;
            }
            // If the number of backslashes is even (including 0), the backtick is not escaped
            if (escapeCount % 2 === 0) {
                if (inCodeBlock) {
                    // End of code block
                    codeBlockEnd = i - 1; // Position before closing backtick
                    // Check if our position is within this code block
                    if (pos >= codeBlockStart && pos <= codeBlockEnd) {
                        return true;
                    }
                    inCodeBlock = false;
                } else {
                    // Start of code block
                    codeBlockStart = i + 1; // Position after opening backtick
                    inCodeBlock = true;
                }
            }
        }
        i++;
    }
    // Check if we're still in a code block at the end (unclosed)
    if (inCodeBlock && pos >= codeBlockStart) {
        return true;
    }

    return false;
}

/**
 * Determines if the specified position is within a Markdown inline math environment
 * Math environment definition: Surrounded by unescaped $ symbols, with $ adjacent to non-whitespace characters
 * Example: $123$ is a formula, while $ 123$ and $123 $ are not formulas
 * 
 * @param line - The line to check
 * @param pos - The position to check (character index)
 * @returns Returns true if the position is within a math environment, otherwise false
 */
export function isInInlineMathEnvironment(line: string, pos: number): boolean {
    // Boundary check
    if (pos < 0 || pos > line.length) {
        return false;
    }
    // First remove code block content, replacing with spaces
    const lineWithoutCodeBlocks = removeInlineCodeBlocks(line);
    // Find all valid math environment ranges
    const mathRanges = findValidMathRanges(lineWithoutCodeBlocks);
    // Check if the position is within any math environment range
    return mathRanges.some(range => pos >= range.start && pos <= range.end);
}


/**
 * Finds all valid math environment ranges
 * Correctly handles escape characters
 */
function findValidMathRanges(line: string): Array<{ start: number, end: number }> {
    const ranges: Array<{ start: number, end: number }> = [];
    let i = 0;

    while (i < line.length) {
        // Look for $ symbol
        if (line[i] === '$') {
            // Check if it's escaped
            let escapeCount = 0;
            let j = i - 1;
            while (j >= 0 && line[j] === '\\') {
                escapeCount++;
                j--;
            }

            // If the number of backslashes is odd, the $ is escaped, skip
            if (escapeCount % 2 === 1) {
                i++;
                continue;
            }

            const startPos = i;
            i++; // Skip the opening $

            // Check if $ is immediately followed by non-whitespace character
            if (i >= line.length || /\s/.test(line[i])) {
                // $ is followed by whitespace or end of line, not a valid math environment start
                continue;
            }

            // Look for matching closing $
            let foundEnd = false;
            while (i < line.length) {
                if (line[i] === '$') {
                    // Check if closing $ is escaped
                    let endEscapeCount = 0;
                    let k = i - 1;
                    while (k >= 0 && line[k] === '\\') {
                        endEscapeCount++;
                        k--;
                    }

                    // If closing $ is not escaped
                    if (endEscapeCount % 2 === 0) {
                        // Check if $ is immediately preceded by non-whitespace character
                        if (i > startPos + 1 && !/\s/.test(line[i - 1])) {
                            // Found valid closing $
                            ranges.push({
                                start: startPos + 1, // Excluding opening $
                                end: i                // Excluding closing $
                            });
                            foundEnd = true;
                        }
                        i++; // Skip closing $
                        break;
                    }
                }
                i++;
            }

            if (!foundEnd) {
                // No matching closing $ found, continue searching
                continue;
            }
        } else {
            i++;
        }
    }

    return ranges;
}

/**
 * Finds the last unescaped dollar symbol in the line before the specified position 
 * @param line 
 * @param pos 
 * @returns 
 */
export function findLastUnescapedDollar(line: string, pos: number): number {
    for (let i = pos - 1; i >= 0; i--) {
        if (line[i] === '$') {
            // check whether it's escaped
            let backslashes = 0;
            let j = i - 1;
            // avoid the case of esaped `\`
            while (j >= 0 && line[j] === '\\') {
                backslashes++;
                j--;
            }
            if (backslashes % 2 === 0) {
                return i; // found unescaped $
            }
        }
    }
    return -1;
}

export interface QuoteLineMatch {
    content: string;
    quoteDepth: number;
    isQuote: boolean;
}

export function processQuoteLine(line: string): QuoteLineMatch {
    // Match quote pattern: any combination of spaces and > markers
    const quoteMatch = new RegExp(/^(\s*(?:>\s*)+)(\[![^\]]*\])?\s*(.*)/).exec(line);

    if (quoteMatch) {
        const fullQuoteMarkers = quoteMatch[1];
        const callout = quoteMatch[2] || '';
        const content = (quoteMatch[3] || '').trim();

        // Count actual > characters while ignoring spaces
        const quoteDepth = (fullQuoteMarkers.match(/>/g) || []).length;

        return {
            content: callout ? `${callout} ${content}` : content,
            quoteDepth: quoteDepth,
            isQuote: quoteDepth > 0
        };
    }

    return {
        content: line.trim(),
        quoteDepth: 0,
        isQuote: false
    }
}

export interface MarkdownLineEnvironment {
    processedContent: string; // Processed line content with quotes and code blocks removed
    inQuote: boolean;    // Whether the line is inside a quote block (redundant with quoteDepth)
    quoteDepth: number;  // Depth of the quote block
    isHeading: boolean;
    headingMatch?: RegExpMatchArray | null;
    isCodeBlockToggle: boolean;
    isSingleLineEquation: boolean;  // single-line equation block
    singleLineEquationMatch?: RegExpMatchArray | null;
    isEquationBlockStart: boolean;
    isEquationBlockEnd: boolean;
    isImage: boolean;    // Whether the line is an image (starts with !)
    cleanedLine: string;   // Cleaned line with inline code blocks also removed
}

/**
 * Parse the 
 * @param line 
 * @param parseQuotes whether to remove quote in lines before processing.
 * @param inCodeBlock 
 * @returns 
 */
export function parseMarkdownLine(
    line: string,
    parseQuotes = true,
    inCodeBlock = false
): MarkdownLineEnvironment {
    // Process quote line to extract content and quote depth
    const { content: processedContent, quoteDepth, isQuote } = parseQuotes
        ? processQuoteLine(line) 
        : { content: line.trim(), quoteDepth: 0, isQuote: false };

    // Handle code blocks 
    const isCodeBlockToggle = isCbToggle(processedContent);

    // If we're in code block, return early with minimal processing
    if (inCodeBlock && !isCodeBlockToggle) {
        return {
            processedContent,
            inQuote: isQuote,
            quoteDepth,
            isHeading: false,
            isCodeBlockToggle: false,
            isSingleLineEquation: false,
            isEquationBlockStart: false,
            isEquationBlockEnd: false,
            isImage: false,
            cleanedLine: processedContent
        };
    }

    // Clean inline code blocks before further processing
    const cleanedLine = removeInlineCodeBlocks(processedContent);

    // Check for heading
    const headingMatch = new RegExp(headingRegex).exec(cleanedLine);
    const isHeading = !!headingMatch;


    // Check for single-line equation
    const singleLineEquationMatch = new RegExp(singleLineEqBlockPattern).exec(cleanedLine);
    const isSingleLineEquation = Boolean(singleLineEquationMatch);

    // Check for multi-line equation block start/end
    const trimmedLine = cleanedLine.trim();
    const isEquationBlockStart = equationBlockStartPattern.test(trimmedLine);
    const isEquationBlockEnd = equationBlockEndPattern.test(trimmedLine);
    
    // Check if line is an image (starts with !)
    const isImage = trimmedLine.startsWith('!');

    return {
        processedContent,
        inQuote: isQuote,
        quoteDepth,
        isHeading,
        headingMatch,
        isCodeBlockToggle,
        isSingleLineEquation,
        singleLineEquationMatch,
        isEquationBlockStart,
        isEquationBlockEnd,
        isImage,
        cleanedLine
    };
}export function containSafeCharAndNotBlank(s: string): boolean {
    // disallow unsafe characters { }, $  and white space
    return !(s.includes("{") || s.includes("}") || s.includes("$")) && s.trim().length > 0;
}

