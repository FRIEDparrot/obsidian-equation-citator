import EquationCitator from "@/main";
import { MarkdownView, Editor, EditorPosition } from "obsidian";
import { isCodeBlockToggle, singleLineEqBlockPattern, equationBlockStartPattern, equationBlockEndPattern } from "@/utils/string_processing/regexp_utils";
import { processQuoteLine } from "@/utils/string_processing/string_utils";
import Debugger from "@/debug/debugger";

/**
 * Information about the equation found at cursor position
 */
interface EquationAtCursor {
    content: string;       // raw equation content (without $$, but with tags)
    startPos: EditorPosition; // start position of equation content (after $$)
    endPos: EditorPosition;   // end position of equation content (before $$)
    isSingleLine: boolean;    // whether it's a single-line equation
    quoteDepth: number;       // just use quote depth at cursor line.
    firstLineWasBlank: boolean; // whether the first line of content was blank (for skipFirstlineInBoxedFilter)
}

/**
 * Find the equation at the cursor position and return its content and range
 */
function getEquationAtCursor(
    editor: Editor,
    cursorPos: EditorPosition
): EquationAtCursor | null {
    const lines = editor.getValue().split('\n');
    if (cursorPos.line < 0 || cursorPos.line >= lines.length) {
        return null;
    }

    let inCodeBlock = false;
    let inEquationBlock = false;
    let eqStartLine = 0;
    let quoteDepth = 0;

    // First pass: determine state up to cursor line
    for (let i = 0; i < cursorPos.line; i++) {
        const rawLine = lines[i];
        const { content: lineContent, quoteDepth: depth } = processQuoteLine(rawLine);

        if (isCodeBlockToggle(lineContent)) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        // Handle multi-line equation blocks
        if (inEquationBlock) {
            if (equationBlockEndPattern.test(lineContent)) {
                inEquationBlock = false;
            }
        } else if (equationBlockStartPattern.test(lineContent)) {
            // Check if it's NOT a single-line equation on this line
            const singleLineMatch = new RegExp(singleLineEqBlockPattern).exec(lineContent);
            if (!singleLineMatch) {
                inEquationBlock = true;
                eqStartLine = i;
                quoteDepth = depth;
            }
        }
    }
    // Now i = cursorPos.line, check the cursor line itself
    const rawLine = lines[cursorPos.line];
    const { content: lineContent, quoteDepth: currentQuoteDepth } = processQuoteLine(rawLine);

    // Skip if we're in a code block
    if (inCodeBlock || isCodeBlockToggle(lineContent)) return null;
    // Check for single-line equation first
    const singleLineMatch = new RegExp(singleLineEqBlockPattern).exec(lineContent);
    if (singleLineMatch) {
        const rawContent = singleLineMatch[1].trim();
        const startIndex = rawLine.indexOf('$$') + 2;
        const endIndex = rawLine.lastIndexOf('$$');
        return {
            content: rawContent,
            startPos: { line: cursorPos.line, ch: startIndex },
            endPos: { line: cursorPos.line, ch: endIndex },
            isSingleLine: true,
            quoteDepth: currentQuoteDepth,
            firstLineWasBlank: false // Not applicable for single-line
        };
    }

    // Check if cursor is in a multi-line equation block
    if (inEquationBlock) {
        const tmpEqBuffer: string[] = [];
        let eqEndLine = 0;

        // Extract content from the start line (after $$)
        const { content: startLineContent } = processQuoteLine(lines[eqStartLine]);
        const contentAfterDollar = startLineContent.replace(equationBlockStartPattern, '').trim();
        if (contentAfterDollar) {
            tmpEqBuffer.push(contentAfterDollar);
        }

        // Scan forward from start line to find the end
        for (let j = eqStartLine + 1; j < lines.length; j++) {
            const { content: eqContent } = processQuoteLine(lines[j]);
            if (equationBlockEndPattern.test(eqContent)) {
                eqEndLine = j;
                break;
            }
            tmpEqBuffer.push(eqContent);
        }

        const content = tmpEqBuffer.join('\n').trim();
        
        // Check if first line was blank:
        // - If there's content after $$ on opening line, first line is NOT blank
        // - Otherwise, check if first line in buffer is blank
        let firstLineWasBlank = false;
        if (contentAfterDollar.length === 0) {
            // No content on $$ line, check first collected line
            firstLineWasBlank = tmpEqBuffer.length > 0 && tmpEqBuffer[0].trim() === '';
        }
        
        // Calculate quote prefix length for position offset
        const quotePrefix = '>'.repeat(quoteDepth) + (quoteDepth > 0 ? ' ' : '');
        
        // Determine startPos: if there's content on the same line as $$, start from there
        // If first line after $$ is blank, skip it and start from the next line
        // Otherwise start from the line after $$
        let startPos: EditorPosition;
        if (contentAfterDollar.length > 0) {
            const dollarPos = lines[eqStartLine].indexOf('$$');
            startPos = { line: eqStartLine, ch: dollarPos + 2 };
        } else if (firstLineWasBlank) {
            // Skip blank first line
            startPos = { line: eqStartLine + 2, ch: quotePrefix.length };
        } else {
            startPos = { line: eqStartLine + 1, ch: quotePrefix.length };
        }
        
        return {
            content,
            startPos,
            endPos: { line: eqEndLine, ch: quotePrefix.length },
            isSingleLine: false,
            quoteDepth,
            firstLineWasBlank
        };
    }

    // Check if cursor line itself starts a multi-line block
    if (equationBlockStartPattern.test(lineContent)) {
        const tmpEqBuffer: string[] = [];
        let eqEndLine = 0;

        // Extract content from the cursor line (after $$)
        const contentAfterDollar = lineContent.replace(equationBlockStartPattern, '').trim();
        if (contentAfterDollar) {
            tmpEqBuffer.push(contentAfterDollar);
        }

        for (let j = cursorPos.line + 1; j < lines.length; j++) {
            const { content: eqContent } = processQuoteLine(lines[j]);
            if (equationBlockEndPattern.test(eqContent)) {
                eqEndLine = j;
                break;
            }
            tmpEqBuffer.push(eqContent);
        }

        const content = tmpEqBuffer.join('\n').trim();
        
        // Check if first line was blank:
        // - If there's content after $$ on opening line, first line is NOT blank
        // - Otherwise, check if first line in buffer is blank
        let firstLineWasBlank = false;
        if (contentAfterDollar.length === 0) {
            // No content on $$ line, check first collected line
            firstLineWasBlank = tmpEqBuffer.length > 0 && tmpEqBuffer[0].trim() === '';
        }
        
        // Calculate quote prefix length for position offset
        const quotePrefix = '>'.repeat(currentQuoteDepth) + (currentQuoteDepth > 0 ? ' ' : '');
        
        // Determine startPos: if there's content on the same line as $$, start from there
        // If first line after $$ is blank, skip it and start from the next line
        // Otherwise start from the line after $$
        let startPos: EditorPosition;
        if (contentAfterDollar.length > 0) {
            const dollarPos = rawLine.indexOf('$$');
            startPos = { line: cursorPos.line, ch: dollarPos + 2 };
        } else if (firstLineWasBlank) {
            // Skip blank first line
            startPos = { line: cursorPos.line + 2, ch: quotePrefix.length };
        } else {
            startPos = { line: cursorPos.line + 1, ch: quotePrefix.length };
        }
        
        return {
            content,
            startPos,
            endPos: { line: eqEndLine, ch: quotePrefix.length },
            isSingleLine: false,
            quoteDepth: currentQuoteDepth,
            firstLineWasBlank
        };
    }
    return null;
}

/**
 * Add `\boxed` to the equation at cursor position. 
 * Uses cursor position to find the correct equation.
 */
export function boxSelectedEquation(
    plugin: EquationCitator
) {
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) return;

    const {
        skipFirstlineInBoxedFilter,
        enableTypstMode,
        typstBoxSymbol,
    } = plugin.settings;

    const cursorPos = editor.getCursor();
    const equationInfo = getEquationAtCursor(editor, cursorPos);
    if (!equationInfo) {
        Debugger.log("No equation found at cursor position.");
        return;
    }
    const { content, startPos, endPos, isSingleLine, quoteDepth, firstLineWasBlank } = equationInfo;

    // Prepare the boxed symbol based on mode
    const boxedSymbol = enableTypstMode ? typstBoxSymbol : 'boxed';
    const boxedPrefix = enableTypstMode ? `${boxedSymbol}(` : `\\${boxedSymbol}{`;
    const boxedSuffix = enableTypstMode ? ')' : '}';

    // Get the content to wrap (includes any existing tags)
    let contentToWrap = content
    const lines = contentToWrap.split('\n');

    // Handle skipFirstlineInBoxedFilter for multi-line equations
    // Only skip first line if it's NOT blank
    if (!isSingleLine && skipFirstlineInBoxedFilter) {
        if (!firstLineWasBlank && lines.length > 1) {
            // Wrap only from the second line onwards (skip first line)
            const firstLine = lines[0];
            const remainingLines = lines.slice(1).join('\n');
            contentToWrap = firstLine + '\n' + boxedPrefix + remainingLines + boxedSuffix;
        } else {
            // First line is blank or single line content in multi-line equation block
            contentToWrap = boxedPrefix + contentToWrap + boxedSuffix;
        }
    } else {
        // Wrap entire content (no skipFilter)
        contentToWrap = boxedPrefix + contentToWrap + boxedSuffix;
    }
    
    // Add quote symbol for each line if in quote 
    // Note: first line doesn't need quote prefix because startPos is already after the quote markers
    // Only subsequent lines need the quote prefix
    if (quoteDepth > 0) {
        const quotePrefix = '>'.repeat(quoteDepth) + ' ';
        const lines = contentToWrap.split('\n');
        if (lines.length > 1) {
            contentToWrap = lines[0] + '\n' + lines.slice(1).map(line => quotePrefix + line).join('\n');
        }
    }
    
    // For multi-line equations, add newlines to keep $$ on separate lines
    if (!isSingleLine) {
        contentToWrap = contentToWrap + '\n' + '>'.repeat(quoteDepth) + (quoteDepth > 0 ? ' ' : '');
    }
    
    editor.replaceRange(contentToWrap, startPos, endPos);
}