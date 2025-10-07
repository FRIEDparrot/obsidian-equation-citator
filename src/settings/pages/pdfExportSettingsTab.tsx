import EquationCitator from "@/main";
import { Setting } from "obsidian";


export function addPdfExportSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
        containerEl.createEl("h2", { text: "PDF Export Settings", cls: "ec-settings-header" });
        containerEl.createEl("p", {
            text: "💡tip: original pdf export would failed to render citations, please \
use plugin command `Make markdown copy to export PDF`, \
this will make a correctly-rendered markdown from current note to export pdf.\
(superscripts will also be converted to normal superscript grammar)",
            cls: "ec-settings-tip"
        });
        
        // these two colors directly transfer to function `makePrintMarkdown` (so not in style variables)
        const pdfExportColorSetting = new Setting(containerEl);
        pdfExportColorSetting.setName("Citation color for PDF")
            .setDesc("Citation color for PDF export")
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationColorInPdf);
                color.onChange(async (value) => {
                    plugin.settings.citationColorInPdf = value;
                    await plugin.saveSettings();
                });
            });
    }