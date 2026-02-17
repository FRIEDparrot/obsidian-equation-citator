import { MarkdownView } from 'obsidian';
import { 
    autoNumberCurrentFileEquations,
    autoNumberCurrentFileFigures
} from '@/func/autoNumber';
import EquationCitator from '@/main';
import { EQUATION_MANAGE_PANEL_TYPE } from '@/ui/panels/equationManagePanel/mainPanel';
import { invokeView } from '@/utils/workspace/invokePanelView';


export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', 'Auto-number current file equations', async () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        await autoNumberCurrentFileEquations(plugin);
    });
    
    plugin.addRibbonIcon('image-play', 'Auto-number current file figures', async () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        await autoNumberCurrentFileFigures(plugin);
    });

    plugin.addRibbonIcon('square-pi', 'Open equation manage panel', async () => {
        await invokeView(plugin, EQUATION_MANAGE_PANEL_TYPE);
    });
}
