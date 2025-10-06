import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import EquationCitator from "@/main";
import { AutoNumberingType } from "@/utils/core/auto_number_utils";
import {
    validateEquationDisplayFormat,
    validLetterPrefix,
    validateDelimiter
} from "@/utils/string_processing/string_utils";
import { ColorManager } from "@/settings/styleManagers/colorManager";
import Debugger from "@/debug/debugger";
import { WidgetSizeManager, WidgetSizeVariable } from "@/settings/styleManagers/widgetSizeManager";
import { containSafeCharAndNotBlank } from "@/utils/string_processing/string_utils";
import { DEFAULT_SETTINGS } from "@/settings/defaultSettings";
import { addSubPanelToggle } from "@/settings/extensions/subPanelToggle";

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
        this.addCitationSettingsTab(containerEl);
        
        // ==================  Auto numbering command settings =======================  
        this.addAutoNumberSettingsTab(containerEl);
        
        // ================== Equation Widget Render Settings ============= 
        this.addStyleSettingsTab(containerEl);

        // ==================  Cache settings ==========    
        this.addCacheSettingsTab(containerEl);
        
        // ================== PDF export settings ================ 
        this.addPdfExportSettingsTab(containerEl);

        // ==================  Other settings ================== 
        this.addOtherSettingsTab(containerEl); 

    }
    
    private addCitationSettingsTab(containerEl: HTMLElement) {
        containerEl.empty();
        containerEl.createEl("h1", { text: "Equation Citator Settings", cls: "ec-settings-title" });
        containerEl.createEl("h2", { text: "Citation Settings", cls: "ec-settings-header" });

        const enableCiteInSourceModeSetting = new Setting(containerEl);
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

        const equationPreviewWidgetWidthSetting = new Setting(containerEl);
        equationPreviewWidgetWidthSetting.setName("Equation Preview Widget Width")
            .setDesc("Width of the equation preview widget in pixels")
            .addSlider((slider) => {
                slider.setLimits(200, 800, 10);
                slider.setDynamicTooltip();
                slider.setValue(this.plugin.settings.citationPopoverContainerWidth);
                slider.onChange(async (value) => {
                    this.plugin.settings.citationPopoverContainerWidth = value;
                    WidgetSizeManager.set(WidgetSizeVariable.ContainerWidth, value);
                    Debugger.log("Equation preview widget width changed to:", value);
                    await this.plugin.saveSettings();
                });
            });

        const citePrefixSetting = new Setting(containerEl);
        citePrefixSetting.setName("Citation Prefix")
            .setDesc("Prefix used for citations, e.g. 'eq:' means use `\\ref{eq:1.1}` for citation")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("eq:");
                text.setValue(this.plugin.settings.citationPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    const valid = containSafeCharAndNotBlank(newValue);
                    if (!valid) {
                        new Notice("Invalid prefix, {}, $ or blank prefix are not allowed");
                        text.setValue(this.plugin.settings.citationPrefix);
                        return;
                    }
                    if (newValue !== this.plugin.settings.citationPrefix && valid) {
                        this.plugin.settings.citationPrefix = newValue;
                        Debugger.log("Citation prefix changed to:", newValue);
                        await this.plugin.saveSettings();
                    }
                };
            });

        const citeFormatSetting = new Setting(containerEl);
        citeFormatSetting.setName("Citation Display Format")
            .setDesc("Display format, use '#' for equation number")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("(#)");
                text.setValue(this.plugin.settings.citationFormat);
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
                };
            });

        const multiCitationDelimiterSetting = new Setting(containerEl);
        multiCitationDelimiterSetting.setName("Multi-Citation Delimiter")
            .setDesc("Delimiter used for multiple citations in a single cite, e.g. ',' for '\\ref{1.2, 1.3}'")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder(",");
                text.setValue(this.plugin.settings.multiCitationDelimiter);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.multiCitationDelimiter) {
                        if (validateDelimiter(newValue)) {
                            this.plugin.settings.multiCitationDelimiter = newValue;
                            Debugger.log("Multi-citation delimiter changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
                            text.setValue(this.plugin.settings.multiCitationDelimiter);
                        }
                    }
                };
            });

        // Render delimiter (display only, no validation required)
        new Setting(containerEl)
            .setName("Multi-Citation Render Delimiter")
            .setDesc("Delimiter shown between citations when rendered (purely visual, e.g. ', ').")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder(", ");
                text.setValue(this.plugin.settings.multiCitationDelimiterRender);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.multiCitationDelimiterRender) {
                        this.plugin.settings.multiCitationDelimiterRender = newValue;
                        Debugger.log("Multi-citation render delimiter changed to:", newValue);
                        await this.plugin.saveSettings();
                    }
                };
            });

        // ==================  File citation settings ==========  
        const renderContinuousCitationSetting = new Setting(containerEl);
        renderContinuousCitationSetting.setName("Enable Continuous Citations")
            .setDesc("Enable continuous  citation format, also render citations in continuous format");

        addSubPanelToggle(
            renderContinuousCitationSetting,
            this.plugin.settings.enableContinuousCitation,
            async (value) => this.plugin.settings.enableContinuousCitation = value,
            (panel) => this.showContinuousCitationSettings(panel)
        );

        const crossFileSetting = new Setting(containerEl)
            .setName("Enable Cross-File Citations")
            .setDesc("Use pure footnote style citations to cite equations across files");

        addSubPanelToggle(
            crossFileSetting,
            this.plugin.settings.enableCrossFileCitation,
            async (value) => this.plugin.settings.enableCrossFileCitation = value,
            (panel) => this.showCrossFileCitationSettings(panel)
        );

        const enableLocalFileNameSetting = new Setting(containerEl);
        enableLocalFileNameSetting.setName("Render Local File Name in Equation Preview")
            .setDesc("Render local file name for citations")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.renderLocalFileName);
                toggle.onChange(async (value) => {
                    this.plugin.settings.renderLocalFileName = value;
                    Debugger.log("Local file name in citation enabled:", value);
                    await this.plugin.saveSettings();
                });
            });
    }

    private addPdfExportSettingsTab(containerEl: HTMLElement) {
        containerEl.createEl("h2", { text: "PDF Export Settings", cls: "ec-settings-header" });
        containerEl.createEl("p", {
            text: "⚠️WARNING: original pdf export would failed to render citations, please \
use plugin command `Make markdown copy to export PDF`, \
this will make a correctly-rendered markdown from current note to export pdf.\
(superscripts will also be converted to normal superscript grammar)",
            cls: "ec-settings-warning"
        });

        // these two colors directly transfer to function `makePrintMarkdown` (so not in style variables)
        const pdfExportColorSetting = new Setting(containerEl);
        pdfExportColorSetting.setName("Citation color for PDF")
            .setDesc("Citation color for PDF export")
            .addColorPicker((color) => {
                color.setValue(this.plugin.settings.citationColorInPdf);
                color.onChange(async (value) => {
                    this.plugin.settings.citationColorInPdf = value;
                    Debugger.log("citation color in pdf changed to:", value);
                    await this.plugin.saveSettings();
                });
            });
    }

    private addOtherSettingsTab(containerEl: HTMLElement) {
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
                    await this.plugin.saveSettings(); // this have no log 


                    // Refresh the display
                    await this.display();
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
                toggle.setValue(this.plugin.settings.enableCiteWithCodeBlockInCallout);
                toggle.onChange(async (value) => {
                    this.plugin.settings.enableCiteWithCodeBlockInCallout = value;
                    Debugger.log("Citation with inline code block in callout enabled:", value);
                    await this.plugin.saveSettings();
                });
            });
    }
    
    private addCacheSettingsTab(containerEl: HTMLElement) {
        containerEl.createEl("h2", { text: "Cache Settings", cls: "ec-settings-header" });
        const CacheUpdateTimeSetting = new Setting(containerEl);

        // 50 - 500 ms, default 200 ms 
        CacheUpdateTimeSetting.setName("Cache Update Time")
            .setDesc("Time refresh cache (in ms), for very large document, consider increase this")
            .addSlider((slider) => {
                slider.setLimits(1000, 10000, 1000);
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

        new Setting(containerEl)
            .setName("Clear Cache")
            .setDesc("Manually clear the cache, useful if you suspect the cache is out of date")
            .addButton((button) => {
                button.setIcon("trash");
                button.setTooltip("Clear Cache");
                button.onClick(async () => {
                    await this.plugin.clearCaches();
                    new Notice("All caches cleared");
                });
            });
    }
    
    private addStyleSettingsTab(containerEl: HTMLElement) { 
        containerEl.createEl("h2", { text: "Style Settings", cls: "ec-settings-header" });
        containerEl.createEl("p", { text: "1: background, 2: header/footer, 3: hover, 4: active, 5: border" });

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
    }

    private addAutoNumberSettingsTab(containerEl: HTMLElement) {
        containerEl.createEl("h2", { text: "Auto equation numbering settings", cls: "ec-settings-header" });

        const autoNumberingDelimiterSetting = new Setting(containerEl);
        autoNumberingDelimiterSetting.setName("Auto Numbering Delimiter")
            .setDesc("Delimiter used for numbering equations, e.g. '.' for '1.1', '-' for '1-1', etc")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("Default: .");
                text.setValue(this.plugin.settings.autoNumberDelimiter);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.autoNumberDelimiter) {
                        if (validateDelimiter(newValue)) {
                            this.plugin.settings.autoNumberDelimiter = newValue;
                            Debugger.log("Auto numbering delimiter changed to:", newValue);
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
                            text.setValue(this.plugin.settings.autoNumberDelimiter);
                        }
                    }
                };
            });

        const autoNumberingLevelSetting = new Setting(containerEl);
        autoNumberingLevelSetting.setName("Auto Numbering Depth")
            .setDesc("Maximum depth for equation numbers (e.g., depth of 2 gives '1.1', depth of 3 gives '1.1.1')")
            .addSlider((slider) => {
                slider.setLimits(1, 6, 1);
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
                dropdown.addOption("Relative", "Relative");
                dropdown.addOption("Absolute", "Absolute");
                dropdown.setValue(this.plugin.settings.autoNumberType);
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
                text.setPlaceholder("Default: P");
                text.setValue(this.plugin.settings.autoNumberNoHeadingPrefix);
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
                };
            });

        let autoNumberingPrefixContainer: HTMLElement | null = null;
        const autoNumberingPrefixSetting = new Setting(containerEl);
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

        const autoNumberingQuotesSetting = new Setting(containerEl);
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
        const enableUpdateTagsInAutoNumberSetting = new Setting(containerEl);
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
    }

    // TODO : add a factory function, to create the expandable settings item
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
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
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
                            new Notice("Only special characters (not brace) are allowed in each delimiter, Change not saved");
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
                            new Notice("Only special characters (not brace) are allowed, Change not saved");
                            text.setValue(this.plugin.settings.fileCiteDelimiter);
                        }
                    }
                }
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
        WidgetSizeManager.resetAllSizes(DEFAULT_SETTINGS);
    }
}

export function cleanUpStyles() {
    ColorManager.cleanup(); // remove the style element
    WidgetSizeManager.cleanUp();
}
