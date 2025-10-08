import { Notice, Setting } from "obsidian";
import { addSubPanelToggle } from "@/settings/extensions/subPanelToggle";
import { validateDelimiter, validateEquationDisplayFormat, containSafeCharAndNotBlank } from "@/utils/string_processing/string_utils";
import { WidgetSizeManager, WidgetSizeVariable } from "../styleManagers/widgetSizeManager";
import EquationCitator from "@/main";
import { SETTINGS_METADATA } from "../defaultSettings";


export const CITATION_SETTINGS_NAMES = {
    EnableCitationInSourceMode: "Enable in Source Mode",
    CitationPrefix: "Citation Prefix",
    CitationFormat: "Citation Display Format",
    MultiCitationDelimiter: "Multi-Citation Delimiter",
    MultiCitationRenderDelimiter: "Multi-Citation Render Delimiter",
    EnableContinuousCitation: "Enable Continuous Citation",
    ContinuousRangeSymbol: "Continuous Range Symbol",
    ContinuousDelimiters: "Continuous Delimiters",
    EnableCrossFileCitation: "Enable Cross-File Citation",
    FileCiteDelimiter: "File Citation Delimiter",
    FileSuperScriptColor: "File SuperScript Color",
    FileSuperScriptHoverColor: "File SuperScript Hover Color",
    CitationColorInPdf: "Citation Color in PDF"
}

/**
 * All render functions for each setting in the citation settings tab.  
 */
export const CitationSettingsTab = {
    enableCitationInSourceMode(containerEl: HTMLElement, plugin: EquationCitator) {
        const enableCiteInSourceModeSetting = new Setting(containerEl);
        const { name, desc } = SETTINGS_METADATA.enableCitationInSourceMode;
        enableCiteInSourceModeSetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableCitationInSourceMode);
                toggle.onChange(async (value) => {
                    plugin.settings.enableCitationInSourceMode = value;
                    await plugin.saveSettings();
                });
            });
    },

    enableRenderLocalFileName(containerEl: HTMLElement, plugin: EquationCitator) {
        const enableLocalFileNameSetting = new Setting(containerEl);
        enableLocalFileNameSetting.setName(SETTINGS_METADATA.enableRenderLocalFileName.name)
            .setDesc(SETTINGS_METADATA.enableRenderLocalFileName.desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableRenderLocalFileName);
                toggle.onChange(async (value) => {
                    plugin.settings.enableRenderLocalFileName = value;
                    await plugin.saveSettings();
                });
            });
    },

    citationPrefix(containerEl: HTMLElement, plugin: EquationCitator) {
        const citePrefixSetting = new Setting(containerEl);
        citePrefixSetting.setName(SETTINGS_METADATA.citationPrefix.name)
            .setDesc(SETTINGS_METADATA.citationPrefix.desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("eq:");
                text.setValue(plugin.settings.citationPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    const valid = containSafeCharAndNotBlank(newValue);
                    if (!valid) {
                        new Notice("Invalid prefix, {}, $ or blank prefix are not allowed");
                        text.setValue(plugin.settings.citationPrefix);
                        return;
                    }
                    if (newValue !== plugin.settings.citationPrefix && valid) {
                        plugin.settings.citationPrefix = newValue;
                        await plugin.saveSettings();
                    }
                };
            });
    },

    citationFormat(containerEl: HTMLElement, plugin: EquationCitator) {
        const citeFormatSetting = new Setting(containerEl);
        citeFormatSetting.setName(SETTINGS_METADATA.citationFormat.name)
            .setDesc(SETTINGS_METADATA.citationFormat.desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("(#)");
                text.setValue(plugin.settings.citationFormat);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.citationFormat) {
                        if (validateEquationDisplayFormat(newValue)) {
                            plugin.settings.citationFormat = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Invalid format, You must use only one '#' symbol to represent equation number");
                            text.setValue(plugin.settings.citationFormat);
                        }
                    }
                };
            });
    },

    multiCitationDelimiter(containerEl: HTMLElement, plugin: EquationCitator) {
        const multiCitationDelimiterSetting = new Setting(containerEl);
        multiCitationDelimiterSetting.setName(SETTINGS_METADATA.multiCitationDelimiter.name)
            .setDesc(SETTINGS_METADATA.multiCitationDelimiter.desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder(",");
                text.setValue(plugin.settings.multiCitationDelimiter);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.multiCitationDelimiter) {
                        if (validateDelimiter(newValue)) {
                            plugin.settings.multiCitationDelimiter = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
                            text.setValue(plugin.settings.multiCitationDelimiter);
                        }
                    }
                };
            });
    },

    multiCitationDelimiterRender(containerEl: HTMLElement, plugin: EquationCitator) {
        new Setting(containerEl)
            .setName("Multi-Citation Render Delimiter")
            .setDesc("Delimiter shown between citations when rendered (purely visual, e.g. ', ').")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder(", ");
                text.setValue(plugin.settings.multiCitationDelimiterRender);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.multiCitationDelimiterRender) {
                        plugin.settings.multiCitationDelimiterRender = newValue;
                        await plugin.saveSettings();
                    }
                };
            });
    },

    continuousRangeSymbol(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName("Continuous Citation Range Symbol")
            .setDesc("Range symbol for continuous citations in a single cite")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("~");
                text.setValue(plugin.settings.continuousRangeSymbol);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.continuousRangeSymbol) {
                        if (validateDelimiter(newValue)) {
                            plugin.settings.continuousRangeSymbol = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
                            text.setValue(plugin.settings.continuousRangeSymbol);
                        }
                    }
                };
            });
    },

    continuousRangeDelimiters(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName("Continuous Citation Delimiter")
            .setDesc("Delimiter for recognition of continuous citations, split by space")
            .addText((text) => {
                text.inputEl.classList.add("ec-multi-delimiter-input");
                text.setPlaceholder("e.g. '. - : \\_'");
                text.setValue(plugin.settings.continuousDelimiters);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.continuousDelimiters) {
                        const delimiters = newValue.split(" ");
                        const isValid = delimiters.every(d => validateDelimiter(d));
                        if (isValid) {
                            plugin.settings.continuousDelimiters = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed in each delimiter, Change not saved");
                            text.setValue(plugin.settings.continuousDelimiters);
                        }
                    }
                };
            });
    },

    enableContinuousCitation(containerEl: HTMLElement, plugin: EquationCitator) {
        const renderContinuousCitationSetting = new Setting(containerEl);
        renderContinuousCitationSetting.setName("Enable Continuous Citations")
            .setDesc("Enable continuous  citation format, also render citations in continuous format");
        addSubPanelToggle(
            renderContinuousCitationSetting,
            plugin.settings.enableContinuousCitation,
            async (value) => {
                plugin.settings.enableContinuousCitation = value;
                await plugin.saveSettings();
            },
            (panel) => {
                CitationSettingsTab.continuousRangeSymbol(panel, plugin);
                CitationSettingsTab.continuousRangeDelimiters(panel, plugin);
            }
        );
    }
}

/**
 * Render the citation settings tab as a group of settings.
 * @param containerEl 
 * @param plugin 
 */
export function addCitationSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    CitationSettingsTab.enableCitationInSourceMode(containerEl, plugin);
    CitationSettingsTab.enableRenderLocalFileName(containerEl, plugin);
    CitationSettingsTab.citationPrefix(containerEl, plugin);
    CitationSettingsTab.citationFormat(containerEl, plugin);
    CitationSettingsTab.multiCitationDelimiter(containerEl, plugin);
    CitationSettingsTab.multiCitationDelimiterRender(containerEl, plugin);
    // ==================  Continuous citation settings ========== 
    const crossFileSetting = new Setting(containerEl)
        .setName("Enable Cross-File Citations")
        .setDesc("Use pure footnote style citations to cite equations across files");

    addSubPanelToggle(
        crossFileSetting,
        plugin.settings.enableCrossFileCitation,
        async (value) => {
            plugin.settings.enableCrossFileCitation = value,
                await plugin.saveSettings();
        },
        (panel) => {
            new Setting(panel)
                .setName("Cite File Delimiter")
                .setDesc("Delimiter after equation number for footnote file citations")
                .addText((text) => {
                    text.inputEl.classList.add("ec-delimiter-input");
                    text.setPlaceholder("^");
                    text.setValue(plugin.settings.fileCiteDelimiter);
                    text.inputEl.onblur = async () => {
                        const newValue = text.getValue();
                        if (newValue !== plugin.settings.fileCiteDelimiter) {
                            if (validateDelimiter(newValue)) {
                                plugin.settings.fileCiteDelimiter = newValue;
                                await plugin.saveSettings();
                            } else {
                                new Notice("Only special characters (not brace) are allowed, Change not saved");
                                text.setValue(plugin.settings.fileCiteDelimiter);
                            }
                        }
                    };
                });
        }
    );
}


