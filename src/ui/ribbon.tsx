import { autoNumberCurrentFileEquations } from '@/func/autoNumber';
import EquationCitator from '@/main';

export default function registerRibbonButton(plugin: EquationCitator) {
    plugin.addRibbonIcon('square-function', 'Auto-number Current File Equations', () => {
        autoNumberCurrentFileEquations(plugin);
    });
}
