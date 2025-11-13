
/// This file contains utility functions for array manipulation

/**
 * Build the failure function (next array) for KMP algorithm 
 * next[i] represents the length of the longest proper prefix of pattern[0...i] 
 * @param pattern 
 * @returns 
 */
function buildNext<T>(pattern: T[]): number[] {
    const next: number[] = new Array(pattern.length).fill(0);
    // use j to = calculate the next[i]
    let j = 0;
    for (let i = 1; i < pattern.length; i++) {
        while (j > 0 && pattern[i] !== pattern[j]) {
            j = next[j - 1]; // fall back to  correct position
        }
        if (pattern[i] === pattern[j]) {
            j++;  // update j to the next position
        }
        next[i] = j;
    }
    return next;
}

/**
 * Find the location of pattern in target using KMP algorithm 
 * @param pattern    the pattern to find
 * @param target     the target to search in 
 * @returns  the index of the first occurrence of pattern in target, 
 *           if pattern is not found, return -1  
 */
export function find_array<T>(pattern: T[], target: T[]): number {
    const targetLength = target.length;
    const patternLength = pattern.length;
    if (patternLength === 0) {
        return 0;
    }
    else if (patternLength > targetLength) {
        return -1;
    }
    const next = buildNext(pattern); 
    for (let i = 0, j = 0; i < targetLength; i++) {
        while (j > 0 && target[i] !== pattern[j]) {
            j = next[j - 1];
        }
        if (target[i] === pattern[j]) {
            j++;
        }
        if (j === patternLength) {
            return i - patternLength + 1;
        }
    }
    return -1;
}
