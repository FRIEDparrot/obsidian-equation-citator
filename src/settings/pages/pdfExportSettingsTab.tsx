import EquationCitator from "@/main";
import { Setting } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";

export const PdfExportSettingsTab = {
    citationColorInPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationColorInPdf;
        const pdfExportColorSetting = new Setting(containerEl);

        pdfExportColorSetting.setName(name)
            .setDesc(desc)
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationColorInPdf);
                color.onChange(async (value) => {
                    plugin.settings.citationColorInPdf = value;
                    await plugin.saveSettings();
                });
            });
    },
    pdfExportTip(containerEl: HTMLElement, plugin: EquationCitator) {
        containerEl.createEl("p", {
            text: "💡tip: original pdf export would failed to render citations, please use plugin command `Make markdown copy to export PDF`, this will make a correctly-rendered markdown from current note to export pdf.(superscripts will also be converted to normal superscript grammar)",
            cls: "ec-settings-tip"
        });
    }
}

export function addPdfExportSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) { 
    PdfExportSettingsTab.pdfExportTip(containerEl, plugin); 
    PdfExportSettingsTab.citationColorInPdf(containerEl, plugin);
}