import { Heading, relativeHeadingLevel } from "@/utils/heading";
import { parseMarkdownLine, updateCodeBlockState } from "@/utils/string_utils";
import { 
    clearEquationTag, 
    trimEquationsBlock, 
} from "@/utils/equation_utils";

export enum AutoNumberingType {
    Relative = "Relative",
    Absolute = "Absolute"
}

export function autoNumberEquations(
    content: string,
    type: AutoNumberingType,
    maxDepth: number,
    delimiter: string,
    noHeadingEquationPrefix: string,
    globalPrefix: string, 
    parseQuotes = false
): string {
    const lines = content.split('\n');
    const headingRegex = /^(#{1,6})\s+(.*)$/;
    const codeBlockRegex = /^```/;

    // Parse all headings 
    const headings: Heading[] = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check code block and Skip the code block content 
        if (codeBlockRegex.test(line)) {
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
    return processAutoNumbering(lines, headings, type, maxDepth, delimiter, noHeadingEquationPrefix, globalPrefix, parseQuotes);
}

function processAutoNumbering(
    lines: string[],
    headings: Heading[],
    autoNumberingType: AutoNumberingType,
    maxDepth: number,
    delimiter: string,
    noHeadingEquationPrefix: string,
    globalPrefix: string,
    parseQuotes = false
): string {
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

    const result: string[] = [];

    const getAutoNbEquationTag = () => {
        if (currentDepth === 0) {
            preHeadingEqNumber++;
            const tag = `${globalPrefix}${noHeadingEquationPrefix}${preHeadingEqNumber}`;
            return `\\tag{${tag}}`;
        }
        else {
            const eqIdx = Math.min(currentDepth, maxDepth - 1);
            equationNumber++;
            if (eqIdx === 0) {
                const tag = `${globalPrefix}${equationNumber}`;
                return `\\tag{${tag}}`;
            }
            else {
                const tag = globalPrefix + levelCounters
                    .slice(0, eqIdx)
                    .filter((n) => n > 0)
                    .join(delimiter) + delimiter + equationNumber;
                return `\\tag{${tag}}`;
            }
        }
    }

    const getTaggedEquation = (equationBody: string) => {
        const tag = getAutoNbEquationTag();
        if (equationBody.endsWith("\n")) {
            return equationBody.slice(0, -1) + " " + tag + "\n";
        } else {
            return equationBody.trim() + " " + tag;
        }
    }
    let quotePrefix = "";
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);
        quotePrefix = parseResult.quoteDepth > 0 ? "> ".repeat(parseResult.quoteDepth) : "";

        // Update code block state
        if (parseResult.isCodeBlockToggle) {
            const codeBlockMatches = parseResult.processedContent.match(/```/g);
            inCodeBlock = updateCodeBlockState(inCodeBlock, codeBlockMatches);
        }
        if (inCodeBlock) {
            result.push(line);
            continue;
        }

        // Handle multi-line equation blocks
        if (inEquationBlock) {
            equationBuffer.push(parseResult.cleanedLine.trim());
            
            if (parseResult.isEquationBlockEnd) {
                inEquationBlock = false;
                const equation_raw = trimEquationsBlock(equationBuffer);
                const equation_body = clearEquationTag(equation_raw);
                const res = getTaggedEquation(equation_body);
                const fullEquationLines  = `$$\n${res}\n$$`.split("\n");
                result.push(fullEquationLines.map((c) =>  quotePrefix + c).join("\n"));
                equationBuffer = [];
            }
            continue;
        }
        
        // Handle headings
        if (parseResult.isHeading && parseResult.headingMatch) {
            const headingLevel = autoNumberingType === AutoNumberingType.Relative ?
                relativeHeadingLevel(headings, currentHeadingIndex) :
                parseResult.headingMatch[1].length;

            if (headingLevel == 0) {
                throw new Error("Equation Citator : Current heading is not in headings array");
            }
            updateLevelCounters(levelCounters, headingLevel, maxDepth, autoNumberingType);
            if (headingLevel <= maxDepth - 1) {
                equationNumber = 0;
            }

            currentDepth = Math.min(headingLevel, maxDepth);
            result.push(line);
            currentHeadingIndex++;
            continue;
        }

        // Handle single-line equations
        if (parseResult.isSingleLineEquation && parseResult.singleLineEquationMatch) {
            const rawEquationContent = parseResult.singleLineEquationMatch[1].trim();
            const equationBody = clearEquationTag(rawEquationContent);
            const equation = getTaggedEquation(equationBody);
            result.push(`${quotePrefix}$$ ${equation} $$`);
            continue;
        }

        // Handle start of multi-line equation blocks
        if (parseResult.isEquationBlockStart) {
            inEquationBlock = true;
            equationBuffer.push(  quotePrefix + parseResult.cleanedLine.trim());
            continue;
        }
        result.push(line);
    }

    // Handle unclosed equation blocks
    if (inEquationBlock && equationBuffer.length > 0) {
        const equation_raw = trimEquationsBlock(equationBuffer);
        const equation_body = clearEquationTag(equation_raw);
        const res = getTaggedEquation(equation_body);
        const fullEquationLines  = `$$\n${res}\n$$`.split("\n");
        result.push(fullEquationLines.map((c) =>  quotePrefix + c).join("\n"));
        equationBuffer = [];
    }
    return result.join('\n');
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
    levelCounters[headingLevel-1]++;
    levelCounters.fill(0, headingLevel);
}
