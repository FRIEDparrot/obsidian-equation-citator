import { WidgetSizeManager, WidgetSize, WIDGET_SIZE_LABELS } from "../styleManagers/widgetSizeManager";
import EquationCitator from "@/main";
import { Setting } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";
import { CalloutTableStyleManager } from "../styleManagers/calloutTabManager";


export const StyleSettingsTab = {
    citationPopoverSize(containerEl: HTMLElement, plugin: EquationCitator) {
        const setting = new Setting(containerEl);

        setting.setName("Preview Widget Size")
            .setDesc("Select the size for citation preview widgets. Sizes apply to all popovers (equations, figures, callouts).")
            .addDropdown((dropdown) => {
                // Add all size options
                Object.entries(WIDGET_SIZE_LABELS).forEach(([size, label]) => {
                    dropdown.addOption(size, label);
                });

                // Set current value
                dropdown.setValue(plugin.settings.citationPopoverSize || WidgetSize.Medium);
                
                dropdown.onChange(async (value) => {
                    plugin.settings.citationPopoverSize = value as WidgetSize;
                    WidgetSizeManager.setSize(value as WidgetSize);
                    await plugin.saveSettings();
                });
            });
    },

    enableRenderLocalFileName(containerEl: HTMLElement, plugin: EquationCitator) {
        const enableLocalFileNameSetting = new Setting(containerEl);
        enableLocalFileNameSetting.setName(SETTINGS_METADATA.enableRenderLocalFileName.name)
            .setDesc(SETTINGS_METADATA.enableRenderLocalFileName.desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableRenderLocalFileName);
                toggle.onChange(async (value) => {
                    plugin.settings.enableRenderLocalFileName = value;
                    await plugin.saveSettings();
                });
            });
    },

    enableCenterTableInCallout(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.enableCenterTableInCallout;
        const setting = new Setting(containerEl);

        setting.setName(name)
            .setDesc(desc)
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.enableCenterTableInCallout);
                toggle.onChange(async (value) => {
                    plugin.settings.enableCenterTableInCallout = value;
                    await plugin.saveSettings();
                    CalloutTableStyleManager.update(plugin.settings);
                });
            });
    },
    enableRenderFigureInfoInPreview(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.enableRenderFigureInfoInPreview;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle(toggle => {
                toggle.setValue(plugin.settings.enableRenderFigureInfoInPreview);
                toggle.onChange(async (value) => {
                    plugin.settings.enableRenderFigureInfoInPreview = value;
                    await plugin.saveSettings();
                });
            });
    },
}

/**
 * Adds the style settings to the settings tab
 * @param containerEl The container element to add the settings to
 * @param plugin The plugin instance
 * 
 * Note: Citation colors and widget colors have been removed.
 * Users should customize colors via CSS snippets using the following CSS variables:
 * - --em-math-citation-color
 * - --em-math-citation-hover-color
 * - --em-math-citation-file-superscript-color
 * - --em-math-citation-file-superscript-hover-color
 * Widget colors automatically adapt to the theme using Obsidian's built-in color variables.
 */
export function addStyleSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) {
    StyleSettingsTab.citationPopoverSize(containerEl, plugin);
    StyleSettingsTab.enableRenderLocalFileName(containerEl, plugin);
    StyleSettingsTab.enableCenterTableInCallout(containerEl, plugin);
    StyleSettingsTab.enableRenderFigureInfoInPreview(containerEl, plugin);
}