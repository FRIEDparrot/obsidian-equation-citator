import { Setting, Notice, setIcon } from "obsidian";
import EquationCitator from "@/main";
import { getAllSettingsByCategory, getSettingDisplayName } from "../settingsHelper";

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
    header.createEl("h3", { text: "Customize Settings Display", cls: "ec-customize-title" });
    header.createEl("p", {
        text: "Choose which settings to show in Basic or Advanced sections. Settings can only appear in one section at a time.",
        cls: "ec-customize-desc"
    });

    // Create category sections
    const categories = getAllSettingsByCategory();

    categories.forEach(category => {
        const categorySection = customizeContainer.createDiv({ cls: "ec-customize-category" });

        // Category header (collapsible)
        const categoryHeader = categorySection.createDiv({ cls: "ec-customize-category-header" });
        const chevron = categoryHeader.createDiv({ cls: "ec-customize-chevron" });
        setIcon(chevron, "chevron-right");
        categoryHeader.createSpan({ text: category.title, cls: "ec-customize-category-title" });

        // Category content (settings list)
        const categoryContent = categorySection.createDiv({ cls: "ec-customize-category-content" });

        category.settingKeys.forEach(settingKey => {
            const settingRow = categoryContent.createDiv({ cls: "ec-customize-setting-row" });

            // Setting name
            const settingName = settingRow.createDiv({ cls: "ec-customize-setting-name" });
            settingName.textContent = getSettingDisplayName(settingKey);

            // Checkbox group
            const checkboxGroup = settingRow.createDiv({ cls: "ec-customize-checkbox-group" });

            // Basic checkbox
            const basicLabel = checkboxGroup.createEl("label", { cls: "ec-customize-checkbox-label" });
            const basicCheckbox = basicLabel.createEl("input", { type: "checkbox" });
            basicLabel.createSpan({ text: "Basic" });
            basicCheckbox.checked = plugin.settings.basicSettingsKeys.includes(settingKey as string);

            // Advanced checkbox
            const advancedLabel = checkboxGroup.createEl("label", { cls: "ec-customize-checkbox-label" });
            const advancedCheckbox = advancedLabel.createEl("input", { type: "checkbox" });
            advancedLabel.createSpan({ text: "Advanced" });
            advancedCheckbox.checked = plugin.settings.advancedSettingsKeys.includes(settingKey as string);

            // Handle checkbox changes - mutually exclusive
            basicCheckbox.addEventListener("change", () => {
                if (basicCheckbox.checked) {
                    // Add to basic, remove from advanced
                    if (!plugin.settings.basicSettingsKeys.includes(settingKey as string)) {
                        plugin.settings.basicSettingsKeys.push(settingKey as string);
                    }
                    plugin.settings.advancedSettingsKeys = plugin.settings.advancedSettingsKeys.filter(
                        k => k !== settingKey
                    );
                    advancedCheckbox.checked = false;
                } else {
                    // Remove from basic
                    plugin.settings.basicSettingsKeys = plugin.settings.basicSettingsKeys.filter(
                        k => k !== settingKey
                    );
                }
                plugin.saveSettings().then(() => onUpdate()).catch(e => new Notice("Error saving settings"));
            });

            advancedCheckbox.addEventListener("change", () => {
                if (advancedCheckbox.checked) {
                    // Add to advanced, remove from basic
                    if (!plugin.settings.advancedSettingsKeys.includes(settingKey as string)) {
                        plugin.settings.advancedSettingsKeys.push(settingKey as string);
                    }
                    plugin.settings.basicSettingsKeys = plugin.settings.basicSettingsKeys.filter(
                        k => k !== settingKey
                    );
                    basicCheckbox.checked = false;
                } else {
                    // Remove from advanced
                    plugin.settings.advancedSettingsKeys = plugin.settings.advancedSettingsKeys.filter(
                        k => k !== settingKey
                    );
                }
                plugin.saveSettings().then(() => onUpdate()).catch(e => new Notice("Error saving settings"));
            });
        });

        // Toggle category collapse with state tracking
        let expanded = foldStates?.get(category.id) ?? false;
        const updateCollapse = () => {
            categoryContent.toggleClass("is-collapsed", !expanded);
            chevron.classList.toggle("is-rotated", expanded);
        };
        updateCollapse();

        categoryHeader.addEventListener("click", () => {
            expanded = !expanded;
            updateCollapse();
            // Save the fold state
            if (foldStates) {
                foldStates.set(category.id, expanded);
            }
        });
    });

    // Reset button
    new Setting(customizeContainer)
        .setName("Reset to Defaults")
        .setDesc("Reset Basic and Advanced settings to their default values")
        .addButton((btn) => {
            btn.setButtonText("Reset");
            btn.setIcon("reset");
            btn.onClick(async () => {
                const { DEFAULT_SETTINGS } = await import("../defaultSettings");
                plugin.settings.basicSettingsKeys = [...DEFAULT_SETTINGS.basicSettingsKeys];
                plugin.settings.advancedSettingsKeys = [...DEFAULT_SETTINGS.advancedSettingsKeys];
                await plugin.saveSettings();
                new Notice("Settings display reset to defaults");
                onUpdate();
            });
        });
}
