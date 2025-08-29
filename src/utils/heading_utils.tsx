import Debugger from "@/debug/debugger";
import {headingRegex, codeBlockStartRegex } from "@/utils/regexp_utils";

export interface Heading {
    level: number;
    line: number;
    text: string;
}

/**
 * Calculate the relative heading level of the current heading 
 * @param headings 
 * @param currentHeadingIndex 
 * @returns 
 *     positive number: the relative heading level of the current heading 
 *     zero: no heading found, error occurred  
 */
export function relativeHeadingLevel(headings: Heading[], currentHeadingIndex: number) {
    if (headings.length === 0 || currentHeadingIndex < 0 || currentHeadingIndex >= headings.length) {
        Debugger.log("current Headings : ", headings); 
        Debugger.error('Invalid heading index ' + currentHeadingIndex + " in total length " + headings.length); 
        return 0;
    }
    const heading_arrays : number[] = [];
    for (let i = 0; i <= currentHeadingIndex; i++) {
        const heading = headings[i];
        while (heading_arrays.length > 0 && heading_arrays[heading_arrays.length - 1] >= heading.level) {
            heading_arrays.pop();
        }
        heading_arrays.push(heading.level);
    }
    return heading_arrays.length;
}


export function parseHeadingsInMarkdown(content: string): Heading[] {
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