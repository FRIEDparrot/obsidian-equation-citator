

export const DISABLED_DELIMITER = `§¶∞&#&@∸∹≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≇≈≉≊≋≌≍≎≏⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱`

/** Change string RegExp to RegExp literal */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// escapeString.ts
export function escapeString(str: string, quoteType: '"' | "'" = '"'): string {
    // eslint-disable-next-line no-control-regex
    const quoteRegex = quoteType === '"' ? /["\\\b\f\n\r\t\v\x00-\x1F\x7F-\x9F]/g : /['\\\b\f\n\r\t\v\x00-\x1F\x7F-\x9F]/g;

    return str.replace(quoteRegex, (char: string) => {
        switch (char) {
            case '\\': return '\\\\';
            case '"': return quoteType === '"' ? '\\"' : '"';
            case "'": return quoteType === "'" ? "\\'" : "'";
            case '\b': return '\\b';
            case '\f': return '\\f';
            case '\n': return '\\n';
            case '\r': return '\\r';
            case '\t': return '\\t';
            case '\v': return '\\v';
            default: return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
        }
    });
}

export function validateDelimiter(delimiter: string): boolean {
    // only allow special characters as delimiters  
    return /^[^a-zA-Z0-9\s]+$/.test(delimiter);
}

export function validLetterPrefix(prefix: string): boolean {
    return /^[a-zA-Z]+$/.test(prefix);
}

export function validateEquationDisplayFormat(format: string): boolean {
    // must contain only one `#` symbol
    return format.split("#").length === 2;
}

export function removeInlineCodeBlocks(line: string): string {
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

export interface QuoteLineMatch {
    content: string;
    quoteDepth: number;
    isQuote: boolean;
}

export function processQuoteLine(line: string): QuoteLineMatch {
    // Match quote pattern: any combination of spaces and > markers
    const quoteMatch = line.match(/^(\s*(?:>\s*)+)(\[![^\]]*\])?\s*(.*)/);

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

export function updateCodeBlockState(inCodeBlock: boolean, codeBlockMatches: RegExpMatchArray | null): boolean {
    if (codeBlockMatches) {
        let newState = inCodeBlock;
        // Toggle for each ``` found
        for (let i = 0; i < codeBlockMatches.length; i++) {
            newState = !newState;
        }
        return newState;
    }
    return inCodeBlock;
}

export interface MarkdownLineEnvironment {
    processedContent: string; // Processed line content with quotes and code blocks removed
    inQuote: boolean;    // Whether the line is inside a quote block (redundant with quoteDepth) 
    quoteDepth: number;  // Depth of the quote block 
    isHeading: boolean;
    headingMatch?: RegExpMatchArray | null;
    isCodeBlockToggle: boolean;
    isSingleLineEquation: boolean;
    singleLineEquationMatch?: RegExpMatchArray | null;
    isEquationBlockStart: boolean;
    isEquationBlockEnd: boolean;
    cleanedLine: string;   // Cleaned line with inline code blocks also removed
}

/**
 * Parse the 
 * @param line 
 * @param parseQuotes 
 * @param inCodeBlock 
 * @returns 
 */
export function parseMarkdownLine(
    line: string,
    parseQuotes = true,
    inCodeBlock = false
): MarkdownLineEnvironment {
    const headingRegex = /^(#{1,6})\s+(.*)$/;
    const singleLineEqRegex = /^\s*\$\$(?!\$)([\s\S]*?)(?<!\$)\$\$\s*$/;
    
    // Process quote line to extract content and quote depth
    const { content: processedContent, quoteDepth, qt: inQuote } = parseQuotes
        ? (() => {
            const { content, quoteDepth , isQuote } = processQuoteLine(line);
            return { content, quoteDepth: quoteDepth, qt: isQuote };
        })()
        : { content: line.trim(), quoteDepth: 0, qt: false };

    // Handle code blocks - check for ``` anywhere in the line
    const codeBlockMatches = /^\s*(?:>+\s*)*```/.test(line) ? processedContent.match(/```/g) : null;
    const isCodeBlockToggle = !!codeBlockMatches;

    // If we're in code block, return early with minimal processing
    if (inCodeBlock && !isCodeBlockToggle) {
        return {
            processedContent,
            inQuote,
            quoteDepth,
            isHeading: false,
            isCodeBlockToggle: false,
            isSingleLineEquation: false,
            isEquationBlockStart: false,
            isEquationBlockEnd: false,
            cleanedLine: processedContent
        };
    }

    // Clean inline code blocks before further processing
    const cleanedLine = removeInlineCodeBlocks(processedContent);

    // Check for heading
    const headingMatch = cleanedLine.match(headingRegex);
    const isHeading = !!headingMatch;

    // Check for single-line equation
    const singleLineEquationMatch = cleanedLine.match(singleLineEqRegex);
    const isSingleLineEquation = !!singleLineEquationMatch;

    // Check for multi-line equation block start/end
    const trimmedLine = cleanedLine.trim();
    const isEquationBlockStart = trimmedLine.startsWith("$$") && !trimmedLine.startsWith("$$$");
    const isEquationBlockEnd = trimmedLine.endsWith("$$") && !trimmedLine.endsWith("$$$");

    return {
        processedContent,
        inQuote,
        quoteDepth,
        isHeading,
        headingMatch,
        isCodeBlockToggle,
        isSingleLineEquation,
        singleLineEquationMatch,
        isEquationBlockStart,
        isEquationBlockEnd,
        cleanedLine
    };
}