import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import EquationCitator from "@/main";
import { Debugger } from "@/debug/debugger";

export interface EquationCitatorSettings {
    fileCiteDeliminator: string;
    crossFileCitationEnabled: boolean; // Optional setting for cross-file citations
    autoNumberingLevel?: number; // Optional setting for auto numbering level 
    debugMode: boolean; // Optional setting for debug mode
}

export const DEFAULT_SETTINGS: EquationCitatorSettings = {
    fileCiteDeliminator: "|", // Default deliminator for file citations 
    crossFileCitationEnabled: false, // Default to false 
    autoNumberingLevel: 1, // Default to 1 
    debugMode: false // Default to false 
};


export class SettingsTabView extends PluginSettingTab {
    plugin: EquationCitator;
    debugger: Debugger;
    constructor(app: App, plugin: EquationCitator) {
        super(app, plugin);
        this.plugin = plugin;
        this.debugger = new Debugger(plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h1", { text: "Equation Citator Settings" }); 

        // dynamic insert and remove deliminator settings 
        const crossFileSetting = new Setting(containerEl)
            .setName("Enable Cross-File Citations") 
            .setDesc("Enables the ability to cite equations across files");
        
        crossFileSetting.addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.crossFileCitationEnabled); 
            let deliminatorContainer: HTMLElement | null = null;
            const updateDeliminator = (show: boolean) => {
                const parent = crossFileSetting.settingEl.parentElement;
                if (show && !deliminatorContainer && parent) {
                    deliminatorContainer = document.createElement("div");
                    parent.insertBefore(
                        deliminatorContainer,
                        crossFileSetting.settingEl.nextSibling 
                    );
                    this.showCrossFileCitationSettings(deliminatorContainer); 
                } else if ((!show || !parent) && deliminatorContainer) {
                    deliminatorContainer.remove();
                    deliminatorContainer = null;
                }
            };
            // update the deliminator visibility based on the current setting  
            updateDeliminator(this.plugin.settings.crossFileCitationEnabled);
            toggle.onChange((value) => {
                this.plugin.settings.crossFileCitationEnabled = value;
                this.plugin.saveSettings();
                this.debugger.log("Cross-file citation enabled:", value);
                updateDeliminator(value);
                this.plugin.saveSettings(); 
            });
        });
        
        
        // ==================  Auto numbering settings (in dev) ==================  
        containerEl.createEl("h2", { text: "Auto Equation Numbering" });
        let autoNumberingContainer: HTMLElement | null = null;
        const autoNumberingLevelSetting = new Setting(containerEl)
        autoNumberingLevelSetting.setName("Default Numbering Level") 
            .addSlider((slider) => {
                slider.setLimits(1, 6, 1)
                slider.setValue(this.plugin.settings.autoNumberingLevel || 1);                  
                slider.setDynamicTooltip();
                slider.onChange((value) => {
                    this.plugin.settings.autoNumberingLevel = value;
                    this.plugin.saveSettings();
                });
            }); 
        
        const autoNumberingSetting = new Setting(containerEl)
            .setName("Enable Auto Numbering") 
            .setDesc("Automatically number equations when press tab to leave equation")

        autoNumberingSetting.addToggle((toggle) => {
                const parent = autoNumberingSetting.settingEl.parentElement; 
                const updateAutoNumberingContainer = (value: boolean) => {
                        if (value  && parent && !autoNumberingContainer) {
                            // create a new container for auto numbering settings 
                            autoNumberingContainer = document.createElement("div");
                            parent.insertBefore( 
                                autoNumberingContainer, 
                                autoNumberingSetting.settingEl.nextSibling
                            );
                            this.showAutoNumberingSettings(autoNumberingContainer);
                        }
                        else if ((!value || !parent) && autoNumberingContainer) {
                            // remove the container if auto numbering is disabled 
                            autoNumberingContainer.remove();
                            autoNumberingContainer = null;
                        } 
                    }
                toggle.setValue(this.plugin.settings.crossFileCitationEnabled);
                updateAutoNumberingContainer(this.plugin.settings.crossFileCitationEnabled); 
                toggle.onChange((value) => {
                    this.plugin.settings.crossFileCitationEnabled = value;
                    this.debugger.log("Auto numbering enabled:", value); 
                    updateAutoNumberingContainer(value);
                    this.plugin.saveSettings();
                });
            });
        
        containerEl.createEl("h2", { text: "Other Settings" }); 
        new Setting(containerEl) 
            .setName("Debug Mode") 
            .setDesc("Enables debug mode for the plugin") 
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.debugMode);
                toggle.onChange((value) => {
                    this.plugin.settings.debugMode = toggle.getValue();
                    new Notice("Equation Citator : Debug mode" + (value ? " enabled" : " disabled"));
                    this.plugin.saveSettings(); 
                })
            });
    }
    
    showCrossFileCitationSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Cite File Deliminator")
            .setDesc("The part after the deliminator denotes the citation number")
            .addText((text) => {
                text.inputEl.classList.add("ec-deliminator-input");
                text.setPlaceholder("Default: |")
                text.setValue(this.plugin.settings.fileCiteDeliminator)
                text.onChange((value) => {
                    this.plugin.settings.fileCiteDeliminator = value;
                    this.plugin.saveSettings();
                });
            });
    }

    showAutoNumberingSettings(containerEl: HTMLElement): void {
        
    }
}
