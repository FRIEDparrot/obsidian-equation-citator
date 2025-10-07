import EquationCitator from "@/main";
import { Setting, Notice } from "obsidian";


export function addCacheSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    containerEl.createEl("h2", { text: "Cache Settings", cls: "ec-settings-header" });
    const CacheUpdateTimeSetting = new Setting(containerEl);

    // 50 - 500 ms, default 200 ms 
    CacheUpdateTimeSetting.setName("Cache Update Time")
        .setDesc("Time refresh cache (in ms), for very large document, consider increase this")
        .addSlider((slider) => {
            slider.setLimits(1000, 10000, 1000);
            slider.setValue(plugin.settings.cacheUpdateTime || 5000);
            slider.setDynamicTooltip();
            slider.onChange(async (value) => {
                plugin.settings.cacheUpdateTime = value;
                await plugin.saveSettings();
            });
        });

    const CacheCleanTimeSetting = new Setting(containerEl);
    CacheCleanTimeSetting.setName("Cache Clean Time")
        .setDesc("Time to automatically clean cache")
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

    new Setting(containerEl)
        .setName("Clear Cache")
        .setDesc("Manually clear the cache, useful if you suspect the cache is out of date")
        .addButton((button) => {
            button.setIcon("trash");
            button.setTooltip("Clear Cache");
            button.onClick(async () => {
                await plugin.clearCaches();
                new Notice("All caches cleared");
            });
        });
}
