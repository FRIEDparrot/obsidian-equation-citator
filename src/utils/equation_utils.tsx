/// This file contains utility functions for working with equations tag 
/// and also process equation blocks 
export default interface EquationMatch {
    raw: string;
    start: number;  
    end: number;
    lineStart: number;
    lineEnd: number;
    tag?: string;
}

/**
 * 
 * @param equation 
 * @returns 
 */
export function trimEquationRaw(equation: string) {
    // Remove $$ from start/end (without breaking internal content) 
    return equation.replace(/^\s*\$\$\s*/, "").replace(/\s*\$\$\s*$/, "");
}

export function getEquationNumber(eqn:  string) {
    const match = /tag\{\s*([A-Za-z0-9-.]+)\s*\}/.exec(eqn);  
    if (match && match[1]) {
        return match[1];
    }
}

export function clearEquationTag(equation: string) {
    return equation.replace(/\\tag\{.*?\}/g, ''); 
}

/**
 * This will also remove the \n before the tag if any
 * @param rawEquationLines 
 * @returns 
 */
export function normalizeEquationBlock(rawEquationLines: string[]): string {
    let concatenated = rawEquationLines.join("\n");
    concatenated = concatenated.replace(/^\s*\$\$\s*/, "");
    concatenated = concatenated.replace(/\s*\$\$\s*$/, "");
    return clearEquationTag(concatenated);
}


export function findEquationWithTag(content: string, tag: string): EquationMatch | undefined {
    
}


