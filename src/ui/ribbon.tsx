import { MarkdownView } from 'obsidian';
import { 
    autoNumberCurrentFileEquations,
    autoNumberCurrentFileFigures
} from '@/func/autoNumber';
import EquationCitator from '@/main';
import { EQUATION_MANAGE_PANEL_TYPE } from '@/ui/panels/equationManagePanel/mainPanel';
import { invokeView } from '@/utils/workspace/invokePanelView';
import t from '@/i18n/getLocale';


export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', t("commands.autoNumberCurrentFileEquations"), async () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        await autoNumberCurrentFileEquations(plugin);
    });
    
    plugin.addRibbonIcon('image-play', t("commands.autoNumberCurrentFileFigures"), async () => {
        const editor = plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        await autoNumberCurrentFileFigures(plugin);
    });

    plugin.addRibbonIcon('square-pi', t("commands.openEquationManagePanel"), async () => {
        await invokeView(plugin, EQUATION_MANAGE_PANEL_TYPE);
    });
}
