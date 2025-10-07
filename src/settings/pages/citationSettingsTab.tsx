import { Notice, Setting } from "obsidian";
import { addSubPanelToggle } from "@/settings/extensions/subPanelToggle";
import { validateDelimiter, validateEquationDisplayFormat, containSafeCharAndNotBlank } from "@/utils/string_processing/string_utils";
import { WidgetSizeManager, WidgetSizeVariable } from "../styleManagers/widgetSizeManager";
import EquationCitator from "@/main";

/**
 * Adds the basic citation settings tab to the settings UI.
 * 
 * @param containerEl - The HTML element to which the settings will be appended.
 * @param plugin - The instance of the EquationCitator plugin containing current settings and methods.
 * 
 * This function creates and appends UI controls for configuring:
 * - Equation preview widget width
 * - Citation prefix
 * - Citation display format
 * 
 * Each setting is bound to the plugin's settings object and will persist changes.
 */
export function addBasicCitationSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    // containerEl.createEl("h1", { text: "Equation Citator Settings", cls: "ec-settings-title" });
    // containerEl.createEl("h2", { text: "Citation Settings", cls: "ec-settings-header" });

    const equationPreviewWidgetWidthSetting = new Setting(containerEl);
    equationPreviewWidgetWidthSetting.setName("Equation Preview Widget Width")
        .setDesc("Width of the equation preview widget in pixels")
        .addSlider((slider) => {
            slider.setLimits(200, 800, 10);
            slider.setDynamicTooltip();
            slider.setValue(plugin.settings.citationPopoverContainerWidth);
            slider.onChange(async (value) => {
                plugin.settings.citationPopoverContainerWidth = value;
                WidgetSizeManager.set(WidgetSizeVariable.ContainerWidth, value);
                await plugin.saveSettings();
            });
        });
        
    const citePrefixSetting = new Setting(containerEl);
    citePrefixSetting.setName("Citation Prefix")
        .setDesc("Prefix used for citations, e.g. 'eq:' means use `\\ref{eq:1.1}` for citation")
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

    const citeFormatSetting = new Setting(containerEl);
    citeFormatSetting.setName("Citation Display Format")
        .setDesc("Display format, use '#' for equation number")
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

    const multiCitationDelimiterSetting = new Setting(containerEl);
    multiCitationDelimiterSetting.setName("Multi-Citation Delimiter")
        .setDesc("Delimiter used for multiple citations in a single cite, e.g. ',' for '\\ref{1.2, 1.3}'")
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

    // Render delimiter (display only, no validation required)
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

    // ==================  Continuous citation settings ==========  
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
        }
    );

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

export function addAdvancedCitationSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    const enableCiteInSourceModeSetting = new Setting(containerEl);
    enableCiteInSourceModeSetting.setName("Enable in Source Mode")
        .setDesc("Enable render citation in source mode")
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.enableCitationInSourceMode);
            toggle.onChange(async (value) => {
                plugin.settings.enableCitationInSourceMode = value;
                await plugin.saveSettings();
            });
        });
    
    const enableLocalFileNameSetting = new Setting(containerEl);
    enableLocalFileNameSetting.setName("Render Local File Name in Equation Preview")
        .setDesc("Render local file name for citations")
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.renderLocalFileName);
            toggle.onChange(async (value) => {
                plugin.settings.renderLocalFileName = value;
                await plugin.saveSettings();
            });
        });
}
