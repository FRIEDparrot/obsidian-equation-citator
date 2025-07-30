import { Heading, relativeHeadingLevel } from "@/utils/heading";
import { normalizeEquationBlock, clearEquationTag } from "@/utils/equation_utils";

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
    globalPrefix: string
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
    return processAutoNumbering(lines, headings, type, maxDepth, delimiter, noHeadingEquationPrefix, globalPrefix);
}

function processAutoNumbering(
    lines: string[],
    headings: Heading[],
    autoNumberingType: AutoNumberingType,
    maxDepth: number,
    delimiter: string,
    noHeadingEquationPrefix: string,
    globalPrefix: string 
): string {
    const codeBlockRegex = /^```/;
    const headingRegex = /^(#{1,6})\s+(.*)$/;
    const singleLineEqRegex = /^\s*\$\$([\s\S]*?)\$\$\s*$/;

    let inCodeBlock = false;
    let inEquationBlock = false;

    // Set Counters for equation numbering  
    const levelCounters: number[] = new Array(maxDepth).fill(0);
    let equationBuffer: string[] = [];   // multi-line equation buffer 

    // maintain two unique counters for non-heading and heading equations  
    let preHeadingEqNumber = 0; 
    let equationNumber = 0;      
    
    let currentDepth = 0; // current depth 
    let currentHeadingIndex = 0; // current heading index in headings array 

    const result: string[] = [];

    const getAutoNbEquationTag = () => {
        if (currentDepth === 0) {
            // no heading equations, use prefix counter
            preHeadingEqNumber++;
            const tag = `${globalPrefix}${noHeadingEquationPrefix}${preHeadingEqNumber}`;
            return `\\tag{${tag}}`;
        }
        else {
            // calculate the equation index 
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
        // equationBody is cleared equation without $$ and tag  
        const tag = getAutoNbEquationTag();
        if (equationBody.endsWith("\n")) {
            // add tag to the previous line (not trim to avoid \n trimmed)  
            return equationBody.slice(0, -1) + " " + tag + "\n";
        } else {
            // add tag to the current line 
            return equationBody.trim() + " " + tag;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // skip code block content  
        if (codeBlockRegex.test(line)) {
            inCodeBlock = !inCodeBlock;
            result.push(line);
            continue;
        }
        if (inCodeBlock) {
            result.push(line);
            continue;
        }
        // Test if it's inside a multi-line equation block
        if (inEquationBlock) {
            equationBuffer.push(line);
            if (line.trim().endsWith("$$")) {
                // add the last line
                inEquationBlock = false;
                // add tag to the equation block  
                const eqaution_body = normalizeEquationBlock(equationBuffer);
                const res = getTaggedEquation(eqaution_body);
                // re-construct multi-line equation block, clear the buffer  
                result.push(`$$\n${res}\n$$`);
                equationBuffer = [];
            }
            continue;
        }
        
        // match if this line is heading and set the current depth  
        // note : level counter update logic is different for relative and absolute numbering  
        const headingMatch = line.match(headingRegex);
        if (headingMatch) {
            // **update the level counter when encountering a heading**
            const headingLevel = autoNumberingType === AutoNumberingType.Relative ?
                relativeHeadingLevel(headings, currentHeadingIndex) :
                headingMatch[1].length;

            if (headingLevel == 0) {
                throw new Error("Equation Citator : Current heading is not in headings array");
            }
            updateLevelCounters(levelCounters, headingLevel, maxDepth, autoNumberingType);
            if (headingLevel <= maxDepth - 1) {
                equationNumber = 0; // reset equation counter for this heading  
            }

            currentDepth = Math.min(headingLevel, maxDepth); // current depth -> also index to modify
            result.push(line);
            currentHeadingIndex++;
            continue;
        }

        // try to match the whole equation block 
        const equationMatch = line.match(singleLineEqRegex);
        if (equationMatch) {
            const equationBody = clearEquationTag(equationMatch[1].trim());
            const equation = getTaggedEquation(equationBody);
            result.push(`$$ ${equation} $$`);
            continue;
        }

        if (line.trim().startsWith("$$")) {
            // start of a multi-line equation block
            inEquationBlock = true;
            equationBuffer.push(line);
            continue;
        }
        result.push(line);
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
