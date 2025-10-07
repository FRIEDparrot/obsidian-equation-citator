import EquationCitator from "@/main";
import { PluginSettingTab, App, Setting, Notice } from "obsidian";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import { ColorManager } from "./styleManagers/colorManager";
import { WidgetSizeManager, WidgetSizeVariable } from "./styleManagers/widgetSizeManager";
import { addBasicCitationSettingsTab } from "./pages/citationSettingsTab";
import { addAutoNumberSettingsTab } from "./pages/autoNumberingSettingsTab";
import { addPdfExportSettingsTab } from "./pages/pdfExportSettingsTab";
import { addStyleSettingsTab } from "./pages/styleSettingsTab";
import { addOtherSettingsTab } from "./pages/OtherSettingsTab";
import { addCacheSettingsTab } from "./pages/cacheSettingsTab";
import { validateLetterPrefix } from "@/utils/string_processing/string_utils";

//#region Style Settings Utilities
export function resetStyles(): void {
    ColorManager.resetAllColors(DEFAULT_SETTINGS);
    WidgetSizeManager.resetAllSizes(DEFAULT_SETTINGS);
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
    constructor(app: App, plugin: EquationCitator) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // const divLine = containerEl.createDiv({cls:"ec-settings-title ec-title-colorful"});
        // const colorfulBackground = divLine.createDiv()
        const titleContainer = containerEl.createDiv({ cls: "ec-header-container" });
        const settingsTitleText = `Equation Citator v${this.plugin.manifest.version}`;

        titleContainer.createEl("span", { text: settingsTitleText, cls: "ec-header-background" });
        titleContainer.createEl("span", { text: settingsTitleText, cls: "ec-header-foreground" });
        
        // Toolbar with mode toggle and group selector placeholder
        const toolbar = containerEl.createEl("div", { cls: "ec-settings-toolbar" });
    
        // Mode toggle
        new Setting(toolbar)
            .setName("Settings Display Mode")
            .addDropdown((dd) => {
                dd.addOption("concise", "Concise");
                dd.addOption("categorical", "Categorical");
                dd.setValue(this.plugin.settings.settingsDisplayMode ?? "categorical");
                dd.onChange(async (value) => {
                    this.plugin.settings.settingsDisplayMode = value as "categorical" | "concise";
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        const mode = this.plugin.settings.settingsDisplayMode ?? "categorical";

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
            chip.createDiv({ cls: `ec-chip-icon lucide-${g.icon}` });
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
            { id: "ec-group-citation", title: "Citation", icon: "rocket" },
            { id: "ec-group-auto", title: "Auto Numbering", icon: "hash" },
            { id: "ec-group-style", title: "Style", icon: "palette" },
            { id: "ec-group-pdf", title: "PDF Export", icon: "file-down" },
            { id: "ec-group-cache", title: "Cache", icon: "database" },
            { id: "ec-group-other", title: "Other / Beta", icon: "settings" }
        ];
        // group selector controls active category
        this.renderGroupSelector(this.containerEl, groups, (id) => {
            this.activeCategoryId = id;
            renderActive();
        });

        const content = this.containerEl.createEl("div", { cls: "ec-category-content-holder" });

        const renderActive = () => {
            content.empty();
            const activeId = this.activeCategoryId ?? groups[0].id;
            if (activeId === "ec-group-citation") addBasicCitationSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-auto") addAutoNumberSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-style") addStyleSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-pdf") addPdfExportSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-cache") addCacheSettingsTab(content, this.plugin);
            else if (activeId === "ec-group-other") addOtherSettingsTab(content, this.plugin, this);
        };

        // initial render
        renderActive();
    }

    private renderConcise(containerEl: HTMLElement) {
        // Basic Section
        containerEl.createEl("h2", { text: "Basic Settings", cls: "ec-settings-title ec-concise-title" });

        // Auto Numbering Depth
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

        // Advanced Section
        containerEl.createEl("h2", { text: "Advanced Settings", cls: "ec-settings-title ec-concise-title" });

        // Simple selector to promote settings (placeholder for future drag/drop)
        const customize = containerEl.createEl("div", { cls: "ec-settings-customize" });
        new Setting(customize)
            .setName("Customize Basic Settings")
            .setDesc("Select categories to include in Basic section (future: drag & drop)")
            .addDropdown((dd) => {
                dd.addOption("none", "None");
                dd.addOption("citation", "Citation");
                dd.addOption("auto", "Auto Numbering");
                dd.addOption("style", "Style");
                dd.onChange(async () => { /* placeholder for future behavior */ });
            });

        // Render all settings below as advanced
        addBasicCitationSettingsTab(containerEl, this.plugin);
        addAutoNumberSettingsTab(containerEl, this.plugin);
        addStyleSettingsTab(containerEl, this.plugin);
        addPdfExportSettingsTab(containerEl, this.plugin);
        addCacheSettingsTab(containerEl, this.plugin);
        addOtherSettingsTab(containerEl, this.plugin, this);
    }
}
