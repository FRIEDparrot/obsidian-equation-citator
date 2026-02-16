/**
 * This file contains shared Types, Interfaces and functions for auto numbering 
 * These can be reused for both equations and figures. 
 */

export enum AutoNumberingType {
    Relative = "Relative",
    Absolute = "Absolute"
}

export interface AutoNumberProceedResult {
    md: string;
    tagMapping: Map<string, string>;  // mapping to rename citations 
}


/**
 * AutoNumberingState is used to keep track of the current state of the auto-numbering process, including counters for heading levels and objects, current depth, and configuration settings.
 * Example code to initialize AutoNumberingState:
 * ```typescript
 *     // Set Counters for equation numbering
 *     const levelCounters: number[] = new Array(maxDepth).fill(0);
 *     // maintain two unique counters for non-heading and heading equations  
 *     const numberingState: AutoNumberingState = {
 *         levelCounters,
 *         objNumberBeforeHeading: 0,
 *         objNumber: 0,
 *         currentDepth: 0,
 *         maxDepth,
 *         delimiter,
 *         globalPrefix,
 *         noHeadingObjPrefix: noHeadingEquationPrefix
 *     };
 * ```
 */
export interface AutoNumberingState {
    levelCounters: number[];          // Heading level counters (length = maxDepth)
    objNumberBeforeHeading: number;   // Counter for objects (equation, figures, etc.) that appear before any heading (depth = 0)
    objNumber: number;                // Counter for objects under the current heading depth
    currentDepth: number;             // Current heading depth (0 means no active heading section)
    maxDepth: number;                 // Max heading depth allowed by user settings
    delimiter: string;                // Delimiter between hierarchical numbering segments
    globalPrefix: string;             // Global prefix applied to every generated tag
    noHeadingObjPrefix: string;       // Prefix used for objects(equations) that are outside any heading
}

/**
 * AutoNumberConfigs is the configuration object for auto-numbering, 
 * containing user settings that influence how tags are generated and updated.
 */
export interface AutoNumberConfigs {
    autoNumberingType: AutoNumberingType;  // Absolute or Relative numbering
    maxDepth: number;                      // Maximum heading depth to consider for numbering
    delimiter: string;                 // Delimiter between heading levels in the generated tag
    noHeadingPrefix: string;         // Prefix for objects that are not under any heading (depth = 0)
    globalPrefix: string;            // Global prefix for all generated tags
    parseQuotes: boolean;            // Whether to parse and number objects within quote blocks
    enableTaggedOnly: boolean;       // Whether to only auto number equations that already have tags
}

/**
 * Generates the next equation tag based on the current equation numbering state.
 *
 * The function increments the appropriate object number depending on the current depth.
 * - If `currentDepth` is 0, it increments `objNumberBeforeHeading` and returns a tag for objects before any heading.
 * - Otherwise, it increments `objNumber` and constructs a tag using the global prefix, level counters, and delimiter.
 *
 * @param state - The current equation numbering state, containing counters and configuration for equation numbering.
 * @returns The generated object tag as a string.
 */
export function generateNextTagForAutoNumber(state: AutoNumberingState): string {
    if (state.currentDepth === 0) {
        state.objNumberBeforeHeading++;
        return `${state.globalPrefix}${state.noHeadingObjPrefix}${state.objNumberBeforeHeading}`;
    } else {
        const eqIdx = Math.min(state.currentDepth, state.maxDepth - 1);
        state.objNumber++;
        if (eqIdx === 0) {
            return `${state.globalPrefix}${state.objNumber}`;
        } else {
            const prefixLevels = state.levelCounters
                .slice(0, eqIdx)
                .filter(n => n > 0)
                .join(state.delimiter);
            return `${state.globalPrefix}${prefixLevels}${state.delimiter}${state.objNumber}`;
        }
    }
}

/**
 * It's just a wrapper function for generateNextTagForAutoNumber, but with the logic to determine whether to generate tag or not based on enableTaggedOnly and whether there is an old tag.
 * 
 * @remarks We can always parse for the oldTag, since its not so costy
 * @param state the current auto numbering state 
 * @param oldTag 
 *      the old tag parsed from equation, used with enableTaggedOnly to determine whether to generate new tag or not. 
 *      when use undefined, it is equivalent to `generateNextTagForAutoNumber(state)`
 * @param enableTaggedOnly whether to only generate new tag for equations with existing tags. If true, then equations without tags will not be numbered (return null).
 * @returns the new generated tag if should number, null if should not number (either because enableTaggedOnly is true and there is no old tag, or other reasons in the future)
 */
export function generateNewTagForAutoNumber(state: AutoNumberingState, oldTag: string | undefined, enableTaggedOnly: boolean): string | null {
    let shouldNumber = true;
    if (enableTaggedOnly) {
        shouldNumber = Boolean(oldTag);
    }
    return shouldNumber ? generateNextTagForAutoNumber(state) : null;
}

/**
 * @param levelCounters the array of counters for each heading level, length should be equal to maxDepth
 * @param headingLevel 
 *            input absolute level if autoNumberingType is Absolute, 
 *            input relative level if autoNumberingType is Relative 
 * @param maxDepth maximum heading level we want to handle in numbering. For example, maxDepth=3 means we handle heading levels 1, 2, and 3.
 * @param type 
 * @returns 
 */
export function updateLevelCounters(
    levelCounters: number[],
    headingLevel: number,
    maxDepth: number,
    type: AutoNumberingType
): void {
    const maxAllowedLevel = maxDepth;

    // Early return for headings deeper than maxDepth - they should not update counters
    if (headingLevel > maxAllowedLevel) return;

    // Handle absolute numbering case (title level jumps)
    if (type === AutoNumberingType.Absolute) {
        // Find the parent level (not include current level)
        for (let i = 0; i < headingLevel - 1; i++) {
            if (levelCounters[i] === 0) {
                levelCounters[i] = 1;
            }
        }
    }
    // Increment current level and reset deeper levels
    levelCounters[headingLevel - 1]++;
    levelCounters.fill(0, headingLevel);
}
