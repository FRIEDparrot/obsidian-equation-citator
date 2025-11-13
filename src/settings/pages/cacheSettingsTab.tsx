import EquationCitator from "@/main";
import { Setting, Notice } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";

/**
 * All render functions for each setting in the cache settings tab.
 */
export const CacheSettingsTab = {
    cacheUpdateTime(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.cacheUpdateTime;
        const cacheUpdateTimeSetting = new Setting(containerEl);
        cacheUpdateTimeSetting.setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(1000, 10000, 1000);
                slider.setValue(plugin.settings.cacheUpdateTime || 5000);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    plugin.settings.cacheUpdateTime = value;
                    await plugin.saveSettings();
                });
            });
    },

    cacheCleanTime(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.cacheCleanTime;
        const cacheCleanTimeSetting = new Setting(containerEl);

        cacheCleanTimeSetting.setName(name)
            .setDesc(desc)
            .addDropdown((dropdown) => {
                dropdown.addOption("300000", "5 minutes");
                dropdown.addOption("600000", "10 minutes");
                dropdown.addOption("900000", "15 minutes");
                dropdown.addOption("1200000", "20 minutes");

                dropdown.setValue(plugin.settings.cacheCleanTime.toString());
                dropdown.onChange(async (value) => {
                    plugin.settings.cacheCleanTime = parseInt(value);
                    await plugin.saveSettings();
                });
            });
    },

    clearCache(containerEl: HTMLElement, plugin: EquationCitator) {
        new Setting(containerEl)
            .setName("Clear cache")
            .setDesc("Manually clear the cache, useful if you suspect the cache is out of date")
            .addButton((button) => {
                button.setIcon("trash");
                button.setTooltip("Clear cache");
                button.onClick(() => {
                    plugin.clearCaches();
                    new Notice("All caches cleared");
                });
            });
    }
};

/**
 * Render the cache settings tab as a group of settings.
 * @param containerEl 
 * @param plugin 
 */
export function addCacheSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    containerEl.createEl("h2", { text: "Cache settings", cls: "ec-settings-header" });
    CacheSettingsTab.cacheUpdateTime(containerEl, plugin);
    CacheSettingsTab.cacheCleanTime(containerEl, plugin);
    CacheSettingsTab.clearCache(containerEl, plugin);
}