import { parseMarkdownLine } from "@/utils/string_utils";
import { escapeRegExp, createEquationTagRegex, isCodeBlockToggle } from "@/utils/regexp_utils";

/// This file contains utility functions for working with equations tag 
/// and also process equation blocks 

interface EquationParseResult {
    content: string;   // content without tag and $$ 
    contentWithTag: string;
    tag?: string;
}

/// !TODO: REFACTOR CLASS  
export interface EquationMatch extends EquationParseResult {
    raw: string;
    lineStart: number;
    lineEnd: number;
    inQuote: boolean;
}

/**
 * Checks if an equation part uses only valid delimiters.
 * Note : this function is never used
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
 * Parses the tag label and content from the equation content 
 * @param eqn : Raw equation block with $$ $$ bracket, also can have no $$ bracket 
 * @returns 
 */
export function parseEquationTag(eqn: string): EquationParseResult {
    // Remove $$ if present 
    const contentWithTag = eqn.replace(/^\s*\$\$\s*/, "").replace(/\s*\$\$\s*$/, "").trim();
    const pattern = createEquationTagRegex(false, null); 
    const match = contentWithTag.match(pattern);   // only match first tag 
    // trim equations 
    const content = contentWithTag.replace(pattern, '').trim();
    return {
        content,
        contentWithTag,
        tag: match?.[1]?.trim() || undefined
    };
}

/**
 * Extracts the last number from a tag using valid delimiters or direct letter-number pattern
 * input : pure tag   (e.g., "1.1.1"), not contain file citation (e.g., "2^1.1.1")
 */
export function extractLastNumberFromTag(tag: string, validDelimiters: string[]): number | null {
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
export function extractPrefixBeforeLastNumber(tag: string, validDelimiters: string[]): string {
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
 * Parses all equation blocks in markdown content
 * Supports:
 * - Single-line equation blocks: $$ equation $$
 * - Multi-line equation blocks
 * - Equations in quote blocks/callouts
 * - Equations with \tag{} labels
 * - Properly handles code blocks (including those in quotes)
 * - Ignores inline code blocks with backticks
 * 
 * @param markdown - The markdown content to parse
 * @returns Array of EquationMatch objects
 */
export function parseEquationsInMarkdown(markdown: string, parseQuotes = true): EquationMatch[] {
    if (!markdown.trim()) return [];
    const lines = markdown.split('\n');

    let inCodeBlock = false;
    let inEquationBlock = false;
    let startLineInQuote = false;
    let equationStartLine = 0;
    let equationBuffer: string[] = [];
    const equations: EquationMatch[] = [];
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);

        // Update code block state
        if (parseResult.isCodeBlockToggle) inCodeBlock = !inCodeBlock;
        if (inCodeBlock) continue;
        
        // Handle multi-line equation blocks
        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim()); 
            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
                const rawContent = equationBuffer.join('\n');
                const { contentWithTag, content, tag } = parseEquationTag(rawContent);

                equations.push({
                    raw: rawContent,
                    content,
                    contentWithTag,
                    lineStart: equationStartLine,
                    lineEnd: lineNum,
                    tag: tag,
                    inQuote: startLineInQuote
                });
                equationBuffer = [];
            }
            continue;
        }

        // Handle single-line equation blocks 
        if (parseResult.isSingleLineEquation && parseResult.singleLineEquationMatch) {
            const rawEquationContent = parseResult.singleLineEquationMatch[1].trim();
            const { contentWithTag, content, tag } = parseEquationTag(rawEquationContent);

            equations.push({
                raw: parseResult.cleanedLine.trim(),
                content: content,
                contentWithTag: contentWithTag,
                lineStart: lineNum,
                lineEnd: lineNum,
                tag: tag,
                inQuote: parseResult.inQuote
            });
            continue;
        }

        // Check for start of multi-line equation block
        if (parseResult.isEquationBlockStart) {
            inEquationBlock = true;
            equationStartLine = lineNum;
            equationBuffer.push(parseResult.cleanedLine.trim());
            startLineInQuote = parseResult.inQuote;
            continue;
        }
    }

    // Handle unclosed equation blocks
    if (inEquationBlock && equationBuffer.length > 0) {
        const rawContent = equationBuffer.join('\n');
        const { contentWithTag, content, tag } = parseEquationTag(rawContent);

        equations.push({
            raw: rawContent,
            content: content,
            contentWithTag: contentWithTag,
            lineStart: equationStartLine,
            lineEnd: lines.length - 1,
            tag: tag,
            inQuote: startLineInQuote
        });
    }
    return equations;
}

/**
 * Parse the first equation with the given tag in the markdown content (always parse quotes)
 * @param markdown - The markdown content to parse
 * @param tag - The tag to search for (without \tag{} wrapper)
 * @returns The first EquationMatch with the matching tag, or undefined if not found
 */
export function parseFirstEquationInMarkdown(markdown: string, tag: string): EquationMatch | undefined {
    if (!markdown.trim() || !tag.trim()) return undefined;

    const lines = markdown.split('\n');

    let inCodeBlock = false;
    let inEquationBlock = false;
    let startLineInQuote = false;
    let equationStartLine = 0;
    let equationBuffer: string[] = [];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const parseResult = parseMarkdownLine(line, true, inCodeBlock);
        // Update code block state
        if (parseResult.isCodeBlockToggle) {
            const processedContent = parseResult.processedContent.trim();
            if (isCodeBlockToggle(processedContent)) {
                inCodeBlock = !inCodeBlock; 
            }
        }
        if (inCodeBlock) continue;

        // Handle multi-line equation blocks
        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim());

            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
                const rawContent = equationBuffer.join('\n');
                const { contentWithTag, content, tag: eqTag } = parseEquationTag(rawContent);

                // Check if this equation has the target tag
                if (eqTag === tag) {
                    return {
                        raw: rawContent,
                        content: content,
                        contentWithTag: contentWithTag,
                        lineStart: equationStartLine,
                        lineEnd: lineNum,
                        tag: eqTag,
                        inQuote: startLineInQuote
                    };
                }
                equationBuffer = [];
            }
            continue;
        }

        // Handle single-line equation blcoks 
        if (parseResult.isSingleLineEquation && parseResult.singleLineEquationMatch) {
            const rawEquationContent = parseResult.singleLineEquationMatch[1].trim();
            const { contentWithTag, content, tag: eqTag } = parseEquationTag(rawEquationContent);

            // Check if this equation has the target tag
            if (eqTag === tag) {
                return {
                    raw: parseResult.cleanedLine.trim(),
                    content,
                    contentWithTag,
                    lineStart: lineNum,
                    lineEnd: lineNum,
                    tag: eqTag,
                    inQuote: parseResult.inQuote
                };
            }
            continue;
        }

        // Check for start of multi-line equation block
        if (parseResult.isEquationBlockStart) {
            inEquationBlock = true;
            equationStartLine = lineNum;
            equationBuffer.push(parseResult.cleanedLine.trim());
            startLineInQuote = parseResult.inQuote;
            continue;
        }
    }

    // Handle unclosed equation blocks
    if (inEquationBlock && equationBuffer.length > 0) {
        const rawContent = equationBuffer.join('\n');
        const { contentWithTag, content, tag: eqTag } = parseEquationTag(rawContent);

        // Check if this unclosed equation has the target tag
        if (eqTag === tag) {
            return {
                raw: rawContent,
                content,
                contentWithTag,
                lineStart: equationStartLine,
                lineEnd: lines.length - 1,
                tag: eqTag,
                inQuote: startLineInQuote
            };
        }
    }
    return undefined;
}