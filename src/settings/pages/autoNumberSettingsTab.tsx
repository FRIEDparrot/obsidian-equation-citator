import { SETTINGS_METADATA } from "../defaultSettings";
import { Notice, Setting } from "obsidian";
import { AutoNumberingType } from "@/utils/core/auto_number_core";
import EquationCitator from "@/main";
import { addSubPanelToggle } from "../extensions/subPanelToggle";
import { validateDelimiter, validateLetterPrefix } from "@/utils/string_processing/string_utils";

/**
 * All render functions for each setting in the auto numbering settings tab.
 */
export const AutoNumberSettingsTab = {
    autoNumberDelimiter(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.autoNumberDelimiter;
        const autoNumberDelimiterSetting = new Setting(containerEl);
        autoNumberDelimiterSetting.setName(name)
            .setDesc(desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("Default: .");
                text.setValue(plugin.settings.autoNumberDelimiter);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.autoNumberDelimiter) {
                        if (validateDelimiter(newValue)) {
                            plugin.settings.autoNumberDelimiter = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed, change not saved");
                            text.setValue(plugin.settings.autoNumberDelimiter);
                        }
                    }
                };
            });
    },

    autoNumberDepth(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.autoNumberDepth;
        const autoNumberLevelSetting = new Setting(containerEl);
        autoNumberLevelSetting.setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(1, 6, 1);
                slider.setValue(plugin.settings.autoNumberDepth || 1);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    plugin.settings.autoNumberDepth = value;
                    await plugin.saveSettings();
                });
            });
    },

    autoNumberType(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.autoNumberType
        const autoNumberMethodSetting = new Setting(containerEl);
        autoNumberMethodSetting.setName(name)
            .setDesc(desc)
            .addDropdown((dropdown) => {
                dropdown.addOption("Relative", "Relative");
                dropdown.addOption("Absolute", "Absolute");
                dropdown.setValue(plugin.settings.autoNumberType);
                dropdown.onChange(async (value) => {
                    plugin.settings.autoNumberType = value as AutoNumberingType;
                    await plugin.saveSettings();
                });
            });
    },

    autoNumberNoHeadingPrefix(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.autoNumberNoHeadingPrefix;
        const autoNumberingNoHeadingPrefixSetting = new Setting(containerEl);
        autoNumberingNoHeadingPrefixSetting.setName(name)
            .setDesc(desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("P");
                text.setValue(plugin.settings.autoNumberNoHeadingPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.autoNumberNoHeadingPrefix) {
                        if (validateLetterPrefix(newValue)) {
                            plugin.settings.autoNumberNoHeadingPrefix = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only letters are allowed, change not saved");
                            text.setValue(plugin.settings.autoNumberNoHeadingPrefix);
                        }
                    }
                };
            });
    },

    enableAutoNumberGlobalPrefix(
        containerEl: HTMLElement, plugin: EquationCitator,
        renderSubpanel = true) {
        const { name, desc } = SETTINGS_METADATA.enableAutoNumberGlobalPrefix;
        const autoNumberingPrefixSetting = new Setting(containerEl);
        autoNumberingPrefixSetting.setName(name)
            .setDesc(desc);
        addSubPanelToggle(
            autoNumberingPrefixSetting,
            plugin.settings.enableAutoNumberGlobalPrefix,
            async (toggle) => {
                plugin.settings.enableAutoNumberGlobalPrefix = toggle;
                await plugin.saveSettings();
            },
            (panel) => {
                AutoNumberSettingsTab.autoNumberGlobalPrefix(panel, plugin);
            },
            renderSubpanel
        );
    },

    autoNumberGlobalPrefix(panel: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.autoNumberGlobalPrefix;
        new Setting(panel)
            .setName(name)
            .setDesc(desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setValue(plugin.settings.autoNumberGlobalPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.autoNumberGlobalPrefix) {
                        plugin.settings.autoNumberGlobalPrefix = newValue;
                        await plugin.saveSettings();
                    }
                };
            });
    },

    enableAutoNumberEquationsInQuotes(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.enableAutoNumberEquationsInQuotes;
        const autoNumberingQuotesSetting = new Setting(containerEl);
        autoNumberingQuotesSetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableAutoNumberEquationsInQuotes);
                toggle.onChange(async (value) => {
                    plugin.settings.enableAutoNumberEquationsInQuotes = value;
                    await plugin.saveSettings();
                });
            });
    },

    enableAutoNumberTaggedEquationsOnly(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.enableAutoNumberTaggedEquationsOnly;
        const autoNumberingTaggedOnlySetting = new Setting(containerEl);
        autoNumberingTaggedOnlySetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableAutoNumberTaggedEquationsOnly);
                toggle.onChange(async (value) => {
                    plugin.settings.enableAutoNumberTaggedEquationsOnly = value;
                    await plugin.saveSettings();
                });
            });
    },

    figAutoNumberingDepth(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.figAutoNumberingDepth;
        const figAutoNumberLevelSetting = new Setting(containerEl);
        figAutoNumberLevelSetting.setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(1, 6, 1);
                slider.setValue(plugin.settings.figAutoNumberingDepth || 1);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    plugin.settings.figAutoNumberingDepth = value;
                    await plugin.saveSettings();
                });
            });
    },

    figAutoNumberNoHeadingPrefix(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.figAutoNumberNoHeadingPrefix;
        const figAutoNumberingNoHeadingPrefixSetting = new Setting(containerEl);
        figAutoNumberingNoHeadingPrefixSetting.setName(name)
            .setDesc(desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("F");
                text.setValue(plugin.settings.figAutoNumberNoHeadingPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.figAutoNumberNoHeadingPrefix) {
                        if (validateLetterPrefix(newValue)) {
                            plugin.settings.figAutoNumberNoHeadingPrefix = newValue;
                            await plugin.saveSettings();
                        } else {
                            new Notice("Only letters are allowed, change not saved");
                            text.setValue(plugin.settings.figAutoNumberNoHeadingPrefix);
                        }
                    }
                };
            });
    },

    figAutoNumberGlobalPrefix(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.figAutoNumberGlobalPrefix;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setValue(plugin.settings.figAutoNumberGlobalPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== plugin.settings.figAutoNumberGlobalPrefix) {
                        plugin.settings.figAutoNumberGlobalPrefix = newValue;
                        await plugin.saveSettings();
                    }
                };
            });
    },

    enableAutoNumberFigsInQuotes(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.enableAutoNumberFigsInQuotes;
        const autoNumberingFigsInQuotesSetting = new Setting(containerEl);
        autoNumberingFigsInQuotesSetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableAutoNumberFigsInQuotes);
                toggle.onChange(async (value) => {
                    plugin.settings.enableAutoNumberFigsInQuotes = value;
                    await plugin.saveSettings();
                });
            });
    },

    enableAutoNumberTaggedFigsOnly(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.enableAutoNumberTaggedFigsOnly;
        const autoNumberingTaggedFigsOnlySetting = new Setting(containerEl);
        autoNumberingTaggedFigsOnlySetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableAutoNumberTaggedFigsOnly);
                toggle.onChange(async (value) => {
                    plugin.settings.enableAutoNumberTaggedFigsOnly = value;
                    await plugin.saveSettings();
                });
            });
    },

    enableUpdateTagsInAutoNumber(containerEl: HTMLElement, plugin: EquationCitator, renderSubpanel = true) {
        const { name, desc } = SETTINGS_METADATA.enableUpdateTagsInAutoNumber;
        const enableUpdateTagsInAutoNumberSetting = new Setting(containerEl);
        enableUpdateTagsInAutoNumberSetting.setName(name)
            .setDesc(desc);

        addSubPanelToggle(
            enableUpdateTagsInAutoNumberSetting,
            plugin.settings.enableUpdateTagsInAutoNumber,
            async (toggle) => {
                plugin.settings.enableUpdateTagsInAutoNumber = toggle;
                await plugin.saveSettings();
            },
            (panel) => {
                AutoNumberSettingsTab.deleteRepeatTagsInAutoNumber(panel, plugin);
                AutoNumberSettingsTab.deleteUnusedTagsInAutoNumber(panel, plugin);
            },
            renderSubpanel,
        );
    },
    deleteRepeatTagsInAutoNumber(panel: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.deleteRepeatTagsInAutoNumber;
        new Setting(panel)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setTooltip("If two tags are assigned the same number during auto numbering, the original citation will be automatically deleted.");
                toggle.setValue(plugin.settings.deleteRepeatTagsInAutoNumber);
                toggle.onChange(async (value) => {
                    plugin.settings.deleteRepeatTagsInAutoNumber = value;
                    await plugin.saveSettings();
                });
            });
    },
    deleteUnusedTagsInAutoNumber(panel: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.deleteUnusedTagsInAutoNumber;
        new Setting(panel)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.deleteUnusedTagsInAutoNumber);
                toggle.setTooltip("Deletes citations that don't match any equation included in auto-numbering.");
                toggle.onChange(async (value) => {
                    plugin.settings.deleteUnusedTagsInAutoNumber = value;
                    await plugin.saveSettings();
                });
            });
    }
};

/**
 * Render the auto numbering settings tab as a group of settings.
 * @param containerEl 
 * @param plugin 
 */
export function addAutoNumberSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    AutoNumberSettingsTab.autoNumberDelimiter(containerEl, plugin);
    AutoNumberSettingsTab.autoNumberDepth(containerEl, plugin);
    AutoNumberSettingsTab.autoNumberType(containerEl, plugin);
    AutoNumberSettingsTab.autoNumberNoHeadingPrefix(containerEl, plugin);
    AutoNumberSettingsTab.enableAutoNumberGlobalPrefix(containerEl, plugin, true);
    AutoNumberSettingsTab.enableAutoNumberEquationsInQuotes(containerEl, plugin);
    AutoNumberSettingsTab.enableAutoNumberTaggedEquationsOnly(containerEl, plugin);
    AutoNumberSettingsTab.figAutoNumberingDepth(containerEl, plugin);
    AutoNumberSettingsTab.figAutoNumberNoHeadingPrefix(containerEl, plugin);
    AutoNumberSettingsTab.figAutoNumberGlobalPrefix(containerEl, plugin);
    AutoNumberSettingsTab.enableAutoNumberFigsInQuotes(containerEl, plugin);
    AutoNumberSettingsTab.enableAutoNumberTaggedFigsOnly(containerEl, plugin);
    AutoNumberSettingsTab.enableUpdateTagsInAutoNumber(containerEl, plugin, true);
}
