import { Notice, Setting } from "obsidian";
import { DEFAULT_SETTINGS, SETTINGS_METADATA } from "../defaultSettings";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { resetStyles, SettingsTabView } from "../SettingsTab";


export const OtherSettingsTab = {
    enableTypstMode(containerEl: HTMLElement, plugin: EquationCitator) {
        const enableTypstModeSetting = new Setting(containerEl);
        const { name, desc } = SETTINGS_METADATA.enableTypstMode;
        enableTypstModeSetting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.enableTypstMode);
                toggle.onChange(async (value) => {
                    plugin.settings.enableTypstMode = value;
                    await plugin.saveSettings();
                });
            });
    },

    typstBoxSymbol(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.typstBoxSymbol;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc)
            .addText((text) => {
                text.setValue(plugin.settings.typstBoxSymbol);
                text.setPlaceholder("#box");
                text.onChange(async (value) => {
                    plugin.settings.typstBoxSymbol = value || "#box";
                    await plugin.saveSettings();
                });
            });
    },

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
                    new Notice("Equation Citator: Debug mode" + (value ? " enabled" : " disabled"));
                });
            });
    },

    /**
     * @remarks : **IMPORTANT - this function should be called individually** 
     * @param containerEl 
     * @param plugin 
     * @param settingsTab 
     */
    resetSettings(containerEl: HTMLElement, plugin: EquationCitator, settingsTab: SettingsTabView) {
        new Setting(containerEl)
            .setName("Reset settings")
            .setDesc("Reset all settings to default values")
            .addButton((button) => {
                button.setIcon("reset");
                button.onClick(async () => {
                    new Notice("Restoring settings...");
                    
                    // Add a small delay to show the animation
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    plugin.settings = { ...DEFAULT_SETTINGS };
                    resetStyles(); // reset styles
                    await plugin.saveSettings();
                    // Refresh the display
                    settingsTab.display();
                    new Notice("Settings have been restored to defaults");
                });
            });
    },

    extensionsUseMarkdownRenderer(containerEl: HTMLElement, plugin: EquationCitator) {
        new Setting(containerEl)
            .setName("Extension names using Markdown renderer")
            .setDesc("Use Markdown renderer for better render support to those figure files");

        // Container for the list of extensions
        const extensionListContainer = containerEl.createDiv("ec-extension-list-container");

        // Handler for extension input blur
        const handleExtensionBlur = async (
            extension: string, 
            index: number, 
            textInput: HTMLInputElement
        ) => {
            const newValue = textInput.value.trim();
            if (newValue === "") {
                new Notice("Extension name cannot be empty");
                textInput.value = extension;
                return;
            }
            if (newValue !== extension) {
                // Check for duplicates
                const exists = plugin.settings.extensionsUseMarkdownRenderer.some(
                    (ext, i) => i !== index && ext === newValue
                );
                if (exists) {
                    new Notice("This extension name already exists");
                    textInput.value = extension;
                    return;
                }
                plugin.settings.extensionsUseMarkdownRenderer[index] = newValue;
                await plugin.saveSettings();
            }
        };

        // Handler for removing an extension
        const handleRemoveExtension = async (index: number, renderCallback: () => void) => {
            plugin.settings.extensionsUseMarkdownRenderer.splice(index, 1);
            await plugin.saveSettings();
            renderCallback();
        };

        // Handler for adding a new extension
        const handleAddExtension = async (renderCallback: () => void) => {
            // Find a unique default extension
            let newExtension = "custom";
            let counter = 1;
            const existingExtensions = new Set(plugin.settings.extensionsUseMarkdownRenderer);
            while (existingExtensions.has(newExtension)) {
                newExtension = `custom${counter}`;
                counter++;
            }
            plugin.settings.extensionsUseMarkdownRenderer.push(newExtension);
            await plugin.saveSettings();
            renderCallback();
        };

        // Create a single extension item
        const createExtensionItem = (
            extension: string, 
            index: number, 
            container: HTMLElement,
            renderCallback: () => void
        ) => {
            const setting = new Setting(container).setClass("ec-extension-item");
            setting.setName("");
            setting.setDesc("");

            // Add extension input (left side, longer)
            setting.addText((text) => {
                text.inputEl.classList.add("ec-extension-input");
                text.setValue(extension);
                text.setPlaceholder("For example, `excalidraw`");
                text.inputEl.onblur = () => handleExtensionBlur(extension, index, text.inputEl);
            });

            // Add remove button (right side)
            setting.addButton((button) => {
                button.setButtonText("Remove")
                    .setClass("mod-warning")
                    .onClick(() => handleRemoveExtension(index, renderCallback));
            });
        };

        const renderExtensionList = () => {
            extensionListContainer.empty();

            // Render each existing extension
            plugin.settings.extensionsUseMarkdownRenderer.forEach((extension, index) => {
                createExtensionItem(extension, index, extensionListContainer, renderExtensionList);
            });

            // Add "Add new extension" button
            new Setting(extensionListContainer)
                .setClass("ec-add-extension-setting")
                .addButton((button) => {
                    button.setButtonText("Add new extension")
                        .setClass("mod-cta")
                        .onClick(() => handleAddExtension(renderExtensionList));
                });
        };

        renderExtensionList();
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
    OtherSettingsTab.enableTypstMode(containerEl, plugin);
    OtherSettingsTab.typstBoxSymbol(containerEl, plugin);
    OtherSettingsTab.extensionsUseMarkdownRenderer(containerEl, plugin);
    OtherSettingsTab.debugMode(containerEl, plugin);
    OtherSettingsTab.resetSettings(containerEl, plugin, settingsTab);
    // ==================  Beta features settings ==========   
    new Setting(containerEl).setName("Beta features").setHeading();
    OtherSettingsTab.enableCiteWithCodeBlockInCallout(containerEl, plugin);
}
