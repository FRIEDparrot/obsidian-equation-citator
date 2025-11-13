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
        const { name, desc } = SETTINGS_METADATA.equationManagePanelfileCheckInterval;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(500, 5000, 100);
                slider.setValue(plugin.settings.equationManagePanelfileCheckInterval);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    plugin.settings.equationManagePanelfileCheckInterval = value;
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
    }
};

/**
 * Render the equation panel settings tab as a group of settings.
 * @param containerEl
 * @param plugin
 */
export function addEquationPanelSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    EquationPanelSettingsTab.equationManagePanelDefaultViewType(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelLazyUpdateTime(containerEl, plugin);
    EquationPanelSettingsTab.equationManagePanelFileCheckInterval(containerEl, plugin);
}
