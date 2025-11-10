import { Notice, Setting } from "obsidian";
import { addSubPanelToggle } from "@/settings/extensions/subPanelToggle";
import { validateDelimiter, validateEquationDisplayFormat, containSafeCharAndNotBlank } from "@/utils/string_processing/string_utils";
import EquationCitator from "@/main";
import { SETTINGS_METADATA } from "../defaultSettings";

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
            .setName(SETTINGS_METADATA.multiCitationDelimiterRender.name)
            .setDesc(SETTINGS_METADATA.multiCitationDelimiterRender.desc)
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

    //#region  Continuous citation settings Groups  
    enableContinuousCitation(containerEl: HTMLElement, plugin: EquationCitator, renderSubpanel = true) {
        const renderContinuousCitationSetting = new Setting(containerEl);
        renderContinuousCitationSetting.setName(SETTINGS_METADATA.enableContinuousCitation.name)
            .setDesc(SETTINGS_METADATA.enableContinuousCitation.desc);

        addSubPanelToggle(
            renderContinuousCitationSetting,
            plugin.settings.enableContinuousCitation,
            async (value) => {
                plugin.settings.enableContinuousCitation = value;
                await plugin.saveSettings();
            },
            (panel) => {
                CitationSettingsTab.continuousRangeSymbol(panel, plugin);
                CitationSettingsTab.continuousDelimiters(panel, plugin);
            },
            renderSubpanel
        );
    },

    continuousRangeSymbol(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName(SETTINGS_METADATA.continuousRangeSymbol.name)
            .setDesc(SETTINGS_METADATA.continuousRangeSymbol.desc)
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
    
    continuousDelimiters(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName(SETTINGS_METADATA.continuousDelimiters.name)
            .setDesc(SETTINGS_METADATA.continuousDelimiters.desc)
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
    //#endregion 

    //#region  Cross-file citation settings Groups
    enableCrossFileCitation(containerEl: HTMLElement, plugin: EquationCitator, renderSubpanel = true) {
        const crossFileSetting = new Setting(containerEl)
            .setName(SETTINGS_METADATA.enableCrossFileCitation.name)
            .setDesc(SETTINGS_METADATA.enableCrossFileCitation.desc);
        addSubPanelToggle(
            crossFileSetting,
            plugin.settings.enableCrossFileCitation,
            async (value) => {
                plugin.settings.enableCrossFileCitation = value,
                    await plugin.saveSettings();
            },
            (panel) => {
                CitationSettingsTab.fileCiteDelimiter(panel, plugin); // Render child setting
            },
            renderSubpanel
        );
    },

    fileCiteDelimiter(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName(SETTINGS_METADATA.fileCiteDelimiter.name)
            .setDesc(SETTINGS_METADATA.fileCiteDelimiter.desc)
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
    },

    figCitationPrefix(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName(SETTINGS_METADATA.figCitationPrefix.name)
            .setDesc(SETTINGS_METADATA.figCitationPrefix.desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("fig:");
                text.setValue(plugin.settings.figCitationPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (!newValue.endsWith(":")) {
                        new Notice("Please add a colon (:) to the end of the prefix, Change not saved");
                        text.setValue(plugin.settings.figCitationPrefix);
                        return;
                    }
                    if (newValue !== plugin.settings.figCitationPrefix) {
                        if (containSafeCharAndNotBlank(newValue)) {
                            plugin.settings.figCitationPrefix = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
                        }
                    }
                }
            })
    },

    figCitationFormat(panel: HTMLElement, plugin: EquationCitator) {
        new Setting(panel)
            .setName(SETTINGS_METADATA.figCitationFormat.name)
            .setDesc(SETTINGS_METADATA.figCitationFormat.desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("fig: #");
                text.setValue(plugin.settings.figCitationFormat);
                text.inputEl.onblur = async () => { 
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.figCitationFormat) { 
                        if (validateEquationDisplayFormat(newValue)) {
                            plugin.settings.figCitationFormat = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Invalid format, Change not saved");
                            text.setValue(plugin.settings.figCitationFormat);
                        }
                    }
                };
            })
    },
    
    quoteCitationPrefixes(containerEl: HTMLElement, plugin: EquationCitator) {
        new Setting(containerEl)
            .setName(SETTINGS_METADATA.quoteCitationPrefixes.name)
            .setDesc(SETTINGS_METADATA.quoteCitationPrefixes.desc);
        
        // Container for the list of prefixes
        const prefixListContainer = containerEl.createDiv("ec-prefix-list-container");

        const renderPrefixList = () => {
            prefixListContainer.empty();

            // Render each existing prefix
            plugin.settings.quoteCitationPrefixes.forEach((prefix, index) => {
                const setting = new Setting(prefixListContainer)
                    .setClass("ec-prefix-item");

                // Remove default name/desc to make layout cleaner
                setting.setName("");
                setting.setDesc("");

                // Add text input first (moves it to the front)
                setting.addText((text) => {
                    text.inputEl.classList.add("ec-delimiter-input");
                    text.setValue(prefix);
                    text.setPlaceholder("e.g., table:");
                    text.inputEl.onblur = async () => {
                        const newValue = text.getValue().trim();
                        if (!newValue.endsWith(":")) {
                            new Notice("Prefix must end with colon (:)");
                            text.setValue(prefix);
                            return;
                        }
                        if (newValue === "title:" || newValue === "desc:") {
                            new Notice("'title:' and 'desc:' are reserved keywords and cannot be used as citation prefixes");
                            text.setValue(prefix);
                            return;
                        }
                        if (!containSafeCharAndNotBlank(newValue)) {
                            new Notice("Invalid prefix: {}, $, or blank are not allowed");
                            text.setValue(prefix);
                            return;
                        }
                        if (newValue !== prefix) {
                            // Check for duplicates
                            if (plugin.settings.quoteCitationPrefixes.includes(newValue)) {
                                new Notice("This prefix already exists");
                                text.setValue(prefix);
                                return;
                            }
                            plugin.settings.quoteCitationPrefixes[index] = newValue;
                            await plugin.saveSettings();
                        }
                    };
                });

                // Add remove button after text input
                setting.addButton((button) => {
                    button.setButtonText("Remove")
                        .setClass("mod-warning")
                        .onClick(async () => {
                            plugin.settings.quoteCitationPrefixes.splice(index, 1);
                            await plugin.saveSettings();
                            renderPrefixList();
                        });
                });
            });

            // Add "Add New Prefix" button
            new Setting(prefixListContainer)
                .setClass("ec-add-prefix-setting")
                .addButton((button) => {
                    button.setButtonText("Add New Prefix")
                        .setClass("mod-cta")
                        .onClick(() => {
                            // Find a unique default prefix
                            let newPrefix = "custom:";
                            let counter = 1;
                            while (plugin.settings.quoteCitationPrefixes.includes(newPrefix)) {
                                newPrefix = `custom${counter}:`;
                                counter++;
                            }
                            plugin.settings.quoteCitationPrefixes.push(newPrefix);
                            plugin.saveSettings();
                            renderPrefixList();
                        });
                });
        };

        renderPrefixList();
    }
    //#endregion  
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
    CitationSettingsTab.figCitationPrefix(containerEl, plugin);
    CitationSettingsTab.figCitationFormat(containerEl, plugin);
    CitationSettingsTab.quoteCitationPrefixes(containerEl, plugin);
    CitationSettingsTab.multiCitationDelimiter(containerEl, plugin);
    CitationSettingsTab.multiCitationDelimiterRender(containerEl, plugin);
    CitationSettingsTab.enableContinuousCitation(containerEl, plugin, true); // Render sub panel (not call child render functions)
    CitationSettingsTab.enableCrossFileCitation(containerEl, plugin, true); // Render sub panel (not call child render functions)
}
