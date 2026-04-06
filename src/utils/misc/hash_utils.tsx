import { EquationMatch } from "@/utils/parsers/equation_parser";
import { PanelItem, getItemLineRange } from "@/ui/panels/equationManagePanel/panelItemTypes";

export function fnv1aHash(str: string): number {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.codePointAt(i) ?? 0;
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
        hash ^= (str.codePointAt(i) ?? 0 | (str.codePointAt(i + 1) ?? 0 << 8) |
            (str.codePointAt(i + 2) ?? 0 << 16) | (str.codePointAt(i + 3) ?? 0 << 24));
        hash = (hash * 0x01000193) >>> 0;
        i += 4;
    }
    while (i < len) {
        hash ^= str.codePointAt(i) ?? 0;
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
        const chr = str.codePointAt(i) ?? 0;
        hash = ((hash << 5) - hash) + chr;
        hash = Math.trunc(hash); // convert to 32bit int
    }
    return hash.toString();
}

export function hashPanelItems(items: PanelItem[]): string {
    const str = items.map(item => {
        const lineRange = getItemLineRange(item);
        return `${item.type}|${item.data.raw}|${lineRange.lineStart}|${lineRange.lineEnd}`;
    }).join(";");
    // simple hash function for browsers:
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.codePointAt(i) ?? 0;
        hash = ((hash << 5) - hash) + chr;
        hash = Math.trunc(hash); // convert to 32bit int
    }
    return hash.toString();
}