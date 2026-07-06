import EquationCitator from "@/main";
import { FileSystemAdapter, Notice, Platform, Setting } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";
import { normalizeMarkdownFilePattern } from "@/utils/misc/file_pattern_utils";
import { isPathInsideOrEqual } from "@/utils/misc/desktop_fs_utils";

type ElectronDialog = {
    showOpenDialog: (options: {
        title?: string;
        defaultPath?: string;
        properties: string[];
    }) => Promise<{ canceled: boolean; filePaths: string[] }>;
};

function getVaultBasePath(plugin: EquationCitator): string | null {
    const adapter = plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }

    return null;
}

function getElectronDialog(): ElectronDialog | null {
    const windowWithRequire: Window & {
        require?: (moduleName: string) => unknown;
    } = window;

    const safeRequire = (moduleName: string): unknown => {
        try {
            return windowWithRequire.require?.(moduleName);
        } catch {
            return undefined;
        }
    };

    const electron = safeRequire("electron") as {
        dialog?: ElectronDialog;
        remote?: { dialog?: ElectronDialog };
    } | undefined;
    const remote = safeRequire("@electron/remote") as {
        dialog?: ElectronDialog;
    } | undefined;

    return electron?.remote?.dialog ?? electron?.dialog ?? remote?.dialog ?? null;
}

function getParentFolderPath(path: string | null): string | undefined {
    if (!path) {
        return undefined;
    }

    let trimmedPath = path;
    while (trimmedPath.endsWith("/") || trimmedPath.endsWith("\\")) {
        trimmedPath = trimmedPath.slice(0, -1);
    }
    const separatorIndex = Math.max(trimmedPath.lastIndexOf("/"), trimmedPath.lastIndexOf("\\"));

    if (separatorIndex <= 0) {
        return trimmedPath || undefined;
    }

    return trimmedPath.slice(0, separatorIndex);
}

async function chooseWebsiteExportFolder(currentPath: string, vaultBasePath: string | null): Promise<string | null> {
    if (!Platform.isDesktopApp) {
        new Notice("Folder selection is only available in the desktop app.");
        return null;
    }

    const dialog = getElectronDialog();
    if (!dialog) {
        new Notice("Unable to open folder selector in this Obsidian environment.");
        return null;
    }

    const result = await dialog.showOpenDialog({
        title: "Choose website notes export folder",
        defaultPath: currentPath || getParentFolderPath(vaultBasePath),
        properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
        return null;
    }

    return result.filePaths[0];
}

function getValidWebsiteExportFolderOrBlank(plugin: EquationCitator, folderPath: string): string {
    const trimmedPath = folderPath.trim();
    const vaultBasePath = getVaultBasePath(plugin);

    if (trimmedPath && vaultBasePath && isPathInsideOrEqual(vaultBasePath, trimmedPath)) {
        return "";
    }

    return trimmedPath;
}

function hasDuplicatePattern(patterns: string[], pattern: string, currentIndex: number | null = null): boolean {
    const normalizedPattern = pattern.toLowerCase();
    return patterns.some((existingPattern, index) => {
        if (currentIndex !== null && index === currentIndex) {
            return false;
        }

        return existingPattern.toLowerCase() === normalizedPattern;
    });
}

type IgnoredPatternValidationResult = {
    normalizedPattern: string | null;
    isDuplicate: boolean;
};

function getValidatedIgnoredPattern(
    patterns: string[],
    rawPattern: string,
    currentIndex: number | null = null
): IgnoredPatternValidationResult {
    const normalizedPattern = normalizeMarkdownFilePattern(rawPattern);

    if (!normalizedPattern) {
        new Notice("Ignored file pattern must be a filename pattern, not a folder path.");
        return {
            normalizedPattern: null,
            isDuplicate: false,
        };
    }

    if (hasDuplicatePattern(patterns, normalizedPattern, currentIndex)) {
        new Notice("This ignored file pattern already exists.");
        return {
            normalizedPattern: null,
            isDuplicate: true,
        };
    }

    return {
        normalizedPattern,
        isDuplicate: false,
    };
}

/**
 * Persists an edited ignore pattern after validation and restores the previous value on failure.
 */
async function saveIgnoredPatternAtIndex(
    plugin: EquationCitator,
    index: number,
    originalPattern: string,
    inputEl: HTMLInputElement
): Promise<void> {
    const { normalizedPattern } = getValidatedIgnoredPattern(
        plugin.settings.websiteNotesExportIgnoredFilePatterns,
        inputEl.value,
        index
    );

    if (!normalizedPattern) {
        inputEl.value = originalPattern;
        return;
    }

    plugin.settings.websiteNotesExportIgnoredFilePatterns[index] = normalizedPattern;
    inputEl.value = normalizedPattern;
    await plugin.saveSettings();
}

async function addIgnoredPattern(
    plugin: EquationCitator,
    inputEl: HTMLInputElement,
    rerender: () => void
): Promise<void> {
    const { normalizedPattern, isDuplicate } = getValidatedIgnoredPattern(
        plugin.settings.websiteNotesExportIgnoredFilePatterns,
        inputEl.value
    );

    if (!normalizedPattern) {
        if (isDuplicate) {
            inputEl.value = "";
        }
        return;
    }

    plugin.settings.websiteNotesExportIgnoredFilePatterns.push(normalizedPattern);
    await plugin.saveSettings();
    rerender();
}

async function removeIgnoredPattern(
    plugin: EquationCitator,
    index: number,
    rerender: () => void
): Promise<void> {
    plugin.settings.websiteNotesExportIgnoredFilePatterns.splice(index, 1);
    await plugin.saveSettings();
    rerender();
}

/**
 * Add a row with an editable ignore pattern and a remove button to the settings tab. 
 */
function addIgnoredPatternSettingRow(
    containerEl: HTMLElement,
    plugin: EquationCitator,
    pattern: string,
    index: number,
    rerender: () => void
): void {
    new Setting(containerEl)
        .setClass("ec-website-export-ignore-item")
        .addText((text) => {
            text.setValue(pattern);
            text.setPlaceholder("*.excalidraw");
            text.inputEl.onblur = () => void saveIgnoredPatternAtIndex(plugin, index, pattern, text.inputEl);
        })
        .addButton((button) => {
            button.setButtonText("Remove")
                .setClass("mod-warning")
                .onClick(async () => removeIgnoredPattern(plugin, index, rerender));
        });
}

/**
 * Add a row with an editable ignore pattern and an add button to the settings tab.
 */
function addNewIgnoredPatternSettingRow(
    containerEl: HTMLElement,
    plugin: EquationCitator,
    rerender: () => void
): void {
    let newPatternInput: HTMLInputElement;

    new Setting(containerEl)
        .setClass("ec-website-export-ignore-add")
        .addText((text) => {
            text.setPlaceholder("*.excalidraw");
            newPatternInput = text.inputEl;
        })
        .addButton((button) => {
            button.setButtonText("Add")
                .setCta()
                .onClick(async () => addIgnoredPattern(plugin, newPatternInput, rerender));
        });
}

/**
 * Rebuilds the editable ignore-pattern rows so callbacks always bind to current array indices.
 */
function renderIgnoredPatternList(containerEl: HTMLElement, plugin: EquationCitator): void {
    containerEl.empty();

    const rerender = () => renderIgnoredPatternList(containerEl, plugin);
    plugin.settings.websiteNotesExportIgnoredFilePatterns.forEach((pattern, index) => {
        addIgnoredPatternSettingRow(containerEl, plugin, pattern, index, rerender);
    });
    addNewIgnoredPatternSettingRow(containerEl, plugin, rerender);
}

export const PdfExportSettingsTab = {
    websiteNotesExportFolder(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.websiteNotesExportFolder;
        const setting = new Setting(containerEl);
        const currentFolderText = document.createElement("div");
        currentFolderText.addClass("setting-item-description");

        const updateCurrentFolderText = () => {
            currentFolderText.setText(plugin.settings.websiteNotesExportFolder
                ? plugin.settings.websiteNotesExportFolder
                : "Not set");
        };
        updateCurrentFolderText();

        setting.setName(name)
            .setDesc(desc)
            .addButton((button) => {
                button.setButtonText("Choose")
                    .setCta()
                    .onClick(async () => {
                        const previousFolder = getValidWebsiteExportFolderOrBlank(
                            plugin,
                            plugin.settings.websiteNotesExportFolder
                        );
                        const vaultBasePath = getVaultBasePath(plugin);
                        const selectedFolder = await chooseWebsiteExportFolder(previousFolder, vaultBasePath);

                        if (!selectedFolder) {
                            return;
                        }

                        if (vaultBasePath && isPathInsideOrEqual(vaultBasePath, selectedFolder)) {
                            plugin.settings.websiteNotesExportFolder = previousFolder;
                            await plugin.saveSettings();
                            updateCurrentFolderText();
                            new Notice("Website notes export folder must be outside the current vault/repository. Reset to the last valid folder or blank.");
                            return;
                        }

                        plugin.settings.websiteNotesExportFolder = selectedFolder.trim();
                        await plugin.saveSettings();
                        updateCurrentFolderText();
                    });
            })
            .addButton((button) => {
                button.setButtonText("Clear")
                    .onClick(async () => {
                        if (!plugin.settings.websiteNotesExportFolder) {
                            return;
                        }

                        plugin.settings.websiteNotesExportFolder = "";
                        await plugin.saveSettings();
                        updateCurrentFolderText();
                    });
            });

        setting.descEl.appendChild(currentFolderText);
    },

    websiteNotesExportIgnoredFilePatterns(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.websiteNotesExportIgnoredFilePatterns;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc);

        const patternListContainer = containerEl.createDiv("ec-website-export-ignore-list-container");
        renderIgnoredPatternList(patternListContainer, plugin);
    },

    citationColorInPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.citationColorInPdf;
        const pdfExportColorSetting = new Setting(containerEl);

        pdfExportColorSetting.setName(name)
            .setDesc(desc)
            .addColorPicker((color) => {
                color.setValue(plugin.settings.citationColorInPdf);
                color.onChange(async (value) => {
                    plugin.settings.citationColorInPdf = value;
                    await plugin.saveSettings();
                });
            });
    },
    pdfExportTip(containerEl: HTMLElement, plugin: EquationCitator) {
        containerEl.createEl("p", {
            text: "💡tip: original pdf export would failed to render citations, please use plugin command `Make markdown copy to export PDF`, this will make a correctly-rendered markdown from current note to export pdf.(superscripts will also be converted to normal superscript grammar)",
            cls: "ec-settings-tip"
        });
    },
    addImageCaptionsInPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.addImageCaptionsInPdf;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => { 
                toggle.setValue(plugin.settings.addImageCaptionsInPdf);
                toggle.onChange(async (value) => {
                    plugin.settings.addImageCaptionsInPdf = value;
                    await plugin.saveSettings();
                });
        });
    },
    addImageDescInPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.addImageDescInPdf;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => { 
                toggle.setValue(plugin.settings.addImageDescInPdf);
                toggle.onChange(async (value) => {
                    plugin.settings.addImageDescInPdf = value;
                    await plugin.saveSettings();
                });
        });
    },
    keepImageSpacingForPdf(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.keepImageSpacingForPdf;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.keepImageSpacingForPdf);
                toggle.onChange(async (value) => {
                    plugin.settings.keepImageSpacingForPdf = value;
                    await plugin.saveSettings();
                });
        });
    },
    injectCitationMetadataInExportedMarkdown(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.injectCitationMetadataInExportedMarkdown;
        const setting = new Setting(containerEl);
        setting.setName(name)
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle.setValue(plugin.settings.injectCitationMetadataInExportedMarkdown);
                toggle.onChange(async (value) => {
                    plugin.settings.injectCitationMetadataInExportedMarkdown = value;
                    await plugin.saveSettings();
                });
        });
    },
}   

export function addPdfExportSettingsTab(containerEl: HTMLElement, plugin: EquationCitator) { 
    PdfExportSettingsTab.pdfExportTip(containerEl, plugin); 
    PdfExportSettingsTab.websiteNotesExportFolder(containerEl, plugin);
    PdfExportSettingsTab.websiteNotesExportIgnoredFilePatterns(containerEl, plugin);
    PdfExportSettingsTab.citationColorInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageCaptionsInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageDescInPdf(containerEl, plugin);
    PdfExportSettingsTab.keepImageSpacingForPdf(containerEl, plugin);
    PdfExportSettingsTab.injectCitationMetadataInExportedMarkdown(containerEl, plugin);
}
