import EquationCitator from "@/main";
import { PluginSettingTab, App, Setting, Notice, setIcon } from "obsidian";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import { ColorManager } from "./styleManagers/colorManager";
import { WidgetSizeManager, WidgetSizeVariable } from "./styleManagers/widgetSizeManager";

import { addPdfExportSettingsTab } from "@/settings/pages/pdfExportSettingsTab";
import { addStyleSettingsTab } from "@/settings/pages/styleSettingsTab";
import { addOtherSettingsTab } from "@/settings/pages/OtherSettingsTab";
import { addCacheSettingsTab } from "@/settings/pages/cacheSettingsTab";
import { validateLetterPrefix } from "@/utils/string_processing/string_utils";
import { createFoldablePanel } from "@/settings/extensions/foldablePanel";
import { addCitationSettingsTab } from "@/settings/pages/citationSettingsTab";
import { addAutoNumberSettingsTab } from "@/settings/pages/autoNumberSettingsTab";
import { addEquationPanelSettingsTab } from "@/settings/pages/equationPanelSettingsTab";
import { createCustomizePanel } from "@/settings/extensions/customizePanel";
import { SETTINGS_METADATA } from "@/settings/defaultSettings";

//#region Style Settings Utilities
export function resetStyles(): void {
    ColorManager.resetAllColors(DEFAULT_SETTINGS);
    WidgetSizeManager.resetAllSizes(DEFAULT_SETTINGS);
}

export interface UserSettingGroupConfig {
    basic ?: string[];
    advanced?: string[];
}

/**
 * Cleans up all custom styles by removing style elements related to color and widget size.
 */
export function cleanUpStyles() {
    ColorManager.cleanup(); // remove the style element
    WidgetSizeManager.cleanUp();
}
//#endregion

export enum SettingsDisplayMode {
    Concise = "concise",
    Categorical = "categorical",
}

export class SettingsTabView extends PluginSettingTab {
    plugin: EquationCitator;
    private activeCategoryId: string | null = null;
    private foldStates: Map<string, boolean> = new Map([
        ["basic-settings", true],
        ["advanced-settings", false],
        ["customize-settings", false],
    ]);
    private showReorderButtons: boolean = false;

    constructor(app: App, plugin: EquationCitator) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // render title 
        const titleContainer = containerEl.createDiv({ cls: "ec-settings-header-container" });
        const settingsTitleText = `Equation Citator v${this.plugin.manifest.version}`;

        titleContainer.createEl("span", { text: settingsTitleText, cls: "ec-settings-header-background" });
        titleContainer.createEl("span", { text: settingsTitleText, cls: "ec-settings-header-foreground" });

        // Toolbar with mode toggle and group selector placeholder
        const toolbar_wrapper = containerEl.createDiv({ cls: "ec-settings-toolbar-wrapper" })
        const toolbar = toolbar_wrapper.createEl("div", { cls: "ec-settings-toolbar" });

        // Mode toggle
        const modeDiv = toolbar.createDiv({ cls: "ec-settings-mode-toggle" });
        new Setting(modeDiv)
            .setName("Display")
            .addDropdown((dd) => {
                dd.addOption(SettingsDisplayMode.Concise, "Concise");
                dd.addOption(SettingsDisplayMode.Categorical, "Categorical");
                dd.setValue(this.plugin.settings.settingsDisplayMode ?? SettingsDisplayMode.Concise);
                dd.onChange(async (value) => {
                    this.plugin.settings.settingsDisplayMode = value as SettingsDisplayMode.Concise | SettingsDisplayMode.Categorical;
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        // Update check button 
        const updateDiv = toolbar.createDiv({ cls: "ec-settings-update-check" });
        new Setting(updateDiv)
            .setName("Check Updates")
            .addButton((btn) => {
                btn.setButtonText("Check Now");
                btn.setIcon("refresh-cw");
                btn.onClick(async () => {
                    await this.plugin.checkForUpdates(true);
                });
            });

        const searchDiv = toolbar.createDiv({ cls: "ec-settings-search-textbox-wrapper" })
        const searchSetting = new Setting(searchDiv)
        const searchIcon = searchDiv.createDiv({cls: "ec-search-icon"})
        setIcon(searchIcon, 'search')
        searchSetting.addSearch((text) => {
            text.inputEl.classList.add("ec-settings-search-textbox")
            text.setPlaceholder("Search settings")
        })
        const mode = this.plugin.settings.settingsDisplayMode ?? "concise";
        if (mode === "categorical") {
            this.renderCategorical(containerEl);
        } else {
            this.renderConcise(containerEl);
        }
    }

    private createExpandableCategory(parent: HTMLElement, id: string, title: string, icon: string, render: (el: HTMLElement) => void) {
        const wrapper = parent.createEl("div", { cls: "ec-settings-category", attr: { id } });
        const header = wrapper.createEl("div", { cls: "ec-settings-category-header" });
        header.createEl("div", { cls: "ec-chip-icon" }).createDiv({ cls: `lucide-${icon}` });
        header.createEl("span", { text: title, cls: "ec-settings-category-title" });
        const chevron = header.createEl("div", { cls: "ec-settings-category-chevron" });
        chevron.createDiv({ cls: "lucide-chevron-down" });

        const content = wrapper.createEl("div", { cls: "ec-settings-category-content" });
        render(content);

        let expanded = true;
        const update = () => {
            content.toggleClass("is-collapsed", !expanded);
            header.toggleClass("is-collapsed", !expanded);
        };
        header.onclick = () => { expanded = !expanded; update(); };
        update();
    }

    private renderGroupSelector(containerEl: HTMLElement, groups: { id: string; title: string; icon: string }[], onSelect: (id: string) => void) {
        const selector = containerEl.createEl("div", { cls: "ec-settings-group-selector" });    
        const setActive = (id: string) => {
            selector.querySelectorAll(".ec-chip").forEach((el) => el.classList.remove("is-active"));
            const activeEl = selector.querySelector(`.ec-chip[data-target='${id}']`);
            activeEl?.classList.add("is-active");
        };
        groups.forEach((g, idx) => {
            const chip = selector.createEl("button", { cls: "ec-chip", attr: { 'data-target': g.id, title: g.title } });
            chip.setAttr("aria-label", g.title);
            const iconContainer = chip.createDiv({ cls: "ec-chip-icon" });
            setIcon(iconContainer, g.icon);
            chip.createSpan({ text: g.title, cls: "ec-chip-text" });
            chip.onclick = () => {
                onSelect(g.id);
                setActive(g.id);
            };
            if ((this.activeCategoryId ?? groups[0].id) === g.id) chip.classList.add("is-active");
        });
    }
    
    private renderCategorical(containerEl: HTMLElement) {
        const groups = [
            { id: "ec-group-citation", title: "Citation", icon: "feather" },
            { id: "ec-group-auto", title: "Auto Numbering", icon: "hash" },
            { id: "ec-group-panel", title: "Equation Panel", icon: "layout-panel-left" },
            { id: "ec-group-style", title: "Style", icon: "palette" },
            { id: "ec-group-pdf", title: "PDF Export", icon: "file-down" },
            { id: "ec-group-cache", title: "Cache", icon: "database" },
            { id: "ec-group-other", title: "Other / Beta", icon: "settings" }
        ];

        // Create a wrapper container for both selector and content
        const wrapper = this.containerEl.createEl("div", { cls: "ec-categorical-wrapper" });

        // group selector controls active category
        this.renderGroupSelector(wrapper, groups, (id) => {
            this.activeCategoryId = id;
            renderActive();
        });

        const content = wrapper.createEl("div", { cls: "ec-category-content-holder" });

        const renderActive = () => {
            content.empty();
            const activeId = this.activeCategoryId ?? groups[0].id;
            if (activeId === "ec-group-citation") addCitationSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-auto") addAutoNumberSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-panel") addEquationPanelSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-style") addStyleSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-pdf") addPdfExportSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-cache") addCacheSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-other") addOtherSettingsTab(content, this.plugin, this);
        };

        // initial render
        renderActive();
    }
    
    private renderConcideBasicSettings(containerEl: HTMLElement){
        new Setting(containerEl)
            .setName("Auto Numbering Depth")
            .setDesc("Maximum depth for equation numbers")
            .addSlider((slider) => {
                slider.setLimits(1, 6, 1);
                slider.setValue(this.plugin.settings.autoNumberDepth || 1);
                slider.setDynamicTooltip();
                slider.onChange(async (value) => {
                    this.plugin.settings.autoNumberDepth = value;
                    await this.plugin.saveSettings();
                });
            });

        // Equation Preview Widget Width
        new Setting(containerEl)
            .setName("Equation Preview Widget Width")
            .setDesc("Width of the equation preview widget in pixels")
            .addSlider((slider) => {
                slider.setLimits(200, 800, 10);
                slider.setDynamicTooltip();
                slider.setValue(this.plugin.settings.citationPopoverContainerWidth);
                slider.onChange(async (value) => {
                    this.plugin.settings.citationPopoverContainerWidth = value;
                    WidgetSizeManager.set(WidgetSizeVariable.ContainerWidth, value);
                    await this.plugin.saveSettings();
                });
            });

        // Auto-number No Heading Prefix
        new Setting(containerEl)
            .setName("Auto Numbering No Heading Prefix")
            .setDesc("Prefix for equations without any heading level (letters only)")
            .addText((text) => {
                text.inputEl.classList.add("ec-delimiter-input");
                text.setPlaceholder("P");
                text.setValue(this.plugin.settings.autoNumberNoHeadingPrefix);
                text.inputEl.onblur = async () => {
                    const newValue = text.getValue();
                    if (newValue !== this.plugin.settings.autoNumberNoHeadingPrefix) {
                        if (validateLetterPrefix(newValue)) {
                            this.plugin.settings.autoNumberNoHeadingPrefix = newValue;
                            await this.plugin.saveSettings();
                        } else {
                            new Notice("Only letters are allowed, Change not saved");
                            text.setValue(this.plugin.settings.autoNumberNoHeadingPrefix);
                        }
                    }
                };
            });

        // Reset Settings button
        new Setting(containerEl)
            .setName("Reset Settings")
            .setDesc("Reset all settings to default values")
            .addButton((button) => {
                button.setIcon("reset");
                button.onClick(async () => {
                    new Notice("Restoring Settings ...");
                    await new Promise((resolve) => setTimeout(resolve, 200));
                    this.plugin.settings = { ...DEFAULT_SETTINGS };
                    resetStyles();
                    await this.plugin.saveSettings();
                    this.display();
                    new Notice("Settings have been restored to defaults");
                });
            });
    }
    
    private renderConcise(containerEl: HTMLElement) {
        // Add toggle button for reorder buttons
        const toggleContainer = containerEl.createDiv({ cls: "ec-reorder-toggle-container" });
        new Setting(toggleContainer)
            .setName("Show Reorder Buttons")
            .setDesc("Display arrow buttons to reorder settings")
            .addToggle((toggle) => {
                toggle.setValue(this.showReorderButtons);
                toggle.onChange((value) => {
                    this.showReorderButtons = value;
                    this.display();
                });
            });

        // Render Basic Settings
        createFoldablePanel(
            containerEl,
            "Basic Settings",
            (panel) => {
                this.renderSettingsPanel(panel, this.plugin.settings.basicSettingsKeys, "basic");
            },
            this.foldStates.get("basic-settings") ?? true,
            (newState) => {
                this.foldStates.set("basic-settings", newState);
            }
        );

        // Render Advanced Settings
        createFoldablePanel(
            containerEl,
            "Advanced Settings",
            (panel) => {
                this.renderSettingsPanel(panel, this.plugin.settings.advancedSettingsKeys, "advanced");
            },
            this.foldStates.get("advanced-settings") ?? false,
            (newState) => {
                this.foldStates.set("advanced-settings", newState);
            }
        );

        // Render Customize Panel
        createFoldablePanel(
            containerEl,
            "Customize Settings Display",
            (panel) => {
                createCustomizePanel(panel, this.plugin, () => {
                    // Re-render the entire view when settings change
                    this.display();
                });
            },
            this.foldStates.get("customize-settings") ?? false,
            (newState) => {
                this.foldStates.set("customize-settings", newState);
            }
        );
    }

    /**
     * Render a settings panel with reorder buttons
     */
    private renderSettingsPanel(containerEl: HTMLElement, settingKeys: string[], panelType: "basic" | "advanced") {
        settingKeys.forEach((key, index) => {
            const metadata = SETTINGS_METADATA[key as keyof typeof SETTINGS_METADATA];
            if (!metadata || !metadata.renderCallback) return;

            // Create a wrapper for the setting with reorder buttons
            const settingWrapper = containerEl.createDiv({ cls: "ec-setting-with-reorder" });

            // Add reorder buttons BEFORE the setting content if enabled
            if (this.showReorderButtons) {
                const reorderButtons = settingWrapper.createDiv({ cls: "ec-setting-reorder-buttons" });

                // Move up button
                const upBtn = reorderButtons.createEl("button", { cls: "ec-reorder-btn", attr: { "aria-label": "Move up" } });
                setIcon(upBtn, "chevron-up");
                upBtn.disabled = index === 0;
                if (index === 0) upBtn.style.opacity = "0.3";

                upBtn.onclick = async () => {
                    const arr = panelType === "basic" ? this.plugin.settings.basicSettingsKeys : this.plugin.settings.advancedSettingsKeys;
                    if (index > 0) {
                        // Swap with previous
                        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                        await this.plugin.saveSettings();
                        this.display();
                    }
                };

                // Move down button
                const downBtn = reorderButtons.createEl("button", { cls: "ec-reorder-btn", attr: { "aria-label": "Move down" } });
                setIcon(downBtn, "chevron-down");
                downBtn.disabled = index === settingKeys.length - 1;
                if (index === settingKeys.length - 1) downBtn.style.opacity = "0.3";

                downBtn.onclick = async () => {
                    const arr = panelType === "basic" ? this.plugin.settings.basicSettingsKeys : this.plugin.settings.advancedSettingsKeys;
                    if (index < arr.length - 1) {
                        // Swap with next
                        [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                        await this.plugin.saveSettings();
                        this.display();
                    }
                };
            }

            const settingContent = settingWrapper.createDiv({ cls: "ec-setting-content", attr: { style: "flex: 1;" } });

            // Render the actual setting
            metadata.renderCallback(settingContent, this.plugin, true);
        });

        // Add reset settings button at the end for basic panel
        if (panelType === "basic") {
            new Setting(containerEl)
                .setName("Reset Settings")
                .setDesc("Reset all settings to default values")
                .addButton((button) => {
                    button.setIcon("reset");
                    button.onClick(async () => {
                        new Notice("Restoring Settings ...");
                        await new Promise((resolve) => setTimeout(resolve, 200));
                        this.plugin.settings = { ...DEFAULT_SETTINGS };
                        resetStyles();
                        await this.plugin.saveSettings();
                        this.display();
                        new Notice("Settings have been restored to defaults");
                    });
                });
        }
    }
}
