import { Setting, Notice, setIcon } from "obsidian";
import EquationCitator from "@/main";
import { getAllSettingsByCategory, getSettingDisplayName, type SettingsCategory } from "../settingsHelper";
import type { EquationCitatorSettings } from "../defaultSettings";
import { t } from "@/i18n/getLocale";

interface CategoryHeaderElements {
    categoryHeader: HTMLElement;
    chevron: HTMLElement;
}

function ensureSettingInList<T extends string>(settingKeys: T[], settingKey: T): T[] {
    if (settingKeys.includes(settingKey)) {
        return settingKeys;
    }

    return [...settingKeys, settingKey];
}

function removeSettingFromList<T extends string>(settingKeys: T[], settingKey: T): T[] {
    return settingKeys.filter((key) => key !== settingKey);
}

async function saveCustomizePanelSettings(plugin: EquationCitator, onUpdate: () => void): Promise<void> {
    try {
        await plugin.saveSettings();
        onUpdate();
    } catch {
        new Notice(t("settings.customize.saveError"));
    }
}

function setSettingDisplaySection(
    plugin: EquationCitator,
    settingKey: keyof EquationCitatorSettings,
    section: "basic" | "advanced" | null
): void {
    const nextBasicSettings = removeSettingFromList(plugin.settings.basicSettingsKeys, settingKey);
    const nextAdvancedSettings = removeSettingFromList(plugin.settings.advancedSettingsKeys, settingKey);

    plugin.settings.basicSettingsKeys = section === "basic" ?
        ensureSettingInList(nextBasicSettings, settingKey) :
        nextBasicSettings;
    plugin.settings.advancedSettingsKeys = section === "advanced" ?
        ensureSettingInList(nextAdvancedSettings, settingKey) :
        nextAdvancedSettings;
}

function createCategoryHeader(categorySection: HTMLElement, title: string): CategoryHeaderElements {
    const categoryHeader = categorySection.createDiv({ cls: "ec-customize-category-header" });
    const chevron = categoryHeader.createDiv({ cls: "ec-customize-chevron" });
    setIcon(chevron, "chevron-right");
    categoryHeader.createSpan({ text: title, cls: "ec-customize-category-title" });

    return {
        categoryHeader,
        chevron,
    };
}

function bindCategoryCollapse(
    categoryHeader: HTMLElement,
    categoryContent: HTMLElement,
    chevron: HTMLElement,
    categoryId: string,
    foldStates?: Map<string, boolean>
): void {
    let expanded = foldStates?.get(categoryId) ?? false;
    const updateCollapse = () => {
        categoryContent.toggleClass("is-collapsed", !expanded);
        chevron.classList.toggle("is-rotated", expanded);
    };
    updateCollapse();

    categoryHeader.addEventListener("click", () => {
        expanded = !expanded;
        updateCollapse();
        foldStates?.set(categoryId, expanded);
    });
}

function bindDisplaySectionCheckboxes(
    plugin: EquationCitator,
    settingKey: keyof EquationCitatorSettings,
    basicCheckbox: HTMLInputElement,
    advancedCheckbox: HTMLInputElement,
    onUpdate: () => void
): void {
    basicCheckbox.addEventListener("change", () => {
        setSettingDisplaySection(plugin, settingKey, basicCheckbox.checked ? "basic" : null);
        advancedCheckbox.checked = false;
        void saveCustomizePanelSettings(plugin, onUpdate);
    });

    advancedCheckbox.addEventListener("change", () => {
        setSettingDisplaySection(plugin, settingKey, advancedCheckbox.checked ? "advanced" : null);
        basicCheckbox.checked = false;
        void saveCustomizePanelSettings(plugin, onUpdate);
    });
}

function createSettingRow(
    categoryContent: HTMLElement,
    plugin: EquationCitator,
    settingKey: keyof EquationCitatorSettings,
    onUpdate: () => void
): void {
    const settingRow = categoryContent.createDiv({ cls: "ec-customize-setting-row" });
    const settingName = settingRow.createDiv({ cls: "ec-customize-setting-name" });
    settingName.textContent = getSettingDisplayName(settingKey);

    const checkboxGroup = settingRow.createDiv({ cls: "ec-customize-checkbox-group" });
    const basicLabel = checkboxGroup.createEl("label", { cls: "ec-customize-checkbox-label" });
    const basicCheckbox = basicLabel.createEl("input", { type: "checkbox" });
    basicLabel.createSpan({ text: t("settings.section.basic") });
    basicCheckbox.checked = plugin.settings.basicSettingsKeys.includes(settingKey);

    const advancedLabel = checkboxGroup.createEl("label", { cls: "ec-customize-checkbox-label" });
    const advancedCheckbox = advancedLabel.createEl("input", { type: "checkbox" });
    advancedLabel.createSpan({ text: t("settings.section.advanced") });
    advancedCheckbox.checked = plugin.settings.advancedSettingsKeys.includes(settingKey);

    bindDisplaySectionCheckboxes(plugin, settingKey, basicCheckbox, advancedCheckbox, onUpdate);
}

function createCategorySection(
    customizeContainer: HTMLElement,
    plugin: EquationCitator,
    category: SettingsCategory,
    onUpdate: () => void,
    foldStates?: Map<string, boolean>
): void {
    const categorySection = customizeContainer.createDiv({ cls: "ec-customize-category" });
    const { categoryHeader, chevron } = createCategoryHeader(categorySection, category.title);
    const categoryContent = categorySection.createDiv({ cls: "ec-customize-category-content" });

    category.settingKeys.forEach((settingKey) => {
        createSettingRow(categoryContent, plugin, settingKey, onUpdate);
    });

    bindCategoryCollapse(categoryHeader, categoryContent, chevron, category.id, foldStates);
}

function createResetButton(
    customizeContainer: HTMLElement,
    plugin: EquationCitator,
    onUpdate: () => void
): void {
    new Setting(customizeContainer)
        .setName(t("settings.customize.reset.name"))
        .setDesc(t("settings.customize.reset.desc"))
        .addButton((btn) => {
            btn.setButtonText(t("settings.customize.reset.button"));
            btn.setIcon("reset");
            btn.onClick(async () => {
                const { DEFAULT_SETTINGS } = await import("../defaultSettings");
                plugin.settings.basicSettingsKeys = [...DEFAULT_SETTINGS.basicSettingsKeys];
                plugin.settings.advancedSettingsKeys = [...DEFAULT_SETTINGS.advancedSettingsKeys];
                await plugin.saveSettings();
                new Notice(t("settings.customize.reset.notice"));
                onUpdate();
            });
        });
}

/**
 * Create a customize panel for managing which settings appear in Basic vs Advanced sections
 */
export function createCustomizePanel(
    containerEl: HTMLElement,
    plugin: EquationCitator,
    onUpdate: () => void,
    foldStates?: Map<string, boolean>
): void {
    const customizeContainer = containerEl.createDiv({ cls: "ec-settings-customize-panel" });

    // Header with description
    const header = customizeContainer.createDiv({ cls: "ec-customize-header" });
    new Setting(header).setName(t("settings.customize.name")).setHeading();
    header.createEl("p", {
        text: t("settings.customize.desc"),
        cls: "ec-customize-desc"
    });

    // Create category sections
    getAllSettingsByCategory().forEach((category) => {
        createCategorySection(customizeContainer, plugin, category, onUpdate, foldStates);
    });

    createResetButton(customizeContainer, plugin, onUpdate);
}
