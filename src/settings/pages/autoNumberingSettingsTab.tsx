import { validateDelimiter, validateLetterPrefix } from "@/utils/string_processing/string_utils";
import { Notice, Setting } from "obsidian";
import { AutoNumberingType } from "@/utils/core/auto_number_utils";
import EquationCitator from "@/main";
import { addSubPanelToggle } from "../extensions/subPanelToggle";

export function addAutoNumberSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    const autoNumberingDelimiterSetting = new Setting(containerEl);
    autoNumberingDelimiterSetting.setName("Auto Numbering Delimiter")
        .setDesc("Delimiter used for numbering equations, e.g. '.' for '1.1', '-' for '1-1', etc")
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
                        new Notice("Only special characters (not brace) are allowed, Change not saved");
                        text.setValue(plugin.settings.autoNumberDelimiter);
                    }
                }
            };
        });
    
    const autoNumberingLevelSetting = new Setting(containerEl);
    autoNumberingLevelSetting.setName("Auto Numbering Depth")
        .setDesc("Maximum depth for equation numbers (e.g., depth of 2 gives '1.1', depth of 3 gives '1.1.1')")
        .addSlider((slider) => {
            slider.setLimits(1, 6, 1);
            slider.setValue(plugin.settings.autoNumberDepth || 1);
            slider.setDynamicTooltip();
            slider.onChange(async (value) => {
                plugin.settings.autoNumberDepth = value;
                await plugin.saveSettings();
            });
        });

    const autoNumberingMethodSetting = new Setting(containerEl);
    autoNumberingMethodSetting.setName("Auto Numbering Method")
        .setDesc("Use absolute or relative heading level for auto numbering")
        .addDropdown((dropdown) => {
            dropdown.addOption("Relative", "Relative");
            dropdown.addOption("Absolute", "Absolute");
            dropdown.setValue(plugin.settings.autoNumberType);
            dropdown.onChange(async (value) => {
                plugin.settings.autoNumberType = value as AutoNumberingType;
                await plugin.saveSettings();
            });
        });

    const autoNumberingNoHeadingPrefixSetting = new Setting(containerEl);

    autoNumberingNoHeadingPrefixSetting
        .setName("Auto Numbering No Heading Prefix")
        .setDesc("Prefix for equations without any heading level (e.g., 'P1', 'P2', etc.)")
        .addText((text) => {
            text.inputEl.classList.add("ec-delimiter-input");
            text.setPlaceholder("Default: P");
            text.setValue(plugin.settings.autoNumberNoHeadingPrefix);
            text.inputEl.onblur = async () => {
                const newValue = text.getValue();
                if (newValue !== plugin.settings.autoNumberNoHeadingPrefix) {
                    if (validateLetterPrefix(newValue)) {
                        plugin.settings.autoNumberNoHeadingPrefix = newValue;
                        await plugin.saveSettings();
                    } else {
                        new Notice("Only letters are allowed, Change not saved");
                        text.setValue(plugin.settings.autoNumberNoHeadingPrefix);
                    }
                }
            };
        });

    const autoNumberingPrefixSetting = new Setting(containerEl);
    autoNumberingPrefixSetting.setName("Enable Auto-number prefix")
        .setDesc("Auto equation numbering prefix for purpose like chapter")

    addSubPanelToggle(
        autoNumberingPrefixSetting,
        plugin.settings.autoNumberPrefixEnabled,
        (toggle) => {
            plugin.settings.autoNumberPrefixEnabled = toggle;
            plugin.saveSettings();
        },
        (panel) => {
            new Setting(panel)
                .setName("Auto Numbering Prefix")
                .setDesc("Prefix for all auto numbered equations (e.g., '10.' for '10.1', '10.2', etc.)")
                .addText((text) => {
                    text.inputEl.classList.add("ec-delimiter-input");
                    text.setValue(plugin.settings.autoNumberPrefix);
                    text.inputEl.onblur = async () => {
                        const newValue = text.getValue();
                        if (newValue !== plugin.settings.autoNumberPrefix) {
                            plugin.settings.autoNumberPrefix = newValue;
                            await plugin.saveSettings();
                        }
                    };
                });
        }
    );

    const autoNumberingQuotesSetting = new Setting(containerEl);
    autoNumberingQuotesSetting.setName("Auto Numbering Equations in Quotes")
        .setDesc("Enable auto numbering for equations in quotes")
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.autoNumberEquationsInQuotes);
            toggle.onChange(async (value) => {
                plugin.settings.autoNumberEquationsInQuotes = value;
                await plugin.saveSettings();
            });
        });

    const enableUpdateTagsInAutoNumberSetting = new Setting(containerEl);
    enableUpdateTagsInAutoNumberSetting.setName("Auto Update Citations in Auto Numbering")
        .setDesc("Enable auto update citations during auto numbering")

    addSubPanelToggle(
        enableUpdateTagsInAutoNumberSetting,
        plugin.settings.enableUpdateTagsInAutoNumbering,
        (toggle) => {
            plugin.settings.enableUpdateTagsInAutoNumbering = toggle;
            plugin.saveSettings();
        },
        (panel) => {
            const deleteRepeatTagsInAutoNumberSetting = new Setting(panel);
            deleteRepeatTagsInAutoNumberSetting.setName("Auto Delete Conflicting Tag Citations")
                .setDesc("Automatically delete conflicting tag citations during auto numbering, instead of prompting you each time.")
                .addToggle((toggle) => {
                    toggle.setTooltip("If two tags are assigned the same number during auto numbering, the original citation will be automatically deleted without confirmation. Equivalent to always choosing 'Delete' when renaming tags.");
                    toggle.setValue(plugin.settings.deleteRepeatTagsInAutoNumbering);
                    toggle.onChange(async (value) => {
                        plugin.settings.deleteRepeatTagsInAutoNumbering = value;
                        await plugin.saveSettings();
                    });
                });
            
            const deleteUnusedTagsInAutoNumberSetting = new Setting(panel);
            deleteUnusedTagsInAutoNumberSetting
                .setName("Auto Delete Unused Tags Citations")
                .setDesc("Delete unused tag citations when auto numbering all equations")
                .addToggle((toggle) => {
                    toggle.setValue(plugin.settings.deleteUnusedTagsInAutoNumbering);
                    toggle.setTooltip("Deletes citations (e.g., \\ref{1.3.4}) that don't match any equation included in auto-numbering. Citations inside quotes are preserved only if “Auto Numbering Equations in Quotes” is enabled.");
                    toggle.onChange(async (value) => {
                        plugin.settings.deleteUnusedTagsInAutoNumbering = value;
                        await plugin.saveSettings();
                    });
                });

            deleteUnusedTagsInAutoNumberSetting.settingEl.addClass("ec-settings-nodelimter");
        }
    );
}
