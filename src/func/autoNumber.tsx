import EquationCitator from "@/main";
import { CurrentFileProcessor } from '@/utils/fileProcessor';
import { autoNumberEquations } from "@/utils/auto_number";
import { TagRenamePair } from "@/services/tag_service";
import { Notice } from "obsidian";
import Debugger from "@/debug/debugger";

export function autoNumberCurrentFileEquations(plugin: EquationCitator) {
    const settings = plugin.settings;
    const prefix = settings.autoNumberPrefixEnabled ? settings.autoNumberPrefix : "";
    const deleteRepeatTags = settings.deleteRepeatTagsInAutoNumbering;
    const deleteUnusedTags = settings.deleteUnusedTagsInAutoNumbering;
    const sourceFile = plugin.app.workspace.activeEditor?.file?.path;

    if (!sourceFile) {
        new Notice("Auto number is not supported in reading mode");
        return;
    }

    const processor = new CurrentFileProcessor(
        plugin,
        (content) => {
            const { md, tagMapping } = autoNumberEquations(
                content,
                settings.autoNumberType,
                settings.autoNumberDepth,
                settings.autoNumberDelimiter,
                settings.autoNumberNoHeadingPrefix,
                prefix,
                settings.autoNumberEquationsInQuotes
            );
            // rename tags by tagmapping 
            // Convert Map<string, string> to TagRenamePair[]

            if (settings.enableUpdateTagsInAutoNumbering) {
                const renamePairs: TagRenamePair[] = Array.from(tagMapping.entries()).map(([oldTag, newTag]) => ({
                    oldTag,
                    newTag
                }));
                Debugger.log("renamePairs", renamePairs);
                plugin.tagService.renameTags(sourceFile, renamePairs, deleteRepeatTags, deleteUnusedTags, undefined);
            }
            
            return Promise.resolve(md);
        }
    );
    processor.execute();
    new Notice("Equations auto numbering finished");
}
