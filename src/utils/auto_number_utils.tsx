import { Heading, relativeHeadingLevel } from "@/utils/heading";
import { parseMarkdownLine } from "@/utils/string_utils";
import { parseEquationTag } from "@/utils/equation_utils";
import { headingRegex, codeBlockStartRegex, createEquationTagString, singleLineEqBlockPattern } from "@/utils/regexp_utils";
import assert from "assert";
import { EditorPosition } from "obsidian";

export enum AutoNumberingType {
    Relative = "Relative",
    Absolute = "Absolute"
}

export interface AutoNumberProceedResult {
    md: string;
    tagMapping: Map<string, string>;
}

export function getHeadings(content: string): Heading[] {
    const lines = content.split('\n');
    // Parse all headings 
    const headings: Heading[] = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check code block and Skip the code block content 
        if (codeBlockStartRegex.test(line)) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) {
            continue;
        }
        const headingMatch = line.match(headingRegex);
        if (headingMatch) {
            headings.push({
                level: headingMatch[1].length,
                line: i,
                text: headingMatch[2]
            });
        }
    }
    return headings;
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
 * @todo : Remove duplicate code  
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
    const headings = getHeadings(content);
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
            if (i === cursorPos.line) {
                return newTag;
            }
            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
            }
            continue;
        }
        if (parseResult.isSingleLineEquation) {
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
            else if (parseResult.isEquationBlockStart || parseResult.isEquationBlockEnd || inEquationBlock) {
                return newTag;  // still in equation block, return current tag 
            }
            return null;  // cursor is not in equation or equation block  
        }
    }
    return null;
}

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
    const headings = getHeadings(content);

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
            if (headingLevel <= maxDepth - 1) {
                equationNumber = 0;
            }

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
                // add tag mapping 
                if (oldTag) newTagMapping.set(oldTag, newTag);

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
            if (oldTag) newTagMapping.set(oldTag, newTag);

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
        if (oldTag) newTagMapping.set(oldTag, NewTag);

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
): void {
    const maxAllowedLevel = maxDepth - 1;
    if (headingLevel > maxAllowedLevel) return;

    // Handle absolute numbering case (title level jumps) 
    if (type === AutoNumberingType.Absolute) {
        // Find the last non-zero level
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
