import EquationCitator from '@/main';
import { autoNumberCurrentFileEquations, insertAutoNumberTag } from '@/func/autoNumber';
import { MarkdownView } from 'obsidian';
import { exportCurrentMarkdown } from '@/func/exportMarkdown';
import { insertTextWithCursorOffset } from '@/func/insertTextOnCursor';
import { createCitationString, createEquationTagString } from '@/utils/regexp_utils';

export default function registerCommands(plugin: EquationCitator) {
    plugin.addCommand({
        id: 'auto-number-current-file-equations',
        name: 'Auto-number current file equations',
        callback: async() => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const scrollInfo = editor.getScrollInfo();
            
            await autoNumberCurrentFileEquations(plugin);
            // reset the scroll location  
            setTimeout(() => {
                editor.scrollTo(scrollInfo.left, scrollInfo.top);
            }, 50); // delay to allow the editor to update the scroll position 
        }
    });

    plugin.addCommand({
        id: 'insert-equation-citation-on-cursor-position',
        name: 'Insert equation citation on cursor position',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const citePrefix = plugin.settings.citationPrefix;
            const citationString = createCitationString(citePrefix);
            // Move cursor to the correct position 
            insertTextWithCursorOffset(editor, citationString, 6 + citePrefix.length);
        },
    })

    plugin.addCommand({
        id: 'make-markdown-copy-to-export-pdf',
        name: 'Make markdown copy to export PDF',
        callback: async () => {
            exportCurrentMarkdown(plugin);
        }
    })

    plugin.addCommand({
        id: 'insert-tag-on-cursor-position',
        name: 'Insert tag on cursor position',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const tagString = createEquationTagString("");
            // Move cursor inside the braces
            insertTextWithCursorOffset(editor, tagString, 5);
        }
    })

    plugin.addCommand({
        id: 'insert-tag-with-auto-number-on-cursor-position',
        name: 'Insert tag on cursor position with auto-number',
        callback: async () => {
            await insertAutoNumberTag(plugin);
        }
    })
}
