import { MarkdownView } from "obsidian";
import { MarkdownFileProcessor } from '@/utils/misc/fileProcessor';
import { autoNumberEquations, getAutoNumberInCursor } from "@/utils/core/auto_number_utils";
import { TagRenamePair, TagRenameResult } from "@/services/tag_service";
import { Notice } from "obsidian";
import Debugger from "@/debug/debugger";
import EquationCitator from "@/main";
import { insertTextWithCursorOffset } from "@/func/insertTextOnCursor";

export async function autoNumberCurrentFileEquations(plugin: EquationCitator) {
    const { autoNumberType, autoNumberDepth, autoNumberDelimiter,
        autoNumberNoHeadingPrefix, autoNumberGlobalPrefix: autoNumberPrefix, enableAutoNumberEquationsInQuotes: autoNumberEquationsInQuotes } = plugin.settings;
    const { 
        deleteRepeatTagsInAutoNumber: deleteRepeatTags,
        deleteUnusedTagsInAutoNumber: deleteUnusedTags,
        enableUpdateTagsInAutoNumber: enableUpdateTags
    } = plugin.settings;
    const sourceFile = plugin.app.workspace.activeEditor?.file?.path;
    let citationUpdateResult: TagRenameResult | undefined;
    let tagMapping: Map<string, string> = new Map();
    
    if (!sourceFile) {
        new Notice("Auto number is not supported in reading mode");
        return;
    }
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
                autoNumberEquationsInQuotes
            );
            tagMapping = tm;
            // rename tags by tagmapping
            return Promise.resolve(md);
        }
    );
    await processor.execute();  // process current file content 

    // remove "tagMapping.size > 0" -> update citations also if no tags are changed
    if (enableUpdateTags) {
        // Convert Map<string, string> to TagRenamePair[] 
        const renamePairs: TagRenamePair[] = Array.from(tagMapping.entries()).map(([oldTag, newTag]) => ({
            oldTag,
            newTag
        }));
        // renamePairs will never repeat since we only rename first occurrence of oldTag 
        Debugger.log("auto numbering citation rename pairs :", renamePairs);
        const editor = plugin.app.workspace.activeEditor?.editor;
        citationUpdateResult = await plugin.tagService.renameTags(
            sourceFile, renamePairs, deleteRepeatTags, deleteUnusedTags, editor
        );
        if (citationUpdateResult) Debugger.log("citation update details :", citationUpdateResult.details);
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
        autoNumberNoHeadingPrefix, autoNumberGlobalPrefix: autoNumberPrefix, enableAutoNumberEquationsInQuotes: autoNumberEquationsInQuotes } = plugin.settings;

    const autoNumberTag = getAutoNumberInCursor(
        content,
        cursorPos,
        autoNumberType,
        autoNumberDepth,
        autoNumberDelimiter,
        autoNumberNoHeadingPrefix,
        autoNumberPrefix,
        autoNumberEquationsInQuotes);
    if (!autoNumberTag) {
        new Notice("Cursor is not in a valid equation block");
        return;
    }
    const insertText = `\\tag{${autoNumberTag}}`;
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
