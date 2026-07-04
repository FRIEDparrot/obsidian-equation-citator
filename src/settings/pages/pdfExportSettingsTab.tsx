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
    },
    addImageCaptionsInPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.addImageCaptionsInPdf;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => { 
                toggle.setValue(plugin.settings.addImageCaptionsInPdf);
                toggle.onChange(async (value) => {
                    plugin.settings.addImageCaptionsInPdf = value;
                    await plugin.saveSettings();
                });
        });
    },
    addImageDescInPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.addImageDescInPdf;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => { 
                toggle.setValue(plugin.settings.addImageDescInPdf);
                toggle.onChange(async (value) => {
                    plugin.settings.addImageDescInPdf = value;
                    await plugin.saveSettings();
                });
        });
    },
    keepImageSpacingForPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.keepImageSpacingForPdf;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.keepImageSpacingForPdf);
                toggle.onChange(async (value) => {
                    plugin.settings.keepImageSpacingForPdf = value;
                    await plugin.saveSettings();
                });
        });
    },
    injectCitationMetadataInExportedMarkdown(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.injectCitationMetadataInExportedMarkdown;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.injectCitationMetadataInExportedMarkdown);
                toggle.onChange(async (value) => {
                    plugin.settings.injectCitationMetadataInExportedMarkdown = value;
                    await plugin.saveSettings();
                });
        });
    },
}   

export function addPdfExportSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) { 
    PdfExportSettingsTab.pdfExportTip(containerEl, plugin); 
    PdfExportSettingsTab.citationColorInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageCaptionsInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageDescInPdf(containerEl, plugin);
    PdfExportSettingsTab.keepImageSpacingForPdf(containerEl, plugin);
    PdfExportSettingsTab.injectCitationMetadataInExportedMarkdown(containerEl, plugin);
}
