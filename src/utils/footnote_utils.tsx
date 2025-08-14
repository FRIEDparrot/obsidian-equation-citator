import { footnoteRegex, isCodeBlockToggle } from "@/utils/regexp_utils";

export interface FootNote {
    num: string;  // footnote number
    path: string; // path to the footnote file
    label: string | null; // alias of the footnote file
}

export function parseFootnoteInMarkdown(markdown: string): FootNote[] {
    const lines = markdown.split('\n');
    const result: FootNote[] = [];
    let inCodeBlock = false;
    // Regex to match footnote pattern: [^x]: [[path|alias]] or [^x]: [[path]]
    
    
    for (const line of lines) {
        if (!line.startsWith('[^')) {
            if (isCodeBlockToggle(line)) {
                inCodeBlock = !inCodeBlock;
                continue;
            }
            // not footnote, no need to care whether in code block or not 
            continue;
        }
        if (inCodeBlock) {
            continue;
        }
        const match = line.match(footnoteRegex);
        if (match) { 
            const num = match[1].substring(1);  // remove the ^
            const path = match[2];  

            const fileName = path.split('/').pop() || null;

            const label = (match[3] && match[3].trim() !== '') ? match[3] : fileName;
            result.push({ num, path, label });
        }
    }
    return result;
}