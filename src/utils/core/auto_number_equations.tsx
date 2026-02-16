import { EditorPosition, Notice } from "obsidian";
import Debugger from "@/debug/debugger";

import { 
    generateNextTagForAutoNumber,
    generateNewTagForAutoNumber,
    AutoNumberConfigs,
    AutoNumberingState,
    AutoNumberProceedResult, 
    processCodeBlockAndHeading,
} from "./auto_number_core";
import { singleLineEqBlockPattern } from "../string_processing/regexp_utils";

import { parseHeadingsInMarkdown } from "@/utils/parsers/heading_parser";
import { parseMarkdownLine } from "@/utils/string_processing/string_utils";
import { parseEquationTag } from "@/utils/parsers/equation_parser";
import { createEquationTagString, equationBlockBracePattern,  } from "@/utils/string_processing/regexp_utils";


/**
 * EquationAutoNumberConfigs extends AutoNumberConfigs with equation-specific options.
 */
export interface EquationAutoNumberConfigs extends AutoNumberConfigs {
    enableTypstMode: boolean;        // Whether to use Typst mode for equation tags
}

// check if the cursor is in a single line equation block   
function isPositionInSingleLineEquation(line: string, ch: number): boolean {
    const match = new RegExp(singleLineEqBlockPattern).exec(line);
    if (!match?.index) return false;
    const startPos = match.index;
    const endPos = startPos + match[0].length;
    return ch >= startPos && ch <= endPos;
}

/**
 * Determines the auto-generated equation number tag at the current cursor position within a Markdown document.
 *
 * This function analyzes the content up to the cursor position, tracking heading levels, code blocks, and equation blocks,
 * and returns the appropriate equation tag if the cursor is inside an equation (single-line or block).
 * 
 * @remarks process for quotes is handled inside parseMarkdownLine function
 * 
 * @param content - The full Markdown content to analyze.
 * @param cursorPos - The current cursor position, specified as an object with `line` and `ch` (character) properties.
 * @param configs - The auto-numbering configuration object containing all settings.
 * @returns The equation tag string if the cursor is inside an equation, or `null` otherwise.
 */
export function getEqAutoNumberInCursor(
    content: string,
    cursorPos: EditorPosition,
    configs: EquationAutoNumberConfigs,
): string | null {
    const {
        autoNumberingType,
        maxDepth,
        delimiter,
        noHeadingPrefix: noHeadingEquationPrefix,
        globalPrefix,
        parseQuotes,
        enableTaggedOnly
    } = configs;
    const lines = content.split('\n');
    const headings = parseHeadingsInMarkdown(content);
    if (cursorPos.line < 0 || cursorPos.line >= lines.length) {
        Debugger.error("Invalid cursor position", cursorPos, "for content with", lines.length, "lines.");
        return null;
    }
    let inCodeBlock = false;
    let inEquationBlock = false;
    let newTag: string | null = null;
    let equationBuffer: string[] = [];
    // Set Counters for equation numbering
    const levelCounters: number[] = new Array(maxDepth).fill(0);

    const numberingState: AutoNumberingState = {
        levelCounters,
        objNumberBeforeHeading: 0,
        objNumber: 0,
        currentDepth: 0,
        maxDepth,
        delimiter,
        globalPrefix,
        noHeadingPrefix: noHeadingEquationPrefix
    };

    // maintain two unique counters for non-heading and heading equations 
    let currentHeadingIndex = 0;

    for (let i = 0; i <= cursorPos.line; i++) {
        const line = lines[i];
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);
        
        // Process code blocks and headings
        const processResult = processCodeBlockAndHeading(
            parseResult,
            inCodeBlock,
            numberingState,
            currentHeadingIndex,
            headings,
            autoNumberingType
        );
        
        inCodeBlock = processResult.inCodeBlock;
        currentHeadingIndex = processResult.currentHeadingIndex;
        
        if (processResult.shouldContinue) {
            continue;
        }

        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim());
            // Check if cursor is on this line
            if (i === cursorPos.line) {
                return generateNextTagForAutoNumber(numberingState);
            }
            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
                // Check if this equation should be numbered
                const { tag: oldTag } = parseEquationTag(equationBuffer.join('\n'), false);
                newTag = generateNewTagForAutoNumber(numberingState, oldTag, enableTaggedOnly);
                equationBuffer = [];
            }
        }
        else if (parseResult.isSingleLineEquation) {
            // Check if this equation should be numbered
            const { tag: oldTag } = parseEquationTag(parseResult.singleLineEquationMatch![0], false);
            newTag = generateNewTagForAutoNumber(numberingState, oldTag, enableTaggedOnly);
        }
        else if (parseResult.isEquationBlockStart) {
            if (!inEquationBlock) {
                equationBuffer = [parseResult.cleanedLine.trim()];
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
 * Detect illegal nested $$ in equation string 
 * @param eqStr 
 * @returns line number of illegal, -1 if no illegal 
 */
export function detectIllegalEquation(eqStr: string): number {
    const indexes = [...eqStr.matchAll(equationBlockBracePattern)].map(m => m.index);
    if (indexes.length < 2) return -1;  // no illegal
    const first = indexes[0], last = indexes.at(-1)!;
    // 1. if there is any $$ in between first and last, then illegal
    // 2. if the last index is not the end of string-2, then illegal 
    // 3. since we only parse line startwith $$, no need to detect prefix 
    const suffix = eqStr.slice(last + 2);
    if (suffix.trim().length > 0) {
        const lines = eqStr.substring(0, last).split("\n");
        return lines.length - 1;  // return line number of illegal
    }
    const illegalIndex = indexes.find(i => i > first && i < last);
    if (illegalIndex !== undefined) {
        const lines = eqStr.substring(0, illegalIndex).split("\n");
        return lines.length - 1;  // return line number of illegal
    }
    return -1;  // no illegal
}

/**
 * Automatically numbers equations in a Markdown string according to specified heading levels and numbering styles.
 * 
 * This function not update citation, use `autoNumberCurrentFileEquations` in real function call.
 *
 * Equations outside headings can be prefixed with a custom string, and the numbering can be relative to headings
 * or absolute, depending on the `autoNumberingType`. The function also handles code blocks, quoted lines, and
 * unclosed equation blocks gracefully.
 *
 * @param content - The Markdown content to process.
 * @param configs - The auto-numbering configuration object containing all settings.
 * @returns An object containing the processed Markdown (`md`) and a mapping of old to new equation tags (`tagMapping`).
 */
export function autoNumberEquations(
    content: string,
    configs: EquationAutoNumberConfigs,
): AutoNumberProceedResult {
    const {
        autoNumberingType,
        maxDepth,
        delimiter,
        noHeadingPrefix,
        globalPrefix,
        parseQuotes,
        enableTypstMode,
        enableTaggedOnly
    } = configs;
    const lines = content.split('\n');
    const headings = parseHeadingsInMarkdown(content);

    let inEquationBlock = false;

    // Set Counters for equation numbering
    const levelCounters: number[] = new Array(maxDepth).fill(0);
    let equationBuffer: string[] = [];

    // maintain two unique counters for non-heading and heading equations  
    const numberingState: AutoNumberingState = {
        levelCounters,
        objNumberBeforeHeading: 0,
        objNumber: 0,
        currentDepth: 0,
        maxDepth,
        delimiter,
        globalPrefix,
        noHeadingPrefix,
    };
    let currentHeadingIndex = 0;
    const newTagMapping = new Map<string, string>();  /** store new tag mapping */
    const result: string[] = [];
    let currentEqBlockStartLine = -1;

    const addTagMapping = (oldTag: string | undefined, newTag: string) => {
        // add tag mapping only when there is no old tags (only map first occurrence)
        if (oldTag && !newTagMapping.has(oldTag)) {
            newTagMapping.set(oldTag, newTag);
        }
    }

    const getFormattedEquation = (equationBody: string, tag?: string): string => {
        let newContent = equationBody.trimEnd();
        const tagString = tag ?? "";

        if (equationBody.endsWith("\n")) {
            newContent += ` ${tagString}\n`;
        } else {
            newContent += ` ${tagString} `;
        }
        return `$$${newContent}$$`;
    };

    const processEquation = (rawEquation: string): string => {
        // remove old tag
        const { content, tag: oldTag } = parseEquationTag(rawEquation, enableTypstMode, false);
        const getNewTag = !enableTaggedOnly || oldTag;

        if (getNewTag) {
            // generate new tag
            const newTagLabel = generateNextTagForAutoNumber(numberingState);
            const newTag = createEquationTagString(newTagLabel, enableTypstMode);
            addTagMapping(oldTag, newTagLabel);
            return getFormattedEquation(content, newTag);
        } else {
            return getFormattedEquation(content, oldTag);
        }
    }

    const handleIllegalEquationBuffer = (lineNum: number) => {
        // detect illegal equation buffer first (single line will considered as buffer if illegal)
        const eqStr = equationBuffer.join("\n");
        const illegal = detectIllegalEquation(eqStr);
        if (illegal >= 0) {
            const lineNumOfIllegal = lineNum + illegal;
            new Notice(`Illegal $$ in equation block at line ${lineNumOfIllegal + 1}. Please fix it first.`);
            throw new Error(`Markdown parsing error: Illegal nested $$ in equation block around line ${lineNumOfIllegal + 1}. This could lead to serious auto number error, so stop parsing.`);
        }
    }

    let inCodeBlock = false;
    let quotePrefix = "";
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Process code blocks and headings
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);
        const processResult = processCodeBlockAndHeading(
            parseResult,
            inCodeBlock,
            numberingState,
            currentHeadingIndex,
            headings,
            autoNumberingType
        );
        inCodeBlock = processResult.inCodeBlock;
        currentHeadingIndex = processResult.currentHeadingIndex;
        
        if (processResult.shouldContinue) {
            result.push(line);
            continue;
        }
        quotePrefix = parseResult.quoteDepth > 0 ? "> ".repeat(parseResult.quoteDepth) : "";
        // Handle multi-line equation blocks
        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim());
            if (parseResult.isEquationBlockEnd) {
                handleIllegalEquationBuffer(currentEqBlockStartLine);
                inEquationBlock = false;
                const finalEquation = processEquation(equationBuffer.join("\n"));
                const fullEquationLines = finalEquation.split("\n");
                result.push(fullEquationLines.map((c) => quotePrefix + c).join("\n"));
                equationBuffer = [];
            }
            continue;
        }
        // Handle single-line equations
        if (parseResult.isSingleLineEquation && parseResult.singleLineEquationMatch) {
            const rawEquationContent = parseResult.singleLineEquationMatch[0];

            // detect illegal equation buffer
            if (equationBlockBracePattern.test(parseResult.singleLineEquationMatch[1])) {
                new Notice(`Detected illegal nested $$ in single-line equation at line ${i + 1}. Please fix the equation first.`);
                throw new Error(`Markdown parsing error: Illegal nested $$ in single-line equation at line ${i + 1}. This could lead to serious auto number error, so stop parsing.`);
            }

            const finalEquation = processEquation(rawEquationContent);
            result.push(`${quotePrefix}${finalEquation}`);
            continue;
        }

        // Handle start of multi-line equation blocks
        if (parseResult.isEquationBlockStart) {
            inEquationBlock = true;
            equationBuffer.push(parseResult.cleanedLine.trim());
            currentEqBlockStartLine = i;
            continue;
        }
        result.push(line);
    }

    // Handle unclosed equation blocks
    if (inEquationBlock && equationBuffer.length > 0) {
        handleIllegalEquationBuffer(currentEqBlockStartLine);
        const finalEquation = processEquation(equationBuffer.join("\n"));
        const fullEquationLines = finalEquation.split("\n");
        result.push(fullEquationLines.map((c) => quotePrefix + c).join("\n"));
        equationBuffer = [];
    }
    return {
        md: result.join('\n'),
        tagMapping: newTagMapping
    }
}
