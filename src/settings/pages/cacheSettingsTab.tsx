import EquationCitator from "@/main";
import { Setting, Notice } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";
import { t } from "@/i18n/getLocale";

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
                dropdown.addOption("300000", t("settings.option.fiveMinutes"));
                dropdown.addOption("600000", t("settings.option.tenMinutes"));
                dropdown.addOption("900000", t("settings.option.fifteenMinutes"));
                dropdown.addOption("1200000", t("settings.option.twentyMinutes"));

                dropdown.setValue(plugin.settings.cacheCleanTime.toString());
                dropdown.onChange(async (value) => {
                    plugin.settings.cacheCleanTime = parseInt(value);
                    await plugin.saveSettings();
                });
            });
    },

    clearCache(containerEl: HTMLElement, plugin: EquationCitator) {
        new Setting(containerEl)
            .setName(t("settings.clearCache.name"))
            .setDesc(t("settings.clearCache.desc"))
            .addButton((button) => {
                button.setIcon("trash");
                button.setTooltip(t("settings.clearCache.tooltip"));
                button.onClick(() => {
                    plugin.clearCaches();
                    new Notice(t("settings.clearCache.notice"));
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
    CacheSettingsTab.cacheUpdateTime(containerEl, plugin);
    CacheSettingsTab.cacheCleanTime(containerEl, plugin);
    CacheSettingsTab.clearCache(containerEl, plugin);
}
