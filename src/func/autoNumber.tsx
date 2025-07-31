import EquationCitator from "@/main";
import { CurrentFileProcessor } from '@/utils/fileProcessor';
import {  autoNumberEquations } from "@/utils/auto_number";

export function autoNumberCurrentFileEquations(plugin: EquationCitator) {
    const pluginSettings = plugin.settings;
    const prefix = pluginSettings.autoNumberPrefixEnabled? pluginSettings.autoNumberPrefix : "";
    const processor = new CurrentFileProcessor(
                plugin,
                (content) => {
                    const result = autoNumberEquations(
                        content,
                        pluginSettings.autoNumberType,
                        pluginSettings.autoNumberDepth,
                        pluginSettings.autoNumberDelimiter,
                        pluginSettings.autoNumberNoHeadingPrefix,
                        prefix,
                        pluginSettings.autoNumberEquationsInQuotes
                    )
                    return Promise.resolve(result); 
                }
            );
            processor.execute(); 
}

