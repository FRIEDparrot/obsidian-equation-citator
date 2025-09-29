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

// check if the cursor is in a single line equation block   
function isPositionInSingleLineEquation(line: string, ch: number): boolean {
    const match = line.match(singleLineEqBlockPattern);
    if (!match || !match.index) return false;

    const startPos = match.index;
    const endPos = startPos + match[0].length;

    return ch >= startPos && ch <= endPos;
}

/**
 * @todo : Remove duplicate code  (getAutoNbEquationTag)
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

    // maintain two unique counters for non-heading and heading equations  
    let preHeadingEqNumber = 0;
    let equationNumber = 0;
    let currentDepth = 0;
    let currentHeadingIndex = 0;

    const getAutoNbEquationTag = (): string => {
        if (currentDepth === 0) {
            preHeadingEqNumber++;
            return `${globalPrefix}${noHeadingEquationPrefix}${preHeadingEqNumber}`;
        } else {
            const eqIdx = Math.min(currentDepth, maxDepth - 1);
            equationNumber++;
            if (eqIdx === 0) {
                return `${globalPrefix}${equationNumber}`;
            } else {
                const tag = globalPrefix + levelCounters
                    .slice(0, eqIdx)
                    .filter((n) => n > 0)
                    .join(delimiter) + delimiter + equationNumber;
                return tag;
            }
        }
    };
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
                equationNumber = 0;
            }
            currentDepth = Math.min(headingLevel, maxDepth);
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
            newTag = getAutoNbEquationTag();
        }
        else if (parseResult.isEquationBlockStart) {
            if (!inEquationBlock) {
                newTag = getAutoNbEquationTag();
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
 * @param content markdown content 
 * @param autoNumberingType absolute or relative 
 * @param maxDepth max level in settings   
 * @param delimiter 
 * @param noHeadingEquationPrefix 
 * @param globalPrefix 
 * @param parseQuotes 
 * @returns 
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
    let preHeadingEqNumber = 0;
    let equationNumber = 0;

    let currentDepth = 0;
    let currentHeadingIndex = 0;

    const newTagMapping = new Map<string, string>();  /** store new tag mapping */
    const result: string[] = [];

    const getAutoNbEquationTag = (): string => {
        if (currentDepth === 0) {
            preHeadingEqNumber++;
            return `${globalPrefix}${noHeadingEquationPrefix}${preHeadingEqNumber}`;
        }
        else {
            const eqIdx = Math.min(currentDepth, maxDepth - 1);
            equationNumber++;
            if (eqIdx === 0) {
                return `${globalPrefix}${equationNumber}`;
            }
            else {
                const tag = globalPrefix + levelCounters
                    .slice(0, eqIdx)
                    .filter((n) => n > 0)
                    .join(delimiter) + delimiter + equationNumber;
                return tag;
            }
        }
    }

    const getTaggedEquation = (equationBody: string): { eq: string, tag: string } => {
        const tag = getAutoNbEquationTag();
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
            if (headingLevel <= maxDepth - 1) equationNumber = 0;
            currentDepth = Math.min(headingLevel, maxDepth);
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
