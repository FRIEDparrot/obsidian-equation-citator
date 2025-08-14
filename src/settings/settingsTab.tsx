import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import EquationCitator from "@/main";
import { AutoNumberingType } from "@/utils/auto_number_utils";
import {
    validateEquationDisplayFormat,
    validLetterPrefix,
    validateDelimiter
} from "@/utils/string_utils";
import { ColorManager } from "@/settings/colorManager";
import Debugger from "@/debug/debugger";

export interface EquationCitatorSettings {
    // citation settings 
    enableCitationInSourceMode: boolean; // Enable citation in source mode 
    citationPrefix: string; // Citation prefix for equations
    citationFormat: string; // Citation display format for equations 
    figCitationPrefix: string; // Figure Citation Prefix
    figCitationFormat: string; // citation display format for figures 
    citationColor: string; // Citation display color for equations 
    citationHoverColor: string; // Citation display hover color for equations 
    multiCitationDelimiter: string; // Delimiter for multiple citations in a single cite 
    enableContinuousCitation: boolean; // Render continuous citations in compat format 
    renderLocalFileName: boolean; // Render local file name for citations

    continuousRangeSymbol: string; // Range symbol for continuous citations in a single cite 
    continuousDelimiters: string; // Delimiter for continuous citations in a single cite 

    enableCrossFileCitation: boolean; // Optional setting for cross-file citations
    fileCiteDelimiter: string;
    fileSuperScriptColor: string;
    fileSuperScriptHoverColor: string;

    // render core settings 
    cacheUpdateTime: number; // Debounce time for preview rendering  
    cacheCleanTime: number; // Time to automatically clear cache 

    // pdf rendering settings
    citationColorInPdf: string; // default citation color in PDF rendering  
    fileSuperScriptColorInPdf: string; // default file citation color in PDF rendering 

    enableCiteWithCodeBlockInCallout: boolean; // Enable citation by inline code block in callout

    // auto numbering settings  
    autoNumberDelimiter: string; // Auto numbering delimiter   
    autoNumberType: AutoNumberingType; // Use relative heading level for auto numbering 
    autoNumberDepth: number; // Maximum depth for auto numbering level 
    autoNumberNoHeadingPrefix: string;  //  equation numbering prefix for no heading level equations 
    autoNumberPrefixEnabled: boolean; // Setting for auto numbering prefix 
    autoNumberPrefix: string; // Global Auto numbering prefix for equations without any heading level  
    autoNumberEquationsInQuotes: boolean; // Enable auto numbering for equations in quotes 

    // by default, auto-number rename the citation, I don't provide this as option 
    enableUpdateTagsInAutoNumbering: boolean; // Update citation in auto numbering 
    deleteRepeatTagsInAutoNumbering: boolean; // Delete repeat tags in auto numbering  
    deleteUnusedTagsInAutoNumbering: boolean; // Delete unused tags in auto numbering  

    citationWidgetColor: string[]; // Citation widget color for different types of citations  
    citationWidgetColorDark: string[]; // Citation widget color for different types of citations in dark mode 
    debugMode: boolean; // Optional setting for debug mode
}

export const DEFAULT_SETTINGS: EquationCitatorSettings = {
    enableCitationInSourceMode: false, // Not enabled by default  
    citationPrefix: "eq:", // Default prefix for citations 
    citationFormat: "(#)", // Default display format for citations  
    figCitationPrefix: "fig:", // prefix for cite figures 
    figCitationFormat: "fig. #", // citation format for figures 
    citationColor: "#a288f9",
    citationHoverColor: "#c5b6fc",
    multiCitationDelimiter: ",", // Default delimiter for multiple citations in a single cite
    enableContinuousCitation: true, // Default to true for convenience 
    continuousDelimiters: ". - : \\_", // Default delimiter for continuous citations in a single cite
    continuousRangeSymbol: "~", // Default range symbol for continuous citations in a single cite 
    renderLocalFileName: true, // Default to true 

    enableCrossFileCitation: true, // Default to true
    fileCiteDelimiter: "^", // Default delimiter for file citations 
    fileSuperScriptColor: "#8e77e1",
    fileSuperScriptHoverColor: "#6d50e0",

    cacheUpdateTime: 5000, // Max time for cache to refresh (5s)
    cacheCleanTime: 300000, // Max time for cache to clear (5 minutes) 

    citationColorInPdf: "#000000", // black color for default citation color in PDF rendering 
    fileSuperScriptColorInPdf: "#000000", // black color for default file citation color in PDF rendering 

    enableCiteWithCodeBlockInCallout: false,  // cite with inline code block in quote

    autoNumberDelimiter: ".", // Default delimiter for auto numbering  
    autoNumberDepth: 3, // Default to 3 (i.e., 1.1.1 for 3 levels)  
    autoNumberType: AutoNumberingType.Relative, // Default is using relative heading level 
    autoNumberNoHeadingPrefix: "P",
    autoNumberPrefixEnabled: false,
    autoNumberPrefix: "", // Default to empty string for no prefix 
    autoNumberEquationsInQuotes: false, // Default to false, not to number equations in quotes 
    enableUpdateTagsInAutoNumbering: true, // Default to true, update citation in auto numbering  
    deleteRepeatTagsInAutoNumbering: true, // Default to true, delete repeat tags in auto numbering 
    deleteUnusedTagsInAutoNumbering: false, // Default to true, delete unused tags in auto numbering 

    citationWidgetColor: ["#ffffff", "#f8f9fa", "#f5f6f7", "#e9ecef", "#dee2e6"],
    citationWidgetColorDark: ["#1e1e1e", "#2d2d2d", "#252525", "#3a3a3a", "#404040"],
    debugMode: false // debug mode is off by default (for set default, see debugger.tsx)
};

export class SettingsTabView extends PluginSettingTab {
    plugin: EquationCitator;
    constructor(app: App, plugin: EquationCitator) {
        super(app, plugin);
        this.plugin = plugin;
    }
    private lightEqWidgetCssVars = ['--em-background-primary', '--em-background-secondary', '--em-background-primary-alt', '--em-background-modifier-hover', '--em-background-modifier-border'];
    private darkEqWidgetCssVars = ['--em-background-primary-dark', '--em-background-secondary-dark', '--em-background-primary-alt-dark', '--em-background-modifier-hover-dark', '--em-background-modifier-border-dark'];
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h1", { text: "Equation Citator Settings", cls: "ec-settings-title" });
        containerEl.createEl("h2", { text: "Citation Settings", cls: "ec-settings-header" });

        const enableCiteInSourceModeSetting = new Setting(containerEl)
        enableCiteInSourceModeSetting.setName("Enable in Source Mode")
            .setDesc("Enable render citation in source mode")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.enableCitationInSourceMode);
                toggle.onChange(async (value) => {
                    this.plugin.settings.enableCitationInSourceMode = value;
                    Debugger.log("Citation in source mode enabled:", value);
                    await this.plugin.saveSettings();
                });
            });

        const citePrefixSetting = new Setting(containerEl)
        citePrefixSetting.setName("Citation Prefix")
            .setDesc("Prefix used for citations, e.g. 'eq:' means use `\\ref{eq:1.1}` for citation")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("eq:")
                text.setValue(this.plugin.settings.citationPrefix)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.citationPrefix) {
                        this.plugin.settings.citationPrefix = newValue;
                        Debugger.log("Citation prefix changed to:", newValue);
                        await this.plugin.saveSettings();
                    }
                }
            });

        const citeFormatSetting = new Setting(containerEl);
        citeFormatSetting.setName("Citation Display Format")
            .setDesc("Display format, use '#' for equation number")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("(#)")
                text.setValue(this.plugin.settings.citationFormat)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.citationFormat) {
                        if (validateEquationDisplayFormat(newValue)) {
                            this.plugin.settings.citationFormat = newValue;
                            Debugger.log("Citation display format changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Invalid format, You must use only one '#' symbol to represent equation number");
                            text.setValue(this.plugin.settings.citationFormat);
                        }
                    }
                }
            });

        const citeColorSetting = new Setting(containerEl);
        citeColorSetting.setName("Citation Display Color")
            .setDesc("Citation display color, 1: display color 2: color when hovering")
            .addColorPicker((color) => {
                color.setValue(this.plugin.settings.citationColor)
                color.onChange(async (value) => {
                    this.plugin.settings.citationColor = value;
                    Debugger.log("Citation color changed to:", value);
                    await this.plugin.saveSettings();
                    ColorManager.updateAllColors(this.plugin.settings);
                });
            })
            .addColorPicker((color) => {
                color.setValue(this.plugin.settings.citationHoverColor)
                color.onChange(async (value) => {
                    this.plugin.settings.citationHoverColor = value;
                    Debugger.log("Citation hover color changed to:", value);
                    await this.plugin.saveSettings();
                    ColorManager.updateAllColors(this.plugin.settings);
                });
            });

        const multiCitationDelimiterSetting = new Setting(containerEl)
        multiCitationDelimiterSetting.setName("Multi-Citation Delimiter")
            .setDesc("Delimiter used for multiple citations in a single cite, e.g. ',' for '\\ref{1.2, 1.3}'")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder(",")
                text.setValue(this.plugin.settings.multiCitationDelimiter)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.multiCitationDelimiter) {
                        if (validateDelimiter(newValue)) {
                            this.plugin.settings.multiCitationDelimiter = newValue;
                            Debugger.log("Multi-citation delimiter changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters are allowed, Change not saved");
                            text.setValue(this.plugin.settings.multiCitationDelimiter);
                        }
                    }
                }
            });

        // ==================  File citation settings ==========  
        const renderContinuousCitationSetting = new Setting(containerEl)
        renderContinuousCitationSetting.setName("Enable Continuous Citations")
            .setDesc("Enable continuous  citation format, also render citations in continuous format")
            .addToggle((toggle) => {
                let container: HTMLElement | null = null;
                const updateContinuousCitationSettingsContainer = (show: boolean) => {
                    const parent = renderContinuousCitationSetting.settingEl.parentElement;
                    if (show && !container && parent) {
                        container = document.createElement("div");
                        parent.insertBefore(
                            container,
                            renderContinuousCitationSetting.settingEl.nextSibling
                        );
                        this.showContinuousCitationSettings(container);
                    } else if ((!show || !parent) && container) {
                        container.remove();
                        container = null;
                    }
                };
                toggle.setValue(this.plugin.settings.enableContinuousCitation);
                updateContinuousCitationSettingsContainer(this.plugin.settings.enableContinuousCitation);
                toggle.onChange(async (value) => {
                    this.plugin.settings.enableContinuousCitation = value;
                    Debugger.log("Continuous citation enabled:", value);
                    await this.plugin.saveSettings();
                    updateContinuousCitationSettingsContainer(value);
                });
            });

        const crossFileSetting = new Setting(containerEl)
            .setName("Enable Cross-File Citations")
            .setDesc("Use pure footnote style citations to cite equations across files");

        crossFileSetting.addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.enableCrossFileCitation);
            let delimiterContainer: HTMLElement | null = null;
            const updateFileSettingsContainer = (show: boolean) => {
                const parent = crossFileSetting.settingEl.parentElement;
                if (show && !delimiterContainer && parent) {
                    delimiterContainer = document.createElement('div');
                    parent.insertBefore(
                        delimiterContainer,
                        crossFileSetting.settingEl.nextSibling
                    );
                    this.showCrossFileCitationSettings(delimiterContainer);
                } else if ((!show || !parent) && delimiterContainer) {
                    delimiterContainer.remove();
                    delimiterContainer = null;
                }
            };
            // update the delimiter visibility based on the current setting  
            updateFileSettingsContainer(this.plugin.settings.enableCrossFileCitation);
            toggle.onChange(async (value) => {
                this.plugin.settings.enableCrossFileCitation = value;
                Debugger.log("Cross-file citation enabled:", value);
                await this.plugin.saveSettings();
                updateFileSettingsContainer(value);
            });
        });

        const enableLocalFileNameSetting = new Setting(containerEl)
        enableLocalFileNameSetting.setName("Render Local File Name in Citation")
            .setDesc("Render local file name for citations")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.renderLocalFileName);
                toggle.onChange(async (value) => {
                    this.plugin.settings.renderLocalFileName = value;
                    Debugger.log("Local file name in citation enabled:", value);
                    await this.plugin.saveSettings();
                });
            });

        // ==================  Auto numbering command settings =======================  
        containerEl.createEl("h2", { text: "Auto equation numbering settings", cls: "ec-settings-header" });

        const autoNumberingDelimiterSetting = new Setting(containerEl);
        autoNumberingDelimiterSetting.setName("Auto Numbering Delimiter")
            .setDesc("Delimiter used for numbering equations, e.g. '.' for '1.1', '-' for '1-1', etc")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("Default: .")
                text.setValue(this.plugin.settings.autoNumberDelimiter)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.autoNumberDelimiter) {
                        if (validateDelimiter(newValue)) {
                            this.plugin.settings.autoNumberDelimiter = newValue;
                            Debugger.log("Auto numbering delimiter changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters are allowed, Change not saved");
                            text.setValue(this.plugin.settings.autoNumberDelimiter);
                        }
                    }
                }
            });

        const autoNumberingLevelSetting = new Setting(containerEl);
        autoNumberingLevelSetting.setName("Auto Numbering Depth")
            .setDesc("Maximum depth for equation numbers (e.g., depth of 2 gives '1.1', depth of 3 gives '1.1.1')")
            .addSlider((slider) => {
                slider.setLimits(1, 6, 1)
                slider.setValue(this.plugin.settings.autoNumberDepth || 1);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.autoNumberDepth = value;
                    Debugger.log("Auto numbering depth changed to:", value);
                    await this.plugin.saveSettings();
                });
            });

        const autoNumberingMethodSetting = new Setting(containerEl);
        autoNumberingMethodSetting.setName("Auto Numbering Method")
            .setDesc("Use absolute or relative heading level for auto numbering")
            .addDropdown((dropdown) => {
                dropdown.addOption("Relative", "Relative")
                dropdown.addOption("Absolute", "Absolute")
                dropdown.setValue(this.plugin.settings.autoNumberType)
                dropdown.onChange(async (value) => {
                    this.plugin.settings.autoNumberType = value as AutoNumberingType;
                    Debugger.log("Auto numbering method changed to:", value);
                    await this.plugin.saveSettings();
                });
            });

        const autoNumberingNoHeadingPrefixSetting = new Setting(containerEl);

        autoNumberingNoHeadingPrefixSetting
            .setName("Auto Numbering No Heading Prefix")
            .setDesc("Prefix for equations without any heading level (e.g., 'P1', 'P2', etc.)")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("Default: P")
                text.setValue(this.plugin.settings.autoNumberNoHeadingPrefix)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.autoNumberNoHeadingPrefix) {
                        if (validLetterPrefix(newValue)) {
                            this.plugin.settings.autoNumberNoHeadingPrefix = newValue;
                            Debugger.log("Auto numbering no heading prefix changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only letters are allowed, Change not saved");
                            text.setValue(this.plugin.settings.autoNumberNoHeadingPrefix);
                        }
                    }
                }
            });

        let autoNumberingPrefixContainer: HTMLElement | null = null;
        const autoNumberingPrefixSetting = new Setting(containerEl)
        autoNumberingPrefixSetting.setName("Enable Auto-number prefix")
            .setDesc("Auto equation numbering prefix for purpose like chapter")
            .addToggle((toggle) => {
                const parent = autoNumberingPrefixSetting.settingEl.parentElement;
                const updateAutoNumberingPrefixContainer = (value: boolean) => {
                    if (value && parent && !autoNumberingPrefixContainer) {
                        // create a new container for auto numbering settings 
                        autoNumberingPrefixContainer = document.createElement("div");
                        parent.insertBefore(
                            autoNumberingPrefixContainer,
                            autoNumberingPrefixSetting.settingEl.nextSibling
                        );
                        this.showAutoNumberingPrefixSettings(autoNumberingPrefixContainer);
                    }
                    else if ((!value || !parent) && autoNumberingPrefixContainer) {
                        // remove the container if auto numbering is disabled 
                        autoNumberingPrefixContainer.remove();
                        autoNumberingPrefixContainer = null;
                    }
                };
                toggle.setValue(this.plugin.settings.autoNumberPrefixEnabled);
                toggle.onChange(async (value) => {
                    this.plugin.settings.autoNumberPrefixEnabled = value;
                    Debugger.log("Auto numbering Prefix enabled:", value);
                    await this.plugin.saveSettings();
                    updateAutoNumberingPrefixContainer(value);
                });
                updateAutoNumberingPrefixContainer(this.plugin.settings.autoNumberPrefixEnabled);
            });

        const autoNumberingQuotesSetting = new Setting(containerEl)
        autoNumberingQuotesSetting.setName("Auto Numbering Equations in Quotes")
            .setDesc("Enable auto numbering for equations in quotes")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.autoNumberEquationsInQuotes);
                toggle.onChange(async (value) => {
                    this.plugin.settings.autoNumberEquationsInQuotes = value;
                    Debugger.log("Auto numbering equations in quotes enabled:", value);
                    await this.plugin.saveSettings();
                });
            });

        let autoNumberingTagCitationContainer: HTMLElement | null = null;
        const enableUpdateTagsInAutoNumberSetting = new Setting(containerEl)
        enableUpdateTagsInAutoNumberSetting.setName("Auto Update Citations in Auto Numbering")
            .setDesc("Enable auto update citations during auto numbering")
            .addToggle((toggle) => {
                const parent = enableUpdateTagsInAutoNumberSetting.settingEl.parentElement;
                const updateAutoNumberCitationContainer = (value: boolean) => {
                    if (value && parent && !autoNumberingTagCitationContainer) {
                        // create a new container for auto numbering settings 
                        autoNumberingTagCitationContainer = document.createElement("div");
                        parent.insertBefore(
                            autoNumberingTagCitationContainer,
                            enableUpdateTagsInAutoNumberSetting.settingEl.nextSibling
                        );
                        this.showAutoNumberingCitationUpdateSettings(autoNumberingTagCitationContainer);
                    }
                    else if ((!value || !parent) && autoNumberingTagCitationContainer) {
                        // remove the container if auto numbering is disabled 
                        autoNumberingTagCitationContainer.remove();
                        autoNumberingTagCitationContainer = null;
                    }
                };

                toggle.setValue(this.plugin.settings.enableUpdateTagsInAutoNumbering);
                toggle.onChange(async (value) => {
                    this.plugin.settings.enableUpdateTagsInAutoNumbering = value;
                    Debugger.log("Auto update tags in auto numbering enabled:", value);
                    await this.plugin.saveSettings();
                    updateAutoNumberCitationContainer(value);
                });
                updateAutoNumberCitationContainer(this.plugin.settings.enableUpdateTagsInAutoNumbering);
            });

        // ================== Equation Widget Render Settings ============= 
        containerEl.createEl("h2", { text: "Equation Widget Settings", cls: "ec-settings-header" });
        containerEl.createEl("p", { text: "1: background, 2: header/footer, 3: hover, 4: active, 5: border" })

        // For widget colors:
        const lightWidgetColorSetting = new Setting(containerEl);
        lightWidgetColorSetting.setName("Light Theme Widget Colors")
            .setDesc("Widget colors for light theme");
        lightWidgetColorSetting.settingEl.addClass("ec-settings-nodelimter");
        for (let i = 0; i < 5; i++) {
            lightWidgetColorSetting.addColorPicker((color) => {
                color.setValue(this.plugin.settings.citationWidgetColor[i]);
                color.onChange(async (value) => {
                    ColorManager.updateWidgetColor(i, value, false, this.plugin.settings);
                    Debugger.log("Widget color " + i + " changed to:", value);
                    await this.plugin.saveSettings();
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
                color.setValue(this.plugin.settings.citationWidgetColorDark[i]);
                color.onChange(async (value) => {
                    ColorManager.updateWidgetColor(i, value, true, this.plugin.settings);
                    Debugger.log("Widget color dark " + i + " changed to:", value);
                    await this.plugin.saveSettings();
                });
            });
        }

        // ==================  Cache settings ==========    
        containerEl.createEl("h2", { text: "Cache Settings", cls: "ec-settings-header" });
        const CacheUpdateTimeSetting = new Setting(containerEl);

        // 50 - 500 ms, default 200 ms 
        CacheUpdateTimeSetting.setName("Cache Update Time")
            .setDesc("Time refresh cache (in ms), for very large document, consider increase this")
            .addSlider((slider) => {
                slider.setLimits(1000, 10000, 1000)
                slider.setValue(this.plugin.settings.cacheUpdateTime || 5000);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.cacheUpdateTime = value;
                    Debugger.log("Cache Update time changed to:", value, "ms");
                    await this.plugin.saveSettings();
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
                dropdown.addOption("1800000", "30 minutes");

                dropdown.setValue(this.plugin.settings.cacheCleanTime.toString());
                dropdown.onChange(async (value) => {
                    this.plugin.settings.cacheCleanTime = parseInt(value);
                    Debugger.log(`Cache Clear time changed to: ${value} ms`);
                    await this.plugin.saveSettings();
                });
            });


        // ================== PDF export settings ================ 
        containerEl.createEl("h2", { text: "PDF Export Settings", cls: "ec-settings-header" });
        containerEl.createEl("p", {
            text: "⚠️WARNING: original pdf export would failed to render citations, please \
use plugin command `Make markdown copy to export PDF`, \
this will make a correctly-rendered markdown from current note to export pdf.",
            cls: "ec-settings-warning"
        });

        // these two colors directly transfer to function `makePrintMarkdown` (so not in style variables)
        const pdfExportColorSetting = new Setting(containerEl)
        pdfExportColorSetting.setName("Citation color in markdown for PDF")
            .setDesc("Citation colors in PDF export. 1: equation citations 2: superscripts")
            .addColorPicker((color) => {
                color.setValue(this.plugin.settings.citationColorInPdf)
                color.onChange(async (value) => {
                    this.plugin.settings.citationColorInPdf = value;
                    Debugger.log("citation color in pdf changed to:", value);
                    await this.plugin.saveSettings();
                });
            }).addColorPicker((color) => {
                color.setValue(this.plugin.settings.fileSuperScriptColorInPdf)
                color.onChange(async (value) => {
                    this.plugin.settings.fileSuperScriptColorInPdf = value;
                    Debugger.log("file superscript color in pdf changed to:", value);
                    await this.plugin.saveSettings();
                });
            });
        // ==================  Beta features settings ==========   
        containerEl.createEl("h2", { text: "Beta Features", cls: "ec-settings-header" });

        const enableCiteWithCodeBlockInCalloutSetting = new Setting(containerEl);
        enableCiteWithCodeBlockInCalloutSetting.setName("(Beta) Cite with Inline Code Block in Callout")
            .setDesc("Enable citation by inline code block in callout")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.enableCiteWithCodeBlockInCallout);
                toggle.onChange(async (value) => {
                    this.plugin.settings.enableCiteWithCodeBlockInCallout = value;
                    Debugger.log("Citation with inline code block in callout enabled:", value);
                    await this.plugin.saveSettings();
                });
            });
        // ==================  Other settings ================== 
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

                    this.plugin.settings = { ...DEFAULT_SETTINGS };
                    await this.resetStyles(); // reset styles
                    await this.plugin.saveSettings();  // this have no log 

                    // Refresh the display
                    await this.display();
                    new Notice("Settings have been restored to defaults");
                });
            });

        new Setting(containerEl)
            .setName("Debug Mode")
            .setDesc("Enables debug mode for the plugin (this option needs re-enable after each Obsidian restart)")
            .addToggle((toggle) => {
                toggle.setValue(Debugger.debugMode);  // not use the Plugin settings, so restore each time 
                toggle.onChange((value) => {
                    Debugger.debugMode = toggle.getValue();
                    new Notice("Equation Citator : Debug mode" + (value ? " enabled" : " disabled"));
                })
            });
    }

    showContinuousCitationSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Continuous Citation Range Symbol")
            .setDesc("Range symbol for continuous citations in a single cite")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("~")
                text.setValue(this.plugin.settings.continuousRangeSymbol)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.continuousRangeSymbol) {
                        if (validateDelimiter(newValue)) {
                            this.plugin.settings.continuousRangeSymbol = newValue;
                            Debugger.log("Continuous citation range symbol changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters are allowed, Change not saved");
                            text.setValue(this.plugin.settings.continuousRangeSymbol);
                        }
                    }
                }
            });

        new Setting(containerEl)
            .setName("Continuous Citation Delimiter")
            .setDesc("Delimiter for recognition of continuous citations, split by space")
            .addText((text) => {
                text.inputEl.classList.add("ec-multi-delimiter-input");
                text.setPlaceholder("e.g. '. - : \\_'")
                text.setValue(this.plugin.settings.continuousDelimiters)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.continuousDelimiters) {
                        const delimiters = newValue.split(" ");
                        const isValid = delimiters.every(d => validateDelimiter(d));
                        if (isValid) {
                            this.plugin.settings.continuousDelimiters = newValue;
                            Debugger.log("Continuous citation delimiter changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters are allowed in each delimiter, Change not saved");
                            text.setValue(this.plugin.settings.continuousDelimiters);
                        }
                    }
                }
            });
    }

    showCrossFileCitationSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Cite File Delimiter")
            .setDesc("Delimiter after equation number for footnote file citations")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("^")
                text.setValue(this.plugin.settings.fileCiteDelimiter)
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.fileCiteDelimiter) {
                        if (validateDelimiter(newValue)) {
                            this.plugin.settings.fileCiteDelimiter = newValue;
                            Debugger.log("File cite delimiter changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters are allowed, Change not saved");
                            text.setValue(this.plugin.settings.fileCiteDelimiter);
                        }
                    }
                }
            });

        new Setting(containerEl)
            .setName("File Citation Color")
            .setDesc("Color for citations superscript, 1: display color 2: color when hovering")
            .addColorPicker((color) => {
                color.setValue(this.plugin.settings.fileSuperScriptColor)
                color.onChange(async (value) => {
                    this.plugin.settings.fileSuperScriptColor = value;
                    Debugger.log("File superscript color changed to:", value);
                    await this.plugin.saveSettings();
                    ColorManager.updateAllColors(this.plugin.settings)
                });
            }).addColorPicker((color) => {
                color.setValue(this.plugin.settings.fileSuperScriptHoverColor)
                color.onChange(async (value) => {
                    this.plugin.settings.fileSuperScriptHoverColor = value;
                    Debugger.log("File superscript hover color changed to:", value);
                    await this.plugin.saveSettings();
                    ColorManager.updateAllColors(this.plugin.settings)
                });
            });
    }

    showAutoNumberingPrefixSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName("Auto Numbering Prefix")
            .setDesc("Prefix for all auto numbered equations (e.g., '10.' for '10.1', '10.2', etc.)")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setValue(this.plugin.settings.autoNumberPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.autoNumberPrefix) {
                        this.plugin.settings.autoNumberPrefix = newValue;
                        Debugger.log("Auto numbering prefix changed to:", newValue);
                        await this.plugin.saveSettings();
                    }
                }
            });
    }

    showAutoNumberingCitationUpdateSettings(containerEl: HTMLElement): void {

        const deleteRepeatTagsInAutoNumberSetting = new Setting(containerEl)
        deleteRepeatTagsInAutoNumberSetting.setName("Auto Delete Conflicting Tag Citations")
            .setDesc("Automatically delete conflicting tag citations during auto numbering, instead of prompting you each time.")
            .addToggle((toggle) => {
                toggle.setTooltip("If two tags are assigned the same number during auto numbering, the original citation will be automatically deleted without confirmation. Equivalent to always choosing 'Delete' when renaming tags.")
                toggle.setValue(this.plugin.settings.deleteRepeatTagsInAutoNumbering);
                toggle.onChange(async (value) => {
                    this.plugin.settings.deleteRepeatTagsInAutoNumbering = value;
                    Debugger.log("Delete repeat tags in auto numbering enabled:", value);
                    await this.plugin.saveSettings();
                });
            });

        const deleteUnusedTagsInAutoNumberSetting = new Setting(containerEl)
        deleteUnusedTagsInAutoNumberSetting
            .setName("Auto Delete Unused Tags Citations")
            .setDesc("Delete unused tag citations when auto numbering all equations")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.deleteUnusedTagsInAutoNumbering);
                toggle.setTooltip("Deletes citations (e.g., \\ref{1.3.4}) that don't match any equation included in auto-numbering. Citations inside quotes are preserved only if “Auto Numbering Equations in Quotes” is enabled.")
                toggle.onChange(async (value) => {
                    this.plugin.settings.deleteUnusedTagsInAutoNumbering = value;
                    Debugger.log("Delete unused tags in auto numbering enabled:", value);
                    await this.plugin.saveSettings();
                });
            });

        deleteUnusedTagsInAutoNumberSetting.settingEl.addClass("ec-settings-nodelimter");
    }

    resetStyles(): void {
        ColorManager.resetAllColors(DEFAULT_SETTINGS);
    }
}
