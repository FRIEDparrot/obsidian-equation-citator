import EquationCitator from "@/main";
import { PluginSettingTab, App, Setting, Notice, setIcon } from "obsidian";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import { WidgetSizeManager } from "./styleManagers/widgetSizeManager";

import { addPdfExportSettingsTab } from "@/settings/pages/pdfExportSettingsTab";
import { addStyleSettingsTab } from "@/settings/pages/styleSettingsTab";
import { addOtherSettingsTab } from "@/settings/pages/OtherSettingsTab";
import { addCacheSettingsTab } from "@/settings/pages/cacheSettingsTab";
import { createFoldablePanel } from "@/settings/extensions/foldablePanel";
import { addCitationSettingsTab } from "@/settings/pages/citationSettingsTab";
import { addAutoNumberSettingsTab } from "@/settings/pages/autoNumberSettingsTab";
import { addEquationPanelSettingsTab } from "@/settings/pages/equationPanelSettingsTab";
import { createCustomizePanel } from "@/settings/extensions/customizePanel";
import { SETTINGS_METADATA } from "@/settings/defaultSettings";
import { getAllSettingsByCategory } from "@/settings/settingsHelper";
import { CalloutTableStyleManager } from '@/settings/styleManagers/calloutTabManager';


export interface UserSettingGroupConfig {
    basic ?: string[];
    advanced?: string[];
}

//#region Style Settings Utilities
export function loadStyles(): void {
    WidgetSizeManager.updateFromSettings(DEFAULT_SETTINGS);
    CalloutTableStyleManager.update(DEFAULT_SETTINGS);
}

export function resetStyles(): void {
    CalloutTableStyleManager.cleanup();
}

/**
 * @summary Cleans up all custom styles by removing style elements.
 */
export function cleanUpStyles() {
    WidgetSizeManager.cleanUp();
    CalloutTableStyleManager.cleanup();
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
    private customizeCategoryFoldStates: Map<string, boolean> = new Map();
    private showReorderButtons = false;
    private searchQuery = "";
    private contentContainer: HTMLElement | null = null;

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
            .setName("Check updates")
            .addButton((btn) => {
                btn.setButtonText("Check now");
                btn.setIcon("refresh-cw");
                btn.onClick(async () => {
                    await this.plugin.checkForUpdates(true);
                });
            });
            
        const searchDiv = toolbar.createDiv({ cls: "ec-settings-search-textbox-wrapper" })
        const searchSetting = new Setting(searchDiv)
        searchSetting.setClass("ec-settings-search-setting")
        searchSetting.addSearch((text) => {
            text.inputEl.classList.add("ec-settings-search-textbox")
            text.setPlaceholder("Search settings")
            text.setValue(this.searchQuery)
            text.onChange((value) => {
                this.searchQuery = value.toLowerCase().trim();
                this.renderContent();
            })
        })

        // Create content container
        this.contentContainer = containerEl.createDiv({ cls: "ec-settings-content-container" });
        this.renderContent();
    }

    private renderContent(): void {
        if (!this.contentContainer) return;
        this.contentContainer.empty();

        const mode = this.plugin.settings.settingsDisplayMode ?? "concise";
        if (mode === "categorical") {
            this.renderCategorical(this.contentContainer);
        } else {
            this.renderConcise(this.contentContainer);
        }
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
        const wrapper = containerEl.createEl("div", { cls: "ec-categorical-wrapper" });

        // group selector controls active category
        this.renderGroupSelector(wrapper, groups, (id) => {
            this.activeCategoryId = id;
            renderActive();
        });

        const content = wrapper.createEl("div", { cls: "ec-category-content-holder" });

        const renderActive = () => {
            content.empty();
            const activeId = this.activeCategoryId ?? groups[0].id;

            // If there's a search query, filter the settings
            if (this.searchQuery) {
                this.renderFilteredCategoricalSettings(content, activeId);
            } else {
                if (activeId === "ec-group-citation") addCitationSettingsTab(content, this.plugin);
                else if (activeId === "ec-group-auto") addAutoNumberSettingsTab(content, this.plugin);
                else if (activeId === "ec-group-panel") addEquationPanelSettingsTab(content, this.plugin);
                else if (activeId === "ec-group-style") addStyleSettingsTab(content, this.plugin);
                else if (activeId === "ec-group-pdf") addPdfExportSettingsTab(content, this.plugin);
                else if (activeId === "ec-group-cache") addCacheSettingsTab(content, this.plugin);
                else if (activeId === "ec-group-other") addOtherSettingsTab(content, this.plugin, this);
            }
        };

        // initial render
        renderActive();
    }
        
    private renderConcise(containerEl: HTMLElement) {
        // Add toggle button for reorder buttons
        const toggleContainer = containerEl.createDiv({ cls: "ec-reorder-toggle-container" });
        new Setting(toggleContainer)
            .setName("Show reorder buttons")
            .setDesc("Display arrow buttons to reorder settings")
            .addToggle((toggle) => {
                toggle.setValue(this.showReorderButtons);
                toggle.onChange((value) => {
                    this.showReorderButtons = value;
                    this.renderContent();
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
            "Customize settings display",
            (panel) => {
                createCustomizePanel(
                    panel,
                    this.plugin,
                    () => {
                        // Re-render content when settings change
                        this.renderContent();
                    },
                    this.customizeCategoryFoldStates
                );
            },
            this.foldStates.get("customize-settings") ?? false,
            (newState) => {
                this.foldStates.set("customize-settings", newState);
            }
        );
    }

    /**
     * Render filtered settings for categorical mode
     */
    private renderFilteredCategoricalSettings(containerEl: HTMLElement, activeGroupId: string): void {
        // Map group IDs to category IDs in settingsHelper
        const categoryMap: Record<string, string> = {
            "ec-group-citation": "citation",
            "ec-group-auto": "auto-numbering",
            "ec-group-panel": "equation-panel",
            "ec-group-style": "style",
            "ec-group-pdf": "pdf-export",
            "ec-group-cache": "cache",
            "ec-group-other": "other"
        };

        const categoryId = categoryMap[activeGroupId];
        if (!categoryId) return;

        const allCategories = getAllSettingsByCategory();
        const category = allCategories.find(cat => cat.id === categoryId);
        if (!category) return;

        // Filter settings in this category based on search
        const filteredKeys = category.settingKeys.filter(key => this.settingMatchesSearch(key as string));

        if (filteredKeys.length === 0) {
            const noResults = containerEl.createDiv({ cls: "ec-settings-no-results" });
            noResults.textContent = "No settings found matching your search in this category.";
            return;
        }

        // Render each filtered setting
        filteredKeys.forEach(key => {
            const metadata = SETTINGS_METADATA[key];
            if (!metadata || !metadata.renderCallback) return;
            metadata.renderCallback(containerEl, this.plugin, true);
        });
    }

    /**
     * Check if a setting matches the search query
     */
    private settingMatchesSearch(key: string): boolean {
        if (!this.searchQuery) return true;

        const metadata = SETTINGS_METADATA[key as keyof typeof SETTINGS_METADATA];
        if (!metadata) return false;

        const searchTerms = [
            metadata.name.toLowerCase(),
            metadata.desc.toLowerCase(),
            key.toLowerCase()
        ];

        return searchTerms.some(term => term.includes(this.searchQuery));
    }

    /**
     * Render a settings panel with reorder buttons
     */
    private renderSettingsPanel(containerEl: HTMLElement, settingKeys: string[], panelType: "basic" | "advanced") {
        // Filter settings based on search query
        const filteredKeys = settingKeys.filter(key => this.settingMatchesSearch(key));

        if (filteredKeys.length === 0 && this.searchQuery) {
            const noResults = containerEl.createDiv({ cls: "ec-settings-no-results" });
            noResults.textContent = "No settings found matching your search.";
            return;
        }

        filteredKeys.forEach((key, index) => {
            const metadata = SETTINGS_METADATA[key as keyof typeof SETTINGS_METADATA];
            if (!metadata || !metadata.renderCallback) return;

            // Get the original index in the full array for proper reordering
            const originalIndex = settingKeys.indexOf(key);

            // Create a wrapper for the setting with reorder buttons
            const settingWrapper = containerEl.createDiv({ cls: "ec-setting-with-reorder" });

            // Add reorder buttons BEFORE the setting content if enabled
            if (this.showReorderButtons && !this.searchQuery) {
                const reorderButtons = settingWrapper.createDiv({ cls: "ec-setting-reorder-buttons" });

                // Move up button
                const upBtn = reorderButtons.createEl("button", { cls: "ec-reorder-btn", attr: { "aria-label": "Move up" } });
                setIcon(upBtn, "arrow-up");
                upBtn.disabled = originalIndex === 0;
                if (originalIndex === 0) upBtn.addClass("ec-reorder-btn-disabled");

                upBtn.onclick = async () => {
                    const arr = panelType === "basic" ? this.plugin.settings.basicSettingsKeys : this.plugin.settings.advancedSettingsKeys;
                    if (originalIndex > 0) {
                        // Swap with previous
                        [arr[originalIndex - 1], arr[originalIndex]] = [arr[originalIndex], arr[originalIndex - 1]];
                        await this.plugin.saveSettings();
                        this.renderContent();
                    }
                };

                // Move down button
                const downBtn = reorderButtons.createEl("button", { cls: "ec-reorder-btn", attr: { "aria-label": "Move down" } });
                setIcon(downBtn, "arrow-down");
                downBtn.disabled = originalIndex === settingKeys.length - 1;
                if (originalIndex === settingKeys.length - 1) downBtn.addClass("ec-reorder-btn-disabled");

                downBtn.onclick = async () => {
                    const arr = panelType === "basic" ? this.plugin.settings.basicSettingsKeys : this.plugin.settings.advancedSettingsKeys;
                    if (originalIndex < arr.length - 1) {
                        // Swap with next
                        [arr[originalIndex], arr[originalIndex + 1]] = [arr[originalIndex + 1], arr[originalIndex]];
                        await this.plugin.saveSettings();
                        this.renderContent();
                    }
                };
            }

            const settingContent = settingWrapper.createDiv({ cls: "ec-setting-content" });

            // Render the actual setting
            metadata.renderCallback(settingContent, this.plugin, true);

            // Add divider after each setting except the last one
            if (index < filteredKeys.length - 1) {
                containerEl.createEl("hr", { cls: "ec-settings-divider" });
            }
        });

        // Add reset settings button at the end for basic panel
        if (panelType === "basic") {
            new Setting(containerEl)
                .setName("Reset settings")
                .setDesc("Reset all settings to default values")
                .addButton((button) => {
                    button.setIcon("reset");
                    button.onClick(async () => {
                        new Notice("Restoring settings ...");
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
