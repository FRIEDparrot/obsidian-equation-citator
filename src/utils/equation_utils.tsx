import { escapeRegExp, updateCodeBlockState, parseMarkdownLine } from "@/utils/string_utils";

/// This file contains utility functions for working with equations tag 
/// and also process equation blocks 

export interface EquationMatch {
    raw: string;
    content: string;
    lineStart: number;
    lineEnd: number;
    tag?: string;
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
 * Trims the raw equation to content (without $$)  
 * @param equation 
 * @returns 
 */
export function trimEquationRaw(equation: string) {
    // Remove $$ from start/end (without breaking internal content)
    return equation.replace(/^\s*\$\$\s*/, "").replace(/\s*\$\$\s*$/, "").trim();
}

/**
 * Concatenates and trim the equation block lines 
 * @param rawEquationLines 
 * @returns 
 */
export function trimEquationsBlock(rawEquationLines: string[]): string {
    const concatenated = rawEquationLines.join("\n");
    return trimEquationRaw(concatenated);
}

/**
 * Extracts the equation number from the \tag{} label (if any)
 * @param eqn 
 * @returns 
 */
export function getEquationTag(eqn: string): string | undefined {
    const match = /\\tag\{\s*([^}]+)\s*\}/.exec(eqn);
    if (match && match[1].trim()) {
        return match[1].trim();
    }
    return undefined;
}

/**
 * Removes the \tag{} label from the equation content
 * @param equation 
 * @returns 
 */
export function clearEquationTag(equation: string) {
    return equation.replace(/\\tag\{.*?\}/g, '');
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
        if (parseResult.isCodeBlockToggle) {
            const codeBlockMatches = parseResult.processedContent.match(/```/g);
            inCodeBlock = updateCodeBlockState(inCodeBlock, codeBlockMatches);
        }

        if (inCodeBlock) continue;

        // Handle multi-line equation blocks
        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim());
            
            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
                const rawContent = equationBuffer.join('\n');
                const normalizedEquation = trimEquationsBlock(equationBuffer);
                const tag = getEquationTag(normalizedEquation);

                equations.push({
                    raw: rawContent,
                    content: normalizedEquation,
                    lineStart: equationStartLine,
                    lineEnd: lineNum,
                    tag: tag,
                    inQuote: startLineInQuote
                });
                equationBuffer = [];
            }
            continue;
        }

        // Handle single-line equations
        if (parseResult.isSingleLineEquation && parseResult.singleLineEquationMatch) {
            const rawEquationContent = parseResult.singleLineEquationMatch[1].trim();
            const tag = getEquationTag(rawEquationContent);
            const cleanedContent = trimEquationRaw(rawEquationContent);

            equations.push({
                raw: parseResult.cleanedLine.trim(),
                content: cleanedContent,
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
        const normalizedEquation = trimEquationsBlock(equationBuffer);
        const tag = getEquationTag(normalizedEquation);
        
        equations.push({
            raw: rawContent,
            content: normalizedEquation,
            lineStart: equationStartLine,
            lineEnd: lines.length - 1,
            tag: tag,
            inQuote: startLineInQuote 
        });
    }
    return equations; 
}

