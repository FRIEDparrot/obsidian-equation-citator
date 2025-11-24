import { MarkdownView, Editor, EditorPosition } from "obsidian";
import { MarkdownFileProcessor } from '@/utils/misc/fileProcessor';
import { autoNumberEquations, getAutoNumberInCursor } from "@/utils/core/auto_number_utils";
import { TagRenamePair, TagRenameResult } from "@/services/tag_service";
import { Notice } from "obsidian";
import Debugger from "@/debug/debugger";
import EquationCitator from "@/main";
import { insertTextWithCursorOffset } from "@/utils/workspace/insertTextOnCursor";
import { createEquationTagRegex } from "@/utils/string_processing/regexp_utils";

/**
 * Restore cursor position with fallback strategies
 * @param editor - The editor instance
 * @param originalPos - The original cursor position to restore
 */
function restoreCursorPosition(editor: Editor, originalPos: EditorPosition): void {
    const lineCount = editor.lineCount();

    // Strategy 1: Try to restore to original line and character
    if (originalPos.line < lineCount) {
        const lineLength = editor.getLine(originalPos.line).length;
        if (originalPos.ch <= lineLength) {
            editor.setCursor(originalPos);
            Debugger.log(`Cursor restored to original position: line ${originalPos.line}, ch ${originalPos.ch}`);
            return;
        }
    }

    // Strategy 2: Try to position at first char of the original line
    if (originalPos.line < lineCount) {
        editor.setCursor({ line: originalPos.line, ch: 0 });
        Debugger.log(`Cursor restored to line start: line ${originalPos.line}, ch 0`);
        return;
    }

    // Strategy 3: Position at the start of the minimum valid line (last line or line 0)
    const fallbackLine = Math.min(originalPos.line, lineCount - 1);
    const fallbackPos = { line: Math.max(0, fallbackLine), ch: 0 };
    editor.setCursor(fallbackPos);
    Debugger.log(`Cursor restored to fallback position: line ${fallbackPos.line}, ch 0`);
}

export async function autoNumberCurrentFileEquations(plugin: EquationCitator) {
    const { autoNumberType, autoNumberDepth, autoNumberDelimiter,
        autoNumberNoHeadingPrefix, autoNumberGlobalPrefix: autoNumberPrefix, enableAutoNumberEquationsInQuotes: autoNumberEquationsInQuotes, enableTypstMode } = plugin.settings;
    const {
        deleteRepeatTagsInAutoNumber: deleteRepeatTags,
        deleteUnusedTagsInAutoNumber: deleteUnusedTags,
        enableUpdateTagsInAutoNumber: enableUpdateTags,
        enableAutoNumberTaggedEquationsOnly: enableTaggedOnly,
    } = plugin.settings;
    const sourceFile = plugin.app.workspace.activeEditor?.file?.path;
    let citationUpdateResult: TagRenameResult | undefined;
    let tagMapping: Map<string, string> = new Map();

    if (!sourceFile) {
        new Notice("Auto number is not supported in reading mode");
        return;
    }

    // Save cursor position before auto-numbering
    const editor = plugin.app.workspace.activeEditor?.editor;
    const originalCursorPos = editor?.getCursor();

    const processor = new MarkdownFileProcessor(
        plugin,
        sourceFile,
        async (content) => {
            const { md, tagMapping: tm } = autoNumberEquations(
                content,
                autoNumberType,
                autoNumberDepth,
                autoNumberDelimiter,
                autoNumberNoHeadingPrefix,
                autoNumberPrefix,
                autoNumberEquationsInQuotes,
                enableTypstMode,
                enableTaggedOnly
            );
            tagMapping = tm;
            // rename tags by tagmapping
            return Promise.resolve(md);
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
        citationUpdateResult = await plugin.tagService.renameTags(
            sourceFile, renamePairs, deleteRepeatTags, deleteUnusedTags, editor
        );
        if (citationUpdateResult) Debugger.log("citation update details :", citationUpdateResult.details);
    }

    // Restore cursor position after all processing
    if (editor && originalCursorPos) {
        restoreCursorPosition(editor, originalCursorPos);
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
        enableAutoNumberTaggedEquationsOnly: enableTaggedOnly
    } = plugin.settings;

    // Check if enableTaggedOnly is enabled and validate selection
    if (enableTaggedOnly) {
        const selections = editor.listSelections();
        let hasValidTag = false;

        if (selections && selections.length > 0) {
            const selection = selections[0];
            const start = selection.anchor;
            const end = selection.head;
            
            // Check if there's a selection
            if (start.line !== end.line || start.ch !== end.ch) {
                const from = start.line < end.line || (start.line === end.line && start.ch < end.ch) ? start : end;
                const to = start.line < end.line || (start.line === end.line && start.ch < end.ch) ? end : start;
                const selectedText = editor.getRange(from, to).trim();
                
                // Check if the selected text matches tag format
                const tagRegex = createEquationTagRegex(true, null, enableTypstMode);
                
                if (tagRegex.test(selectedText)) {
                    hasValidTag = true;
                }
            }
        }

        if (!hasValidTag) {
            new Notice("A tag must be selected when auto-numbering tagged equations only");
            return;
        }
    }

    const autoNumberTag = getAutoNumberInCursor(
        content,
        cursorPos,
        autoNumberType,
        autoNumberDepth,
        autoNumberDelimiter,
        autoNumberNoHeadingPrefix,
        autoNumberPrefix,
        autoNumberEquationsInQuotes,
        enableTaggedOnly
    );
    if (!autoNumberTag) {
        new Notice("Cursor is not in a valid equation block");
        return;
    }
    const insertText = enableTypstMode ? `#label("${autoNumberTag}")` : `\\tag{${autoNumberTag}}`;
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
