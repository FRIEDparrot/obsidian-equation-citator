import { ColorManager } from "@/settings/styleManagers/colorManager";
import EquationCitator from "@/main";
import { Setting } from "obsidian"; 

export function addStyleSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {        
        const citeColorSetting = new Setting(containerEl);
        citeColorSetting.setName("Citation Display Color")
            .setDesc("Citation display color, 1: display color 2: color when hovering")
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationColor);
                color.onChange(async (value) => {
                    plugin.settings.citationColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            })
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationHoverColor);
                color.onChange(async (value) => {
                    plugin.settings.citationHoverColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            });

        new Setting(containerEl)
            .setName("File Citation Color")
            .setDesc("Color for citations superscript, 1: display color 2: color when hovering")
            .addColorPicker((color) => {
                color.setValue(plugin.settings.fileSuperScriptColor);
                color.onChange(async (value) => {
                    plugin.settings.fileSuperScriptColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            }).addColorPicker((color) => {
                color.setValue(plugin.settings.fileSuperScriptHoverColor);
                color.onChange(async (value) => {
                    plugin.settings.fileSuperScriptHoverColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            });

        // containerEl.createEl("p", { text: "1: background, 2: header/footer, 3: hover, 4: active, 5: border" }); 
        // For widget colors:
        const lightWidgetColorSetting = new Setting(containerEl);
        lightWidgetColorSetting.setName("Light Theme Widget Colors")
            .setDesc("Widget colors for light theme");
        lightWidgetColorSetting.settingEl.addClass("ec-settings-nodelimter");
        for (let i = 0; i < 5; i++) {
            lightWidgetColorSetting.addColorPicker((color) => {
                color.setValue(plugin.settings.citationWidgetColor[i]);
                color.onChange(async (value) => {
                    ColorManager.updateWidgetColor(i, value, false, plugin.settings);
                    await plugin.saveSettings();
                });
            });
        }

        // Dark theme widget colors
        const darkWidgetColorSetting = new Setting(containerEl);
        darkWidgetColorSetting.setName("Dark Theme Widget Colors")
            .setDesc("Widget colors for dark theme");
        darkWidgetColorSetting.settingEl.addClass("ec-settings-nodelimter");
        for (let i = 0; i < 5; i++) {
            darkWidgetColorSetting.addColorPicker((color) => {
                color.setValue(plugin.settings.citationWidgetColorDark[i]);
                color.onChange(async (value) => {
                    ColorManager.updateWidgetColor(i, value, true, plugin.settings);
                    await plugin.saveSettings();
                });
            });
        }
    }