import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import { parseEquationsInMarkdown } from '@/utils/equation_utils';
import EquationCitator from '@/main';

export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', 'Auto-number Current File Equations', () => {
        autoNumberCurrentFileEquations(plugin);
    });
    plugin.addRibbonIcon('dice', 'Parse Current Markdown', async () => {
        const file = plugin.app.workspace.getActiveFile();
        if (!file) return;
        const content = await plugin.app.vault.read(file);
        const equations = parseEquationsInMarkdown(content);
        console.log(equations);
    })
}
