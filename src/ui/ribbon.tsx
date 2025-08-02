import { MarkdownView } from 'obsidian';
import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import EquationCitator from '@/main';

export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', 'Auto-number Current File Equations', () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        const scrollInfo = editor.getScrollInfo();
        autoNumberCurrentFileEquations(plugin);
        // reset the scroll location  
        setTimeout(() => {
            editor.scrollTo(scrollInfo.left, scrollInfo.top);
        }, 50); // delay to allow the editor to update the scroll position
    });
}
