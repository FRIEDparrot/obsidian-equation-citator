import EquationCitator from "@/main";
import { CurrentFileProcessor } from '@/utils/fileProcessor';
import { autoNumberEquations } from "@/utils/auto_number_utils";
import { TagRenamePair, TagRenameResult } from "@/services/tag_service";
import { Notice } from "obsidian";
import Debugger from "@/debug/debugger";

export async function autoNumberCurrentFileEquations(plugin: EquationCitator) {
    const settings = plugin.settings;
    const prefix = settings.autoNumberPrefixEnabled ? settings.autoNumberPrefix : "";
    const deleteRepeatTags = settings.deleteRepeatTagsInAutoNumbering;
    const deleteUnusedTags = settings.deleteUnusedTagsInAutoNumbering;
    const sourceFile = plugin.app.workspace.activeEditor?.file?.path;
    let citationUpdateResult: TagRenameResult | undefined;
    let tagMapping: Map<string, string> = new Map();

    if (!sourceFile) {
        new Notice("Auto number is not supported in reading mode");
        return;
    }
    const processor = new CurrentFileProcessor(
        plugin,
        async (content) => {
            const { md, tagMapping : tm } = autoNumberEquations(
                content,
                settings.autoNumberType,
                settings.autoNumberDepth,
                settings.autoNumberDelimiter,
                settings.autoNumberNoHeadingPrefix,
                prefix,
                settings.autoNumberEquationsInQuotes
            );
            tagMapping = tm;
            // rename tags by tagmapping 
            
            return Promise.resolve(md);
        }
    );
    await processor.execute();  // process current file content 
    
    if (settings.enableUpdateTagsInAutoNumbering && tagMapping.size > 0) {
        // Convert Map<string, string> to TagRenamePair[] 
        const renamePairs: TagRenamePair[] = Array.from(tagMapping.entries()).map(([oldTag, newTag]) => ({
            oldTag,
            newTag
        }));
        Debugger.log("auto numbering citation rename pairs :", renamePairs);
        const editor = plugin.app.workspace.activeEditor?.editor;
        citationUpdateResult = await plugin.tagService.renameTags(
            sourceFile, renamePairs, deleteRepeatTags, deleteUnusedTags, editor
        );
        if (citationUpdateResult) {
            Debugger.log("citation update details :", citationUpdateResult.details);
        }
    }
    
    // show notice message  
    let msg = "Auto numbering finished.";
    if (citationUpdateResult) {
        const citeUpdateMsg = assemblyCitationUpdateMessage(citationUpdateResult);
        msg += '\n' + citeUpdateMsg;
    }
    new Notice(msg);
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