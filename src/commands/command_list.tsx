import EquationCitator from '@/main';
import { autoNumberCurrentFileEquations, insertAutoNumberTag } from '@/func/autoNumber';
import { MarkdownView } from 'obsidian';
import { exportCurrentMarkdown } from '@/func/exportMarkdown';
import { insertTextWithCursorOffset } from '@/utils/workspace/insertTextOnCursor';
import { createCitationString, createEquationTagString } from '@/utils/string_processing/regexp_utils';
import { Notice } from 'obsidian';
import { invokeView } from '@/utils/workspace/invokePanelView';
import { EQUATION_MANAGE_PANEL_TYPE } from '@/ui/panels/equationManagePanel/mainPanel';

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
        id: 'insert-citation-on-cursor-position',
        name: 'Insert a citation on cursor position',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const citeString = createCitationString("");
            // Move cursor inside the braces
            insertTextWithCursorOffset(editor, citeString, 6);
        }
    })

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
        id: 'make-markdown-copy-to-export-PDF',
        name: 'Make a Markdown copy to export PDF',
        callback: async () => {
            await exportCurrentMarkdown(plugin);
        }
    })

    plugin.addCommand({
        id: 'insert-tag-on-cursor-position',
        name: 'Insert tag on cursor position',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const tagString = createEquationTagString("", plugin.settings.enableTypstMode);
            // Move cursor inside the braces
            insertTextWithCursorOffset(editor, tagString, plugin.settings.enableTypstMode ? 8 : 5);
        }
    })

    plugin.addCommand({
        id: 'insert-tag-with-auto-number-on-cursor-position',
        name: 'Insert tag on cursor position with auto-number',
        callback: () => {
            insertAutoNumberTag(plugin);
        }
    })

    
    plugin.addCommand({
        id: 'clear-cache',
        name: 'Clear plugin cache', 
        callback: () => {
            plugin.clearCaches();
            new Notice("All caches cleared"); 
        }
    })

    plugin.addCommand({
        id: 'open-equation-manage-panel',
        name: 'Open equation manage panel',
        callback: async () => {
            await invokeView(plugin, EQUATION_MANAGE_PANEL_TYPE)
        }
    })
}
