import { Notice, Setting } from "obsidian";
import { DEFAULT_SETTINGS, SETTINGS_METADATA } from "../defaultSettings";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { resetStyles, SettingsTabView } from "../SettingsTab";


export const OtherSettingsTab = {
    debugMode(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.debugMode;
        const debugModeSetting = new Setting(containerEl);

        debugModeSetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(Debugger.debugMode);
                plugin.settings.debugMode = Debugger.debugMode;
                
                toggle.onChange(async (value) => {
                    Debugger.debugMode = toggle.getValue();
                    plugin.settings.debugMode = Debugger.debugMode;
                    await plugin.saveSettings();
                    new Notice("Equation Citator : Debug mode" + (value ? " enabled" : " disabled"));
                });
            });
    },

    /**
     * 
     * @warning : this function should be called individually 
     * @param containerEl 
     * @param plugin 
     * @param settingsTab 
     */
    resetSettings(containerEl: HTMLElement, plugin: EquationCitator, settingsTab: SettingsTabView) {
        new Setting(containerEl)
            .setName("Reset Settings")
            .setDesc("Reset all settings to default values")
            .addButton((button) => {
                button.setIcon("reset");
                button.onClick(async () => {
                    new Notice("Restoring Settings ...");

                    // Add a small delay to show the animation
                    await new Promise(resolve => setTimeout(resolve, 200));

                    plugin.settings = { ...DEFAULT_SETTINGS };
                    await resetStyles(); // reset styles
                    await plugin.saveSettings(); // this have no log 
                    // Refresh the display
                    settingsTab.display();
                    new Notice("Settings have been restored to defaults");
                });
            });
    },

    enableCiteWithCodeBlockInCallout(containerEl: HTMLElement, plugin: EquationCitator) {
        const enableCiteWithCodeBlockInCalloutSetting = new Setting(containerEl);
        const { name, desc } = SETTINGS_METADATA.enableCiteWithCodeBlockInCallout; 
        enableCiteWithCodeBlockInCalloutSetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableCiteWithCodeBlockInCallout);
                toggle.onChange(async (value) => {
                    plugin.settings.enableCiteWithCodeBlockInCallout = value;
                    await plugin.saveSettings();
                });
            });
    }
}


export function addOtherSettingsTab(containerEl: HTMLElement, plugin: EquationCitator, settingsTab: SettingsTabView) {
    OtherSettingsTab.debugMode(containerEl, plugin);
    OtherSettingsTab.resetSettings(containerEl, plugin, settingsTab);
    // ==================  Beta features settings ==========   
    containerEl.createEl("h2", { text: "Beta Features", cls: "ec-settings-header" });
    OtherSettingsTab.enableCiteWithCodeBlockInCallout(containerEl, plugin);
}
