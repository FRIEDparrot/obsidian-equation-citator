import { Setting } from "obsidian";
import EquationCitator from "@/main";
import { SETTINGS_METADATA } from "../defaultSettings";

/**
 * All render functions for each setting in the equation panel settings tab.
 */
export const EquationPanelSettingsTab = {
    equationManagePanelLazyUpdateTime(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelLazyUpdateTime;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(1000, 10000, 500);
                slider.setValue(plugin.settings.equationManagePanelLazyUpdateTime);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    plugin.settings.equationManagePanelLazyUpdateTime = value;
                    await plugin.saveSettings();
                });
            });
    },

    equationManagePanelFileCheckInterval(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelFileCheckInterval;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(500, 5000, 100);
                slider.setValue(plugin.settings.equationManagePanelFileCheckInterval);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    plugin.settings.equationManagePanelFileCheckInterval = value;
                    await plugin.saveSettings();
                });
            });
    },

    equationManagePanelDefaultViewType(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelDefaultViewType;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addDropdown((dropdown) => {
                dropdown.addOption("outline", "Outline view");
                dropdown.addOption("list", "List view");
                dropdown.setValue(plugin.settings.equationManagePanelDefaultViewType);
                dropdown.onChange(async (value) => {
                    plugin.settings.equationManagePanelDefaultViewType = value as "outline" | "list";
                    await plugin.saveSettings();
                });
            });
    },

    equationManagePanelPreviewObjectType(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelPreviewObjectType;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addDropdown((dropdown) => {
                dropdown.addOption("equation", "Equations");
                dropdown.addOption("figure", "Figures");
                dropdown.addOption("callout", "Callouts");
                dropdown.setValue(plugin.settings.equationManagePanelPreviewObjectType);
                dropdown.onChange(async (value) => {
                    plugin.settings.equationManagePanelPreviewObjectType = value as "equation" | "figure" | "callout";
                    await plugin.saveSettings();
                });
            });
    },

    equationManagePanelFilterTagOnlyEquation(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelFilterTagOnlyEquation;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.equationManagePanelFilterTagOnlyEquation);
                toggle.onChange(async (value) => {
                    plugin.settings.equationManagePanelFilterTagOnlyEquation = value;
                    await plugin.saveSettings();
                });
            })
    },
    equationManagePanelFilterBoxedEquation(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelFilterBoxedEquation;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.equationManagePanelFilterBoxedEquation);
                toggle.onChange(async (value) => {
                    plugin.settings.equationManagePanelFilterBoxedEquation = value;
                    await plugin.saveSettings();
                });
            })
    },
    skipFirstlineInBoxedFilter(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.skipFirstlineInBoxedFilter;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.skipFirstlineInBoxedFilter);
                toggle.onChange(async (value) => {
                    plugin.settings.skipFirstlineInBoxedFilter = value;
                    await plugin.saveSettings();
                });
            })
    },
    equationManagePanelEnableRenderHeadingsOnly(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationManagePanelEnableRenderHeadingsOnly;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.equationManagePanelEnableRenderHeadingsOnly);
                toggle.onChange(async (value) => {
                    plugin.settings.equationManagePanelEnableRenderHeadingsOnly = value;
                    await plugin.saveSettings();
                });
            })
    },
    equationWidgetRightClickCopyType(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.equationWidgetRightClickCopyType;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addDropdown((dropdown) => {
                dropdown.addOption("full", "Full equation");
                dropdown.addOption("noTag", "Without tags");
                dropdown.addOption("eq", "Without tags and braces");
                dropdown.setValue(plugin.settings.equationWidgetRightClickCopyType);
                dropdown.onChange(async (value) => {
                    plugin.settings.equationWidgetRightClickCopyType = value as "full" | "noTag" | "eq";
                    await plugin.saveSettings();
                });
            });
    },
    useFastMathRenderer(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.useFastMathRenderer;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.useFastMathRenderer);
                toggle.onChange(async (value) => {
                    plugin.settings.useFastMathRenderer = value;
                    await plugin.saveSettings();
                });
            });
    },
};

/**
 * Render the equation panel settings tab as a group of settings.
 * @param containerEl
 * @param plugin
 */
export function addEquationPanelSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    EquationPanelSettingsTab.equationManagePanelDefaultViewType(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelPreviewObjectType(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelFilterTagOnlyEquation(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelFilterBoxedEquation(containerEl, plugin);
    EquationPanelSettingsTab.skipFirstlineInBoxedFilter(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelEnableRenderHeadingsOnly(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelLazyUpdateTime(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelFileCheckInterval(containerEl, plugin);
    EquationPanelSettingsTab.equationWidgetRightClickCopyType(containerEl, plugin);
    EquationPanelSettingsTab.useFastMathRenderer(containerEl, plugin);
}
