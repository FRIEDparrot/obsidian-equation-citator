/**
 * This file Manages the regular expressions used in the plugin. 
 */

export const codeBlockStartRegex = /^\s*(?:>+\s*)*```/ 

/**
 * Test if a line is a code block toggle  
 * @param line 
 * @returns 
 */
export function isCodeBlockToggle(line: string) : boolean {
    const codeBlockMatches = codeBlockStartRegex.test(line) ? line.match(/```/g) : null; 
    return Boolean(codeBlockMatches && codeBlockMatches.length % 2 === 1); 
}

export const footnoteRegex = /^\[(\^[^\]]+)\]:\s*\[\[([^|\]]+)(?:\|([^\]]*))?\]\]/; 