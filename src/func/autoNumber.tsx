import { TagRenamePair, TagRenameResult } from "@/services/tag_service";
import Debugger from "@/debug/debugger";
import EquationCitator from "@/main";

import { MarkdownView, Editor, EditorPosition, Notice } from "obsidian";
import { MarkdownFileProcessor } from '@/utils/misc/fileProcessor';
import { autoNumberEquations, EquationAutoNumberConfigs, getEqAutoNumberInCursor } from "@/utils/core/auto_number_equations";
import { autoNumberFigures, FigAutoNumberConfigs } from "@/utils/core/auto_number_figures";
import { insertTextWithCursorOffset } from "@/utils/workspace/insertTextOnCursor";
import { AutoNumberProceedResult } from "@/utils/core/auto_number_core";

/**
 * Restore cursor position with fallback strategies
 * @param editor - The editor instance
 * @param originalPos - The original cursor position to restore
 */
function restoreCursorPosition(
    editor: Editor,
    originalPos: EditorPosition,
    scrollIntoView: boolean = true
): void {
    const lineCount = editor.lineCount();
    const doScroll = (from: EditorPosition, to: EditorPosition) => {
        if (scrollIntoView) {
            editor.scrollIntoView({ from: from, to: to }, true);
        }
    }
    // Strategy 1: Try to restore to original line and character
    if (originalPos.line < lineCount) {
        const lineLength = editor.getLine(originalPos.line).length;
        if (originalPos.ch <= lineLength) {
            editor.setCursor(originalPos);
            doScroll(originalPos, originalPos);
            Debugger.log(`Cursor restored to original position: line ${originalPos.line}, ch ${originalPos.ch}`);
            return;
        }
    }

    // Strategy 2: Try to position at first char of the original line
    if (originalPos.line < lineCount) {
        const dstPos = { line: originalPos.line, ch: 0 };
        editor.setCursor(dstPos);
        doScroll(dstPos, dstPos);
        Debugger.log(`Cursor restored to line start: line ${originalPos.line}, ch 0`);
        return;
    }

    // Strategy 3: Position at the start of the minimum valid line (last line or line 0)
    const fallbackLine = Math.min(originalPos.line, lineCount - 1);
    const fallbackPos = { line: Math.max(0, fallbackLine), ch: 0 };
    editor.setCursor(fallbackPos);
    doScroll(fallbackPos, fallbackPos);
    Debugger.log(`Cursor restored to fallback position: line ${fallbackPos.line}, ch 0`);
}

export async function autoNumberCurrentFileEquations(plugin: EquationCitator) {
    const { autoNumberType, autoNumberDepth, autoNumberDelimiter,
        autoNumberNoHeadingPrefix, autoNumberGlobalPrefix: autoNumberPrefix,
        enableAutoNumberEquationsInQuotes: autoNumberEquationsInQuotes,
        enableTypstMode, enableAutoNumberTaggedEquationsOnly: enableTaggedOnly,
    } = plugin.settings;

    const {
        deleteRepeatTagsInAutoNumber: deleteRepeatTags,
        deleteUnusedTagsInAutoNumber: deleteUnusedTags,
    } = plugin.settings;

    const configs: EquationAutoNumberConfigs = {
        autoNumberingType: autoNumberType,
        maxDepth: autoNumberDepth,
        delimiter: autoNumberDelimiter,
        noHeadingPrefix: autoNumberNoHeadingPrefix,
        globalPrefix: autoNumberPrefix,
        parseQuotes: autoNumberEquationsInQuotes,
        enableTypstMode,
        enableTaggedOnly
    }

    await executeAutoNumber(
        plugin,
        (content) => autoNumberEquations(content, configs),
        (sourceFile, renamePairs) => plugin.tagService.renameTags(
            sourceFile,
            renamePairs,
            deleteRepeatTags,
            deleteUnusedTags
        )
    );
}

export async function autoNumberCurrentFileFigures(plugin: EquationCitator) {
    const {
        figAutoNumberDelimiter, figAutoNumberGlobalPrefix, figAutoNumberNoHeadingPrefix,
        figAutoNumberDepth, figCitationPrefix, enableAutoNumberFigsInQuotes,
        autoNumberType, enableAutoNumberTaggedFigsOnly
    } = plugin.settings;

    const {
        deleteRepeatTagsInAutoNumber: deleteRepeatTags,
        deleteUnusedTagsInAutoNumber: deleteUnusedTags, 
    } = plugin.settings;

    const configs: FigAutoNumberConfigs = {
        autoNumberingType: autoNumberType,
        maxDepth: figAutoNumberDepth,
        delimiter: figAutoNumberDelimiter,
        noHeadingPrefix: figAutoNumberNoHeadingPrefix,
        globalPrefix: figAutoNumberGlobalPrefix,
        parseQuotes: enableAutoNumberFigsInQuotes,
        enableTaggedOnly: enableAutoNumberTaggedFigsOnly,
        figCitationPrefix
    }

    await executeAutoNumber(
        plugin,
        (content) => autoNumberFigures(content,configs),
        (sourceFile, renamePairs) => plugin.figureTagService.renameFigureTags(
            sourceFile,
            renamePairs,
            deleteRepeatTags,
            deleteUnusedTags
        )
    );
}

/**
 * Execute AutoNumber for current file. (Common function for every type)
 * @remarks auto-number workflow (what 2 callbacks do) :
 * 1. Read current file -> (processorContentCallback) -> processedResult -> convert to tagRenamePairs
 * 2. file + TagRenamePairs -> (updateCitationsCallback) -> update all related citations in vault
 * @param processorContentCallback : callback function to process file
 * @param updateCitationsCallback : callback function to update citations 
 */
async function executeAutoNumber(
    plugin: EquationCitator,
    processorContentCallback: (content: string) => AutoNumberProceedResult,
    updateCitationsCallback: (sourceFile: string, renamePairs: TagRenamePair[]) => Promise<TagRenameResult | undefined>
) {
    const {
        enableUpdateTagsInAutoNumber: enableUpdateTags,
    } = plugin.settings;
    const editor = plugin.app.workspace.activeEditor?.editor;
    const sourceFile = plugin.app.workspace.activeEditor?.file?.path;
    if (!sourceFile || !editor) {
        new Notice("Auto number is not supported in reading mode");
        return;
    }
    let citationUpdateResult: TagRenameResult | undefined;
    let tagMapping: Map<string, string> = new Map();

    // Save cursor position before auto-numbering
    const originalCursorPos = editor?.getCursor();

    const processor = new MarkdownFileProcessor(
        plugin,
        sourceFile,
        (content) => {
            const { md, tagMapping: tm } = processorContentCallback(content);
            tagMapping = tm;
            // rename tags by tagmapping
            return md;
        }
    );
    const succeed = await processor.execute();  // process current file content
    if (!succeed) {
        new Notice("Some error occurred during auto numbering. Turn on debug mode for details.");
        return;
    }

    // remove "tagMapping.size > 0" -> update citations also if no tags are changed
    if (enableUpdateTags) {
        // Convert Map<string, string> to TagRenamePair[]
        const renamePairs: TagRenamePair[] = Array.from(tagMapping.entries()).map(([oldTag, newTag]) => ({
            oldTag,
            newTag
        }));
        // renamePairs will never repeat since we only rename first occurrence of oldTag
        Debugger.log("auto numbering citation rename pairs :", renamePairs);
        citationUpdateResult = await updateCitationsCallback(sourceFile, renamePairs);
        if (citationUpdateResult) Debugger.log("citation update details :", citationUpdateResult.details);
    }
    // Restore cursor position after all processing (and make it visible)
    if (editor && originalCursorPos) {
        restoreCursorPosition(editor, originalCursorPos, false);
    }
    // show notice message
    let msg = "Auto numbering finished.";
    if (citationUpdateResult) {
        const citeUpdateMsg = assemblyCitationUpdateMessage(citationUpdateResult);
        msg += '\n' + citeUpdateMsg;
    }
    new Notice(msg);
}

export function insertAutoNumberTag(plugin: EquationCitator): void {
    const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) return;
    const cursorPos = editor.getCursor();
    const content = editor.getValue();
    const { autoNumberType, autoNumberDepth, autoNumberDelimiter,
        autoNumberNoHeadingPrefix,
        autoNumberGlobalPrefix: autoNumberPrefix,
        enableAutoNumberEquationsInQuotes: autoNumberEquationsInQuotes,
        enableTypstMode,
        enableAutoNumberTaggedEquationsOnly
    } = plugin.settings;

    const autoNumberTag = getEqAutoNumberInCursor(
        content,
        cursorPos,
        {
            autoNumberingType: autoNumberType,
            maxDepth: autoNumberDepth,
            delimiter: autoNumberDelimiter,
            noHeadingPrefix: autoNumberNoHeadingPrefix,
            globalPrefix: autoNumberPrefix,
            parseQuotes: autoNumberEquationsInQuotes,
            enableTaggedOnly: enableAutoNumberTaggedEquationsOnly,
            enableTypstMode
        }
    );
    if (!autoNumberTag) {
        new Notice("Cursor is not in a valid equation block");
        return;
    }
    const insertText = enableTypstMode ? `#label("${autoNumberTag}")` : String.raw`\tag{${autoNumberTag}}`;
    insertTextWithCursorOffset(editor, insertText, insertText.length);
}

export function assemblyCitationUpdateMessage(result: TagRenameResult): string {
    if (result && result.totalFilesChanged > 0) {
        const fileChanged = result.totalFilesChanged;
        const citationsChanged = result.totalCitationsChanged;
        const msg = `Updated ${citationsChanged} citation${citationsChanged > 1 ? "s" : ""}`
            + ` in ${fileChanged} file${fileChanged > 1 ? "s" : ""}.`;
        return msg;
    }
    else {
        return ""
    }
}
