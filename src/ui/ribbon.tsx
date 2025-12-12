import { MarkdownView } from 'obsidian';
import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import EquationCitator from '@/main';
import { EQUATION_MANAGE_PANEL_TYPE } from '@/ui/panels/equationManagePanel/mainPanel';
import { invokeView } from '@/utils/workspace/invokePanelView';


export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', 'Auto-number current file equations', async () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        const scrollInfo = editor.getScrollInfo();
        await autoNumberCurrentFileEquations(plugin);
        // reset the scroll location  
        setTimeout(() => {
            editor.scrollTo(scrollInfo.left, scrollInfo.top);
        }, 50); // delay to allow the editor to update the scroll position
    });

    plugin.addRibbonIcon('square-pi', 'Open equation manage panel', async() => {
        await invokeView(plugin, EQUATION_MANAGE_PANEL_TYPE);       
    });
}
