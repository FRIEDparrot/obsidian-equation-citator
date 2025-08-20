export const headingRegex = /^(#{1,6})\s+(.*)$/;

/** Change string RegExp to RegExp literal */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * This file Manages the regular expressions used in the plugin. 
 */
export const codeBlockStartRegex = /^\s*(?:>+\s*)*```/

/**
 * Test if a line is a code block toggle  
 * @param line 
 * @returns 
 */
export function isCodeBlockToggle(line: string): boolean {
    const codeBlockMatches = codeBlockStartRegex.test(line) ? line.match(/```/g) : null;
    return Boolean(codeBlockMatches && codeBlockMatches.length % 2 === 1);
}

export const footnoteRegex = /^\[(\^[^\]]+)\]:\s*\[\[([^|\]]+)(?:\|([^\]]*))?\]\]/;

/**
 * parse the citation with ref inside the formula 
 * usage :  matches = processedLine.matchAll(inlineRefRegex); (remove inline code blocks first) 
 * const [fullMatch, content, label] = match; 
 */
// export const inlineRefRegex = /(?<!\$)\$(?!\$)(?! )([^$]*?\\ref\{([^}]*)\}[^$]*?)(?<! )\$(?!\$)/g; 
export const inlineMathPattern = /(?<!\\)(?<!\$)\$(?!\$)(?! )((?:\\\$|[^$])*?)(?<! )\$(?!\$)/g;

export const singleLineEqBlockPattern = /^\s*\$\$(?!\$)([\s\S]*?)(?<!\$)\$\$\s*$/; 


export interface RefMatch {
    fullMatch: string; // full match of the regex 
    content: string; // \ref{...} content  
    label: string; // label inside the \ref{} 
    position: {
        start: number;
        end: number;
    }
}

/** 
 * @param citation without bracket, e.g. "\ref{eq:1.3.4}", not with $$ 
 * @param prefix 
 * @returns 
 */
export function isValidCitationForm(
    citation: string,
    prefix: string | null = null,
): {
    valid: boolean;
    index: number;
} {
    // Skip if multiple \ref{} in same formula
    const match = citation.match(/\\ref\{[^}]*\}/g);
    if (!match || match.length !== 1) return { valid: false, index: -1 };

    // Skip if citation does not start with prefix
    if (prefix) {
        // test if there is a \ref{ prefix...} format 
        const referenceStrartRegex = new RegExp(`\\\\ref\\{\\s*${escapeRegExp(prefix)}[^}]*\\}`);
        if (!referenceStrartRegex.test(citation)) return { valid: false, index: -1 }; // not start with prefix
    }
    return { valid: true, index: citation.indexOf(match[0]) };
}

/** Match the label of nested citation in the math block 
 * @param citation inline-math citation content without $$ 
 * @example ****\ref{eq:1^{1.2.3}, 2^{1.3.1~3}}****
 * @returns label or null if not match or bracket not closed correctly 
 */
export function matchNestedCitation(
    citation: string,
    prefix: string | null = null,
): {
    content: string;    // \ref{eq:1^{1.2.3}, 2^{1.3.1~3}} content    
    label: string;      // 1^{1.2.3}, 2^{1.3.1~3} if prefix is `eq:` (remove ref and prefix)
} | null {
    const MAX_INPUT_LENGTH = 1000; // limit citation length to prevent infinite loop 
    const MAX_NESTING_DEPTH = 10; // limit nesting depth to prevent infinite loop
    if (citation.length > MAX_INPUT_LENGTH) return null;

    const { valid, index } = isValidCitationForm(citation, prefix);
    if (!valid) return null;

    const braceIndex = index + 5; // position after \\ref{
    let braceCount = 1;
    let currentIndex = braceIndex;
    let currentDepth = 1; // current depth of nested citation   

    // find the closing bracket  
    while (currentIndex < citation.length) {
        const currentChar = citation[currentIndex];
        if (currentChar === '{') {
            braceCount++;
            currentDepth++;
            if (currentDepth > MAX_NESTING_DEPTH) {
                return null; // Too deeply nested
            }
        } else if (currentChar === '}') {
            braceCount--;
            if (braceCount === 0) {
                // ref{} content  
                const content = citation.substring(index, currentIndex + 1);
                const labelWithPrefix = citation.substring(braceIndex, currentIndex).trim(); // get the label inside the ref{}

                if (prefix && !labelWithPrefix.startsWith(prefix)) return null;
                const label = prefix ? labelWithPrefix.substring(prefix.length).trim() : labelWithPrefix;

                return { content, label }   //  label has been trimmed
            }
            currentDepth--;  // decrease depth 
        }
        currentIndex++;  // move to next character  
    }
    // not find a closing bracket, return null 
    return null;
}

export function matchCitationsInLine(line: string): Array<RefMatch> {
    const results: Array<RefMatch> = [];
    // copy the patter  to avoid modifying the original pattern
    const matches = line.matchAll(inlineMathPattern);

    for (const match of matches) {
        const fullMatch = match[0];
        const raw = match[1];   // not processed content 
        // parse nested citation in the math block
        const refCitation = matchNestedCitation(raw, null);
        if (refCitation !== null) {
            results.push({
                fullMatch: fullMatch,
                content: refCitation.content,
                label: refCitation.label,
                position: {
                    start: match.index,
                    end: match.index + fullMatch.length,
                }
            });
        }
    }
    return results;
}



/**
 * create a citation string 
 * @param prefix 
 * @param content 
 * @returns 
 */
export function createCitationString(
    prefix: string,
    content: string | null = null,
    withDollarBracket = true
): string {
    const eqContent = content || "";
    const citationString = withDollarBracket ? `$\\ref{${prefix}${eqContent}}$` : `\\ref{${prefix}${eqContent}}`;
    return citationString;
}

//////////////////////////// TAGS //////////////////////// 
export function createEquationTagRegex(
    fullMatch = false,
    tagName: string | null = null
): RegExp {
    if (!tagName) {
        return new RegExp(fullMatch ? /^\\tag\{([^}]*)\}$/ : /\\tag\{([^}]*)\}/);
    }
    const escapedTagName = escapeRegExp(tagName);
    return fullMatch ?
        RegExp(`^\\\\tag\\{\\s*${tagName}\\s*\\}$`) :
        RegExp(`\\\\tag\\{\\s*${escapedTagName}\\s*\\}`);
}

export function createEquationTagString(content: string): string {
    const tagString = `\\tag{${content}}`;
    return tagString;
}
