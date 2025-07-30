import EquationCitator from '@/main';
import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import { MarkdownView } from 'obsidian';


export default function registerCommands(plugin: EquationCitator) {
    plugin.addCommand({
        id: 'auto-number-current-file-equations',
        name: 'Auto-number current file equations',
        callback: () => {
            autoNumberCurrentFileEquations(plugin);
        }
    });

    plugin.addCommand({
        id: 'insert-equation-citation-on-cursor-position',
        name: 'Insert equation citation on cursor position',
        callback: () => {
            const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if (!editor)
                return;
            
            const cursorPos = editor.getCursor();
            const citePrefix = plugin.settings.citationPrefix;
            const citationString = `$\\ref{${citePrefix}}$ `;
            // insert citation string at current cursor position  
            editor.replaceRange(citationString, cursorPos);
            
            // const newCursorPos = cursorPos + citationString.indexOf(':') + 1;
            const newCursorPos = {
                line: cursorPos.line,
                ch: cursorPos.ch + 6 + citePrefix.length
            };
            editor.setCursor(newCursorPos);
        }, 
    })
}
