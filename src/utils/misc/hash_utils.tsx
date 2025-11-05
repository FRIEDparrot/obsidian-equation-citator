import { EquationMatch } from "@/utils/parsers/equation_parser";

export function fnv1aHash(str: string): number {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0; // FNV prime
    }
    return hash;
}

/**
 * faster hash version than fnv1aHash
 */
export function fastHash(str: string): number {
    let hash = 0x811c9dc5;
    let i = 0;
    const len = str.length; 
    // process 4 bytes at a time  
    while (i + 3 < len) {
        hash ^= (str.charCodeAt(i) | (str.charCodeAt(i + 1) << 8) |
            (str.charCodeAt(i + 2) << 16) | (str.charCodeAt(i + 3) << 24));
        hash = (hash * 0x01000193) >>> 0;
        i += 4;
    }
    while (i < len) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
        i++;
    }
    return hash; 
}


export function hashEquations(equations: EquationMatch[]): string {
    const str = equations.map(eq =>
        `${eq.raw}|${eq.lineStart}|${eq.lineEnd}|${eq.inQuote}`
    ).join(";");
    // simple hash function for browsers:
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // convert to 32bit int
    }
    return hash.toString();
}