import { WidgetSizeManager, WidgetSizeVariable } from "../styleManagers/widgetSizeManager";
import { ColorManager } from "@/settings/styleManagers/colorManager";
import EquationCitator from "@/main";
import { Setting } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";

export const StyleSettingsTab = {
    citationPopoverContainerWidth(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationPopoverContainerWidth;
        const equationPreviewWidgetWidthSetting = new Setting(containerEl);
        
        equationPreviewWidgetWidthSetting.setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(200, 800, 10);
                slider.setDynamicTooltip();
                slider.setValue(plugin.settings.citationPopoverContainerWidth);
                slider.onChange(async (value) => {
                    plugin.settings.citationPopoverContainerWidth = value;
                    WidgetSizeManager.set(WidgetSizeVariable.ContainerWidth, value);
                    await plugin.saveSettings();
                });
            });
    },

    citationPopoverContainerHeight(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationPopoverContainerHeight;
        const equationPreviewWidgetHeightSetting = new Setting(containerEl);

        equationPreviewWidgetHeightSetting.setName(name)
            .setDesc(desc)
            .addSlider((slider) => {
                slider.setLimits(200, 800, 10);
                slider.setDynamicTooltip();
                slider.setValue(plugin.settings.citationPopoverContainerHeight);
                slider.onChange(async (value) => {
                    plugin.settings.citationPopoverContainerHeight = value;
                    WidgetSizeManager.set(WidgetSizeVariable.ContainerHeight, value);
                    await plugin.saveSettings();
                });
            });
    },

    citationColor(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationColor;
        const citeColorSetting = new Setting(containerEl);

        citeColorSetting.setName(name)
            .setDesc(desc)
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationColor);
                color.onChange(async (value) => {
                    plugin.settings.citationColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            })
    },

    citationHoverColor(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationHoverColor;
        const citeHoverColorSetting = new Setting(containerEl);
        citeHoverColorSetting
            .setName(name)
            .setDesc(desc)
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationHoverColor);
                color.onChange(async (value) => {
                    plugin.settings.citationHoverColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            });
    },

    fileSuperScriptColor(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.fileSuperScriptColor;
        const fileCiteColorSetting = new Setting(containerEl);

        fileCiteColorSetting.setName(name)
            .setDesc(desc)
            .addColorPicker((color) => {
                color.setValue(plugin.settings.fileSuperScriptColor);
                color.onChange(async (value) => {
                    plugin.settings.fileSuperScriptColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            })

    },

    fileSuperScriptHoverColor(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.fileSuperScriptHoverColor;
        const fileCiteHoverColorSetting = new Setting(containerEl);
        fileCiteHoverColorSetting
            .setName(name)
            .setDesc(desc)
            .addColorPicker((color) => {
                color.setValue(plugin.settings.fileSuperScriptHoverColor);
                color.onChange(async (value) => {
                    plugin.settings.fileSuperScriptHoverColor = value;
                    await plugin.saveSettings();
                    ColorManager.updateAllColors(plugin.settings);
                });
            });
    },

    citationWidgetColor(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationWidgetColor;
        const lightWidgetColorSetting = new Setting(containerEl);

        lightWidgetColorSetting.setName(name)
            .setDesc(desc);
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
    },
    
    citationWidgetColorDark(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationWidgetColorDark;
        const darkWidgetColorSetting = new Setting(containerEl);

        darkWidgetColorSetting.setName(name)
            .setDesc(desc);
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
}

export function addStyleSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    StyleSettingsTab.citationPopoverContainerWidth(containerEl, plugin);
    StyleSettingsTab.citationPopoverContainerHeight(containerEl, plugin);
    StyleSettingsTab.citationColor(containerEl, plugin);
    StyleSettingsTab.fileSuperScriptColor(containerEl, plugin);
    StyleSettingsTab.citationWidgetColor(containerEl, plugin);
    StyleSettingsTab.citationWidgetColorDark(containerEl, plugin);
}