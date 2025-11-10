import { MarkdownView } from 'obsidian';
import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import EquationCitator from '@/main';
import { EQUATION_ARRANGE_PANEL_TYPE } from '@/ui/panels/equationArrangePanel';
import { invokeView } from '@/ui/invokePanelView';


export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', 'Auto-number Current File Equations', async () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        const scrollInfo = editor.getScrollInfo();
        await autoNumberCurrentFileEquations(plugin);
        // reset the scroll location  
        setTimeout(() => {
            editor.scrollTo(scrollInfo.left, scrollInfo.top);
        }, 50); // delay to allow the editor to update the scroll position
    });

    plugin.addRibbonIcon('rocket', 'Equation Citator', () => {
        invokeView(plugin, EQUATION_ARRANGE_PANEL_TYPE);        
    });
}
