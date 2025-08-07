import EquationCitator from '@/main';
import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import { MarkdownView } from 'obsidian';
import { exportCurrentMarkdown } from '@/func/exportMarkdown';
import { insertTextWithCursorOffset } from '@/func/insertTextOnCursor';

export default function registerCommands(plugin: EquationCitator) {
    plugin.addCommand({
        id: 'auto-number-current-file-equations',
        name: 'Auto-number current file equations',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const scrollInfo = editor.getScrollInfo();
            
            autoNumberCurrentFileEquations(plugin);
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
            const citationString = `$\\ref{${citePrefix}}$ `;
            // Move cursor to inside the braces after `\ref{`
            insertTextWithCursorOffset(editor, citationString, 6 + citePrefix.length);
        },
    })

    plugin.addCommand({
        id: 'insert-tag-on-cursor-position',
        name: 'Insert tag on cursor position',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor) return;
            const tagString = '\\tag{}';
            // Move cursor inside the braces
            insertTextWithCursorOffset(editor, tagString, 5);
        }
    })

    plugin.addCommand({
        id: 'make-markdown-copy-to-export-pdf',
        name: 'Make markdown copy to export PDF',
        callback: async () => {
            exportCurrentMarkdown(plugin);
        }
    })
}
