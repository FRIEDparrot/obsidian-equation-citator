import Debugger from "@/debug/debugger";

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
