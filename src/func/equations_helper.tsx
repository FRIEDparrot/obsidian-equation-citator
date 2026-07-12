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

interface EquationScanState {
    inCodeBlock: boolean;
    inEquationBlock: boolean;
    eqStartLine: number;
    quoteDepth: number;
}

interface ParsedQuoteLine {
    rawLine: string;
    content: string;
    quoteDepth: number;
}

interface MultiLineEquationExtraction {
    content: string;
    contentAfterDollar: string;
    endLine: number;
    firstLineWasBlank: boolean;
}

function parseQuoteLine(rawLine: string): ParsedQuoteLine {
    const { content, quoteDepth } = processQuoteLine(rawLine);
    return {
        rawLine,
        content,
        quoteDepth,
    };
}

function getInitialEquationScanState(): EquationScanState {
    return {
        inCodeBlock: false,
        inEquationBlock: false,
        eqStartLine: 0,
        quoteDepth: 0,
    };
}

function updateEquationScanState(
    state: EquationScanState,
    parsedLine: ParsedQuoteLine,
    lineIndex: number
): void {
    if (isCodeBlockToggle(parsedLine.content)) {
        state.inCodeBlock = !state.inCodeBlock;
        return;
    }

    if (state.inCodeBlock) {
        return;
    }

    if (state.inEquationBlock) {
        if (equationBlockEndPattern.test(parsedLine.content)) {
            state.inEquationBlock = false;
        }
        return;
    }

    if (!equationBlockStartPattern.test(parsedLine.content)) {
        return;
    }

    const singleLineMatch = new RegExp(singleLineEqBlockPattern).exec(parsedLine.content);
    if (singleLineMatch) {
        return;
    }

    state.inEquationBlock = true;
    state.eqStartLine = lineIndex;
    state.quoteDepth = parsedLine.quoteDepth;
}

function scanEquationState(lines: string[], cursorLine: number): EquationScanState {
    const state = getInitialEquationScanState();

    for (let i = 0; i < cursorLine; i++) {
        updateEquationScanState(state, parseQuoteLine(lines[i]), i);
    }

    return state;
}

function buildSingleLineEquationResult(
    parsedLine: ParsedQuoteLine,
    cursorLine: number
): EquationAtCursor | null {
    const singleLineMatch = new RegExp(singleLineEqBlockPattern).exec(parsedLine.content);
    if (!singleLineMatch) {
        return null;
    }

    const rawContent = singleLineMatch[1].trim();
    const startIndex = parsedLine.rawLine.indexOf('$$') + 2;
    const endIndex = parsedLine.rawLine.lastIndexOf('$$');
    return {
        content: rawContent,
        startPos: { line: cursorLine, ch: startIndex },
        endPos: { line: cursorLine, ch: endIndex },
        isSingleLine: true,
        quoteDepth: parsedLine.quoteDepth,
        firstLineWasBlank: false,
    };
}

function extractMultiLineEquation(lines: string[], startLine: number): MultiLineEquationExtraction {
    const tmpEqBuffer: string[] = [];
    const startLineContent = parseQuoteLine(lines[startLine]).content;
    const contentAfterDollar = startLineContent.replace(equationBlockStartPattern, '').trim();
    let endLine = 0;

    if (contentAfterDollar) {
        tmpEqBuffer.push(contentAfterDollar);
    }

    for (let j = startLine + 1; j < lines.length; j++) {
        const eqContent = parseQuoteLine(lines[j]).content;
        if (equationBlockEndPattern.test(eqContent)) {
            endLine = j;
            break;
        }
        tmpEqBuffer.push(eqContent);
    }

    return {
        content: tmpEqBuffer.join('\n').trim(),
        contentAfterDollar,
        endLine,
        firstLineWasBlank: contentAfterDollar.length === 0
            && tmpEqBuffer.length > 0
            && tmpEqBuffer[0].trim() === '',
    };
}

function buildEquationBlockStartPosition(
    lines: string[],
    startLine: number,
    quoteDepth: number,
    contentAfterDollar: string,
    firstLineWasBlank: boolean
): EditorPosition {
    const quotePrefixLength = '>'.repeat(quoteDepth).length + (quoteDepth > 0 ? 1 : 0);

    if (contentAfterDollar.length > 0) {
        const dollarPos = lines[startLine].indexOf('$$');
        return { line: startLine, ch: dollarPos + 2 };
    }

    if (firstLineWasBlank) {
        return { line: startLine + 2, ch: quotePrefixLength };
    }

    return { line: startLine + 1, ch: quotePrefixLength };
}

/**
 * Extracts a multi-line `$$...$$` block starting from `startLine` and returns the editable content range.
 */
function buildMultiLineEquationResult(
    lines: string[],
    startLine: number,
    quoteDepth: number
): EquationAtCursor {
    const extraction = extractMultiLineEquation(lines, startLine);
    const quotePrefixLength = '>'.repeat(quoteDepth).length + (quoteDepth > 0 ? 1 : 0);

    return {
        content: extraction.content,
        startPos: buildEquationBlockStartPosition(
            lines,
            startLine,
            quoteDepth,
            extraction.contentAfterDollar,
            extraction.firstLineWasBlank
        ),
        endPos: { line: extraction.endLine, ch: quotePrefixLength },
        isSingleLine: false,
        quoteDepth,
        firstLineWasBlank: extraction.firstLineWasBlank,
    };
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

    const scanState = scanEquationState(lines, cursorPos.line);
    const currentLine = parseQuoteLine(lines[cursorPos.line]);

    if (scanState.inCodeBlock || isCodeBlockToggle(currentLine.content)) {
        return null;
    }

    const singleLineEquation = buildSingleLineEquationResult(currentLine, cursorPos.line);
    if (singleLineEquation) {
        return singleLineEquation;
    }

    if (scanState.inEquationBlock) {
        return buildMultiLineEquationResult(lines, scanState.eqStartLine, scanState.quoteDepth);
    }

    if (equationBlockStartPattern.test(currentLine.content)) {
        return buildMultiLineEquationResult(lines, cursorPos.line, currentLine.quoteDepth);
    }

    return null;
}

function buildBoxedEquationContent(plugin: EquationCitator, content: string): string {
    const {typstBoxSymbol, enableTypstMode}  = plugin.settings;
    const boxedSymbol = enableTypstMode ? typstBoxSymbol : 'boxed';
    const boxedPrefix = enableTypstMode ? `${boxedSymbol}(` : `\\${boxedSymbol}{`;
    const boxedSuffix = enableTypstMode ? ')' : '}';
    return boxedPrefix + content + boxedSuffix;
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

    // Prepare the boxed symbol based on mode
    const { skipFirstlineInBoxedFilter } = plugin.settings;
    const cursorPos = editor.getCursor();
    const equationInfo = getEquationAtCursor(editor, cursorPos);
    if (!equationInfo) {
        Debugger.log("No equation found at cursor position.");
        return;
    }
    const { content, startPos, endPos, isSingleLine, quoteDepth, firstLineWasBlank } = equationInfo;
    
    // Get the content to wrap (includes any existing tags)
    let contentToWrap = content
    const lines = contentToWrap.split('\n');

    // Handle skipFirstlineInBoxedFilter for multi-line equations
    // Only skip first line if it's NOT blank
    if (!isSingleLine && skipFirstlineInBoxedFilter && !firstLineWasBlank) {
        const firstLine = lines[0];
        const remainingLines = lines.slice(1).join('\n');
        contentToWrap = firstLine + '\n' + buildBoxedEquationContent(plugin, remainingLines);
    }
    else {
        contentToWrap = buildBoxedEquationContent(plugin, contentToWrap);
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
