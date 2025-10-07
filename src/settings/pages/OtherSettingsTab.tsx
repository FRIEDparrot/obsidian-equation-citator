import { Notice, Setting } from "obsidian";
import { DEFAULT_SETTINGS } from "../defaultSettings";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { resetStyles, SettingsTabView } from "../SettingsTab";

export function addOtherSettingsTab(containerEl: HTMLElement, plugin: EquationCitator,  settingsTab: SettingsTabView) {
    containerEl.createEl("h2", { text: "Other Settings", cls: "ec-settings-header" });

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

    new Setting(containerEl)
        .setName("Debug Mode")
        .setDesc("Enables debug mode for the plugin (this option needs re-enable after each Obsidian restart)")
        .addToggle((toggle) => {
            toggle.setValue(Debugger.debugMode); // not use the Plugin settings, so restore each time 
            toggle.onChange((value) => {
                Debugger.debugMode = toggle.getValue();
                new Notice("Equation Citator : Debug mode" + (value ? " enabled" : " disabled"));
            });
        });
    
    // ==================  Beta features settings ==========   
    containerEl.createEl("h2", { text: "Beta Features", cls: "ec-settings-header" });

    const enableCiteWithCodeBlockInCalloutSetting = new Setting(containerEl);
    enableCiteWithCodeBlockInCalloutSetting.setName("(Beta) Cite with Inline Code Block in Callout")
        .setDesc("Enable citation by inline code block in callout")
        .addToggle((toggle) => {
            toggle.setValue(plugin.settings.enableCiteWithCodeBlockInCallout);
            toggle.onChange(async (value) => {
                plugin.settings.enableCiteWithCodeBlockInCallout = value;
                await plugin.saveSettings();
            });
        });
}
