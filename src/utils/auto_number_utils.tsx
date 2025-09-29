import { parseHeadingsInMarkdown, relativeHeadingLevel } from "@/utils/heading_utils";
import { parseMarkdownLine } from "@/utils/string_utils";
import { parseEquationTag } from "@/utils/equation_utils";
import { createEquationTagString, singleLineEqBlockPattern } from "@/utils/regexp_utils";
import assert from "assert";
import { EditorPosition } from "obsidian";

export enum AutoNumberingType {
    Relative = "Relative",
    Absolute = "Absolute"
}

export interface AutoNumberProceedResult {
    md: string;
    tagMapping: Map<string, string>;  // mapping to rename citations 
}

interface EquationNumberingState {
    levelCounters: number[];          // Heading level counters (length = maxDepth)
    preHeadingEqNumber: number;       // Counter for equations that appear before any heading (depth = 0)
    equationNumber: number;           // Counter for equations under the current heading depth
    currentDepth: number;             // Current heading depth (0 means no active heading section)
    maxDepth: number;                 // Max heading depth allowed by user settings
    delimiter: string;                // Delimiter between hierarchical numbering segments
    globalPrefix: string;             // Global prefix applied to every generated tag
    noHeadingEquationPrefix: string;  // Prefix used for equations that are outside any heading
}

// check if the cursor is in a single line equation block   
function isPositionInSingleLineEquation(line: string, ch: number): boolean {
    const match = line.match(singleLineEqBlockPattern);
    if (!match || !match.index) return false;

    const startPos = match.index;
    const endPos = startPos + match[0].length;

    return ch >= startPos && ch <= endPos;
}

/**
 * Generates the next equation tag based on the current equation numbering state.
 *
 * The function increments the appropriate equation number depending on the current depth.
 * - If `currentDepth` is 0, it increments `preHeadingEqNumber` and returns a tag for equations before any heading.
 * - Otherwise, it increments `equationNumber` and constructs a tag using the global prefix, level counters, and delimiter.
 *
 * @param state - The current equation numbering state, containing counters and configuration for equation numbering.
 * @returns The generated equation tag as a string.
 */
function generateNextEquationTag(state: EquationNumberingState): string {
    if (state.currentDepth === 0) {
        state.preHeadingEqNumber++;
        return `${state.globalPrefix}${state.noHeadingEquationPrefix}${state.preHeadingEqNumber}`;
    } else {
        const eqIdx = Math.min(state.currentDepth, state.maxDepth - 1);
        state.equationNumber++;
        if (eqIdx === 0) {
            return `${state.globalPrefix}${state.equationNumber}`;
        } else {
            const prefixLevels = state.levelCounters
                .slice(0, eqIdx)
                .filter(n => n > 0)
                .join(state.delimiter);
            return `${state.globalPrefix}${prefixLevels}${state.delimiter}${state.equationNumber}`;
        }
    }
}


/**
 * Determines the auto-generated equation number tag at the current cursor position within a Markdown document.
 *
 * This function analyzes the content up to the cursor position, tracking heading levels, code blocks, and equation blocks,
 * and returns the appropriate equation tag if the cursor is inside an equation (single-line or block).
 *
 * @param content - The full Markdown content to analyze.
 * @param cursorPos - The current cursor position, specified as an object with `line` and `ch` (character) properties.
 * @param autoNumberingType - The type of auto-numbering to use (e.g., relative or absolute).
 * @param maxDepth - The maximum heading depth to consider for equation numbering.
 * @param delimiter - The delimiter string used to separate numbering levels.
 * @param noHeadingEquationPrefix - The prefix to use for equations not under any heading.
 * @param globalPrefix - The global prefix to prepend to all equation tags.
 * @param parseQuotes - Optional. Whether to parse quoted lines as equations. Defaults to `false`.
 * @returns The equation tag string if the cursor is inside an equation, or `null` otherwise.
 */
export function getAutoNumberInCursor(
    content: string,
    cursorPos: EditorPosition,
    autoNumberingType: AutoNumberingType,
    maxDepth: number,
    delimiter: string,
    noHeadingEquationPrefix: string,
    globalPrefix: string,
    parseQuotes = false
): string | null {
    const lines = content.split('\n');
    const headings = parseHeadingsInMarkdown(content);
    assert(cursorPos.line >= 0 && cursorPos.line < lines.length, "Invalid cursor position " + cursorPos);

    let inCodeBlock = false;
    let inEquationBlock = false;
    let newTag: string | null = null;
    // Set Counters for equation numbering
    const levelCounters: number[] = new Array(maxDepth).fill(0);

    const numberingState: EquationNumberingState = {
        levelCounters,
        preHeadingEqNumber: 0,
        equationNumber: 0,
        currentDepth: 0,
        maxDepth,
        delimiter,
        globalPrefix,
        noHeadingEquationPrefix
    };
    
    // maintain two unique counters for non-heading and heading equations 
    let currentHeadingIndex = 0; 
    
    for (let i = 0; i <= cursorPos.line; i++) {
        const line = lines[i];
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);
        // Update code block state
        if (parseResult.isCodeBlockToggle) inCodeBlock = !inCodeBlock;
        if (inCodeBlock) continue;

        // Handle headings to update counters 
        if (parseResult.isHeading && parseResult.headingMatch) {
            const headingLevel = autoNumberingType === AutoNumberingType.Relative ?
                relativeHeadingLevel(headings, currentHeadingIndex) :
                parseResult.headingMatch[1].length;

            assert(headingLevel >= 0, `Current heading ${parseResult.headingMatch[2]} is not in headings array ${headings}`);
            updateLevelCounters(levelCounters, headingLevel, maxDepth, autoNumberingType);
            if (headingLevel <= maxDepth - 1) {
                numberingState.equationNumber = 0;
            }
            numberingState.currentDepth = Math.min(headingLevel, maxDepth);
            currentHeadingIndex++;
            continue;
        }

        if (inEquationBlock) {
            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
            }
            else if (i === cursorPos.line) {
                return newTag;
            }
        }
        else if (parseResult.isSingleLineEquation) {
            // get an equation tag to update counters   
            newTag = generateNextEquationTag(numberingState);
        }
        else if (parseResult.isEquationBlockStart) {
            if (!inEquationBlock) {
                newTag = generateNextEquationTag(numberingState);
                inEquationBlock = true;
            }
        }

        // Check if cursor is at current line 
        if (i === cursorPos.line) {
            if (parseResult.isSingleLineEquation || isPositionInSingleLineEquation(line, cursorPos.ch)) {
                return newTag;
            }
            if (parseResult.isEquationBlockStart || parseResult.isEquationBlockEnd) {
                const bracketLoc = line.indexOf("$$");
                if (bracketLoc === -1) return null;  // invalid equation block
                const afterStart = parseResult.isEquationBlockStart && inEquationBlock && cursorPos.ch >= bracketLoc + 2;
                const beforeEnd = parseResult.isEquationBlockEnd && !inEquationBlock && cursorPos.ch <= bracketLoc;
                if (afterStart || beforeEnd) {
                    return newTag;  // cursor is in equation block 
                }
                return null;  // cursor is not in equation block  
            }
            if (inEquationBlock) {
                return newTag;  // still in equation block, return current tag 
            }
            return null;  // cursor is not in equation or equation block  
        }
    }
    return null;
}

/**
 * Automatically numbers equations in a Markdown string according to specified heading levels and numbering styles.
 *
 * This function parses the input Markdown content, detects equations (both single-line and multi-line blocks),
 * and assigns equation tags based on heading hierarchy, global prefixes, and custom delimiters. It also maintains
 * a mapping from old equation tags to new ones for reference updates.
 *
 * Equations outside headings can be prefixed with a custom string, and the numbering can be relative to headings
 * or absolute, depending on the `autoNumberingType`. The function also handles code blocks, quoted lines, and
 * unclosed equation blocks gracefully.
 *
 * @param content - The Markdown content to process.
 * @param autoNumberingType - The numbering style to use (relative to headings or absolute).
 * @param maxDepth - The maximum heading depth to consider for equation numbering.
 * @param delimiter - The delimiter to use between numbering levels.
 * @param noHeadingEquationPrefix - Prefix for equations not under any heading.
 * @param globalPrefix - A global prefix to prepend to all equation tags.
 * @param parseQuotes - Whether to parse and handle quoted lines (default: false).
 * @returns An object containing the processed Markdown (`md`) and a mapping of old to new equation tags (`tagMapping`).
 */
export function autoNumberEquations(
    content: string,
    autoNumberingType: AutoNumberingType,
    maxDepth: number,
    delimiter: string,
    noHeadingEquationPrefix: string,
    globalPrefix: string,
    parseQuotes = false
): AutoNumberProceedResult {
    const lines = content.split('\n');
    const headings = parseHeadingsInMarkdown(content);

    let inCodeBlock = false;
    let inEquationBlock = false;

    // Set Counters for equation numbering
    const levelCounters: number[] = new Array(maxDepth).fill(0);
    let equationBuffer: string[] = [];

    // maintain two unique counters for non-heading and heading equations  
    const numberingState: EquationNumberingState = {
        levelCounters,
        preHeadingEqNumber: 0,
        equationNumber: 0,
        currentDepth: 0,
        maxDepth,
        delimiter,
        globalPrefix,
        noHeadingEquationPrefix
    };
    let currentHeadingIndex = 0;

    const newTagMapping = new Map<string, string>();  /** store new tag mapping */
    const result: string[] = [];

    const getTaggedEquation = (equationBody: string): { eq: string, tag: string } => {
        const tag = generateNextEquationTag(numberingState);
        if (equationBody.endsWith("\n")) {
            return {
                eq: equationBody.slice(0, -1) + " " + createEquationTagString(tag) + "\n",
                tag: tag
            }
        } else {
            return {
                eq: equationBody.trim() + " " + createEquationTagString(tag),
                tag: tag
            }
        }
    }
    const addTagMapping = (oldTag: string | undefined, newTag: string) => {
        // add tag mapping only when there is no old tags (only map first occurrence)
        if (oldTag && !newTagMapping.has(oldTag)) {
            newTagMapping.set(oldTag, newTag);
        }
    }
    let quotePrefix = "";
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);
        
        // Update code block state
        if (parseResult.isCodeBlockToggle) inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
            result.push(line);
            continue;
        }
        // Handle headings
        if (parseResult.isHeading && parseResult.headingMatch) {
            const headingLevel = autoNumberingType === AutoNumberingType.Relative ?
                relativeHeadingLevel(headings, currentHeadingIndex) :
                parseResult.headingMatch[1].length;

            assert(headingLevel >= 0, `Current heading ${parseResult.headingMatch[2]} is not in headings array ${headings}`);
            updateLevelCounters(levelCounters, headingLevel, maxDepth, autoNumberingType);
            if (headingLevel <= maxDepth - 1) numberingState.equationNumber = 0;
            numberingState.currentDepth = Math.min(headingLevel, maxDepth);
            result.push(line);
            currentHeadingIndex++;
            continue;
        }

        // Handle multi-line equation blocks
        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim());
            if (parseResult.isEquationBlockEnd) {
                quotePrefix = parseResult.quoteDepth > 0 ? "> ".repeat(parseResult.quoteDepth) : "";
                inEquationBlock = false;
                const { content, tag: oldTag } = parseEquationTag(equationBuffer.join("\n"));
                const { eq, tag: newTag } = getTaggedEquation(content); 
                addTagMapping(oldTag, newTag);
                const fullEquationLines = `$$\n${eq}\n$$`.split("\n");
                result.push(fullEquationLines.map((c) => quotePrefix + c).join("\n"));
                equationBuffer = [];
            }
            continue;
        }
        // Handle single-line equations
        if (parseResult.isSingleLineEquation && parseResult.singleLineEquationMatch) {
            const rawEquationContent = parseResult.singleLineEquationMatch[1].trim();

            // now not clear equation Content 
            const { content, tag: oldTag } = parseEquationTag(rawEquationContent);
            const { eq, tag: newTag } = getTaggedEquation(content);
            // add tag mapping 
            addTagMapping(oldTag, newTag);
            result.push(`${quotePrefix}$$ ${eq} $$`);
            continue;
        }

        // Handle start of multi-line equation blocks
        if (parseResult.isEquationBlockStart) {
            inEquationBlock = true;
            equationBuffer.push(quotePrefix + parseResult.cleanedLine.trim());
            continue;
        }
        result.push(line);
    }

    // Handle unclosed equation blocks
    if (inEquationBlock && equationBuffer.length > 0) {
        const equation_raw = equationBuffer.join("\n");
        const { content, tag: oldTag } = parseEquationTag(equation_raw);
        const { eq, tag: NewTag } = getTaggedEquation(content);
        
        // add tag mapping 
        addTagMapping(oldTag, NewTag);
        const fullEquationLines = `$$\n${eq}\n$$`.split("\n");
        result.push(fullEquationLines.map((c) => quotePrefix + c).join("\n"));
        equationBuffer = [];
    }
    return {
        md: result.join('\n'),
        tagMapping: newTagMapping
    }
}

function updateLevelCounters(
    levelCounters: number[],
    headingLevel: number,
    maxDepth: number,
    type: AutoNumberingType
): number {
    const maxAllowedLevel = maxDepth - 1;
    const effectiveLevel = Math.min(headingLevel, maxAllowedLevel);

    // Handle absolute numbering case (title level jumps) 
    if (type === AutoNumberingType.Absolute) {
        // Find the parent level (not include current level)
        for (let i = 0; i < effectiveLevel - 1; i++) {
            if (levelCounters[i] === 0) {
                levelCounters[i] = 1;
            }
        }
    }
    // keep all levels unchanged to autonumber correctly 
    if (headingLevel > maxAllowedLevel) {
        // keep the last level at least 1 for absolute numbering 
        if (type === AutoNumberingType.Absolute && levelCounters[effectiveLevel - 1] === 0) {
            levelCounters[effectiveLevel - 1] = 1;
        }
        return effectiveLevel;
    }
    // Increment current level and reset deeper levels 
    levelCounters[effectiveLevel - 1]++;
    levelCounters.fill(0, effectiveLevel);
    return effectiveLevel; 
}
