import { pureFlinkFootnoteRegex, isCodeBlockToggle, footnoteRegex, pureWeblinkFootnoteRegex, pureBarelinkFootnoteRegex } from "@/utils/regexp_utils";

export interface FootNote {
    num: string;  // footnote number
    path: string | null; // path to the footnote file
    url: string | null; // web link of the footnote 
    label: string | null; // alias of the footnote file
    text: string;  // raw text of the footnote 
}

const footnoteParsers = [
    {
        regex: pureFlinkFootnoteRegex,
        handler: (m: RegExpMatchArray) => {
            const pathWithLink = m[2];
            const path = pathWithLink.split(/[#^]/)[0];
            const fileName = path.split('/').pop() || null;
            const label = (m[3] && m[3].trim() !== '') ? m[3] : fileName;
            return { path, url: null, label };
        },
    },
    {
        regex: pureWeblinkFootnoteRegex,
        handler: (m: RegExpMatchArray) => {
            return { path: null, url: m[3], label: m[2] };
        },
    },
    {
        regex: pureBarelinkFootnoteRegex,
        handler: (m: RegExpMatchArray) => {
            return { path: null, url: m[2], label: null };
        },
    },
];


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
        parseFootnoteLine(line, result);
    }
    return result;
}

function parseFootnoteLine(line: string, result: FootNote[]) {
    const match = line.match(footnoteRegex);
    if (!match) return;

    const num = match[1].substring(1);  // remove the ^
    const text = match[2];              // full text of the footnote
    
    for (const { regex, handler } of footnoteParsers) {
        const subMatch = line.match(regex);
        if (subMatch) {
            const { path, url, label } = handler(subMatch);
            result.push({ num, path, url, label, text });
            return;
        }
    }
    // fallback: text-only footnote
    result.push({ num, path: null, url: null, label: null, text });
} 