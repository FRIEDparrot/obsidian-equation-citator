export const headingRegex = /^(#{1,6})\s+(.*)$/;

/** Change string RegExp to RegExp literal */
export function escapeRegExp(string: string): string {
    return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
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

// 1 : num , 2: text  
export const footnoteRegex = /^\[(\^[^\]]+)\]: (.*)/;

// 1 : num , 2: path, 3: label(optional)  
export const pureFlinkFootnoteRegex = /^\[(\^[^\]]+)\]:\s*\[\[([^|\]]+)(?:\|([^\]]*))?\]\]/; 

// 1 : num , 2: label, 3: url 
export const pureWeblinkFootnoteRegex = /^\[(\^[^\]]+)\]:\s*\[([^\]]+)\]\((\S+?)\)/;

// 1 : num , 2: url 
export const pureBarelinkFootnoteRegex =/^\[(\^[^\]]+)\]:\s*(https?:\/\/\S+)/; 

// Equations block match part (Hint: we dont consider \\$ double escape case since its too malicious)
export const singleLineEqBlockPattern = /^\s*\$\$(?!\$)([\s\S]*?)(?<!\$)\$\$\s*$/; 
export const equationBlockStartPattern = /^\$\$(?!\$)/;
export const equationBlockEndPattern = /(?<!\\)\$\$(?!\$)$/;
export const equationBlockStartPatternWithWhiteSpace = /^\s*(?<!\\)\$\$(?!\$)/;
export const equationBlockEndPatternWithWhiteSpace = /(?<!\\)\$\$(?!\$)\s*$/;
export const equationBlockBracePattern = /(?<!\\)\$\$/g;

/**
 * parse the citation with ref inside the formula 
 * usage :  matches = processedLine.matchAll(inlineRefRegex); (remove inline code blocks first) 
 * const [fullMatch, content, label] = match; 
 */
export const citationRegex = /\\ref\{([^}]*)\}/g;
// export const inlineRefRegex = /(?<!\$)\$(?!\$)(?! )([^$]*?\\ref\{([^}]*)\}[^$]*?)(?<! )\$(?!\$)/g; 
export const inlineMathPattern = /(?<!\\)(?<!\$)\$(?!\$)(?! )((?:\\\$|[^$])*?)(?<!\\)(?<! )\$(?!\$)/g;

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
 * @param prefix if use, only match the citation with the label start with the prefix, e.g. "eq:"
 * @note Citation format : only 1 \ref{} in  equation, and is a inline math format
 * @returns 
 */
export function isValidCitationForm(
    citation: string,
    prefix: string | null = null,
): {
    valid: boolean;
    label: string | null;  // label inside the \ref{} if valid, otherwise null
    index: number;
} {
    // Skip if multiple \ref{} in same formula
    const match = [...citation.matchAll(citationRegex)];
    if (match.length !== 1) return { valid: false, label: null, index: -1 };

    // Skip if citation does not start with prefix
    const label = match[0][1];
    const index = match[0].index ?? -1;  // not use || here (since it overrides 0)
    if (prefix && !label.trim().startsWith(prefix)) {
        return { valid: false, label: null, index: -1 };
    }
    return {
        valid: true,
        label: label.trim(),
        index: index
    };
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
        if (refCitation !== null && match.index!== undefined) {
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
    const citationString = withDollarBracket ? 
        String.raw`$\ref{${prefix}${eqContent}}$` : 
        String.raw`\ref{${prefix}${eqContent}}`;
    return citationString;
}

//////////////////////////// TAGS //////////////////////// 
export function createEquationTagRegex(
    fullMatch = false,
    tagName: string | null = null,
    typst = false,
): RegExp {
    if (!tagName) {
        const typstPattern = fullMatch ? /^#label\("([^"]*)"\)$/ : /#label\("([^"]*)"\)/;
        const latexPattern = fullMatch ? /^\\tag\{([^}]*)\}$/ : /\\tag\{([^}]*)\}/;
        const pattern: RegExp = typst ? new RegExp(typstPattern) : new RegExp(latexPattern);
        return pattern;
    }

    const escapedTagName = escapeRegExp(tagName);

    if (typst) {
        return fullMatch
            ? new RegExp(String.raw`^#label\(\s*"${escapedTagName}"\s*\)$`)
            : new RegExp(String.raw`#label\(\s*"${escapedTagName}"\s*\)`);
    } else {
        return fullMatch
            ? new RegExp(String.raw`^\\tag\{\s*${escapedTagName}\s*\}$`)
            : new RegExp(String.raw`\\tag\{\s*${escapedTagName}\s*\}`);
    }
}

export function createEquationTagString(content: string, typst: boolean): string {
    const tagString = typst ? `#label("${content}")` : String.raw`\tag{${content}}`;
    return tagString;
}
