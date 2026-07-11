import EquationCitator from "@/main";
import { AbstractInputSuggest, FileSystemAdapter, Notice, Platform, Setting, TFolder } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";
import type { WebsiteNotesExcludedFolder } from "../defaultSettings";
import { normalizeMarkdownFilePattern } from "@/utils/misc/file_pattern_utils";
import { isPathInsideOrEqual } from "@/utils/misc/desktop_fs_utils";
import Debugger from "@/debug/debugger";
import { t } from "@/i18n/getLocale";

type ElectronDialog = {
    showOpenDialog: (options: {
        title?: string;
        defaultPath?: string;
        properties: string[];
    }) => Promise<{ canceled: boolean; filePaths: string[] }>;
};

type ElectronShell = {
    openPath: (path: string) => Promise<string>;
};

type ElectronModule = {
    dialog?: ElectronDialog;
    shell?: ElectronShell;
    remote?: {
        dialog?: ElectronDialog;
        shell?: ElectronShell;
        require?: (moduleName: string) => unknown;
    };
};

type RemoteModule = {
    dialog?: ElectronDialog;
    shell?: ElectronShell;
    require?: (moduleName: string) => unknown;
};

function getVaultBasePath(plugin: EquationCitator): string | null {
    const adapter = plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }

    return null;
}

function safeRequire(moduleName: string): unknown {
    const windowWithRequire: Window & {
        require?: (moduleName: string) => unknown;
    } = window;

    try {
        return windowWithRequire.require?.(moduleName);
    } catch {
        return undefined;
    }
}

function getElectronDialog(): ElectronDialog | null {
    const electron = safeRequire("electron") as ElectronModule | undefined;
    const remote = safeRequire("@electron/remote") as RemoteModule | undefined;

    return electron?.remote?.dialog ?? electron?.dialog ?? remote?.dialog ?? null;
}

function getElectronShell(): ElectronShell | null {
    const electron = safeRequire("electron") as ElectronModule | undefined;
    const remote = safeRequire("@electron/remote") as RemoteModule | undefined;
    const remoteElectron = remote?.require?.("electron") as ElectronModule | undefined;

    return electron?.remote?.shell ?? electron?.shell ?? remote?.shell ?? remoteElectron?.shell ?? null;
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
        new Notice(t("settings.websiteNotesExportFolder.desktopOnlyNotice"));
        return null;
    }

    const dialog = getElectronDialog();
    if (!dialog) {
        new Notice(t("settings.websiteNotesExportFolder.selectorUnavailableNotice"));
        return null;
    }

    const result = await dialog.showOpenDialog({
        title: t("settings.websiteNotesExportFolder.chooseDialogTitle"),
        defaultPath: currentPath || getParentFolderPath(vaultBasePath),
        properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
        return null;
    }

    return result.filePaths[0];
}

/**
 * Opens the configured website-notes export folder in the desktop file manager.
 */
async function openWebsiteExportFolder(folderPath: string): Promise<void> {
    const trimmedPath = folderPath.trim();

    if (!trimmedPath) {
        return;
    }

    if (!Platform.isDesktopApp) {
        new Notice(t("settings.websiteNotesExportFolder.openDesktopOnlyNotice"));
        return;
    }

    const shell = getElectronShell();
    if (!shell) {
        new Notice(t("settings.websiteNotesExportFolder.openUnavailableNotice"));
        return;
    }

    try {
        const errorMessage = await shell.openPath(trimmedPath);
        if (errorMessage) {
            Debugger.error("Failed to open website notes export folder:", trimmedPath, errorMessage);
            new Notice(t("settings.websiteNotesExportFolder.openFailedNotice"));
        }
    } catch (error) {
        Debugger.error("Failed to open website notes export folder:", trimmedPath, error);
        new Notice(t("settings.websiteNotesExportFolder.openFailedNotice"));
    }
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

type ExcludedFolderValidationResult = {
    normalizedPath: string | null;
    isDuplicate: boolean;
};

class WebsiteNotesExcludedFolderSuggest extends AbstractInputSuggest<string> {
    constructor(plugin: EquationCitator, inputEl: HTMLInputElement) {
        super(plugin.app, inputEl);
        this.limit = 50;
    }

    protected getSuggestions(query: string): string[] {
        const normalizedQuery = query.trim().replaceAll("\\", "/").toLowerCase();
        const folders = this.app.vault
            .getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder && file.path !== "/")
            .map(folder => folder.path)
            .sort((a, b) => a.localeCompare(b));

        if (!normalizedQuery) {
            return folders;
        }

        return folders.filter(path => path.toLowerCase().includes(normalizedQuery));
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.setText(value);
    }

    selectSuggestion(value: string): void {
        this.setValue(value);
        this.close();
    }
}

function getValidatedIgnoredPattern(
    patterns: string[],
    rawPattern: string,
    currentIndex: number | null = null
): IgnoredPatternValidationResult {
    const normalizedPattern = normalizeMarkdownFilePattern(rawPattern);

    if (!normalizedPattern) {
        new Notice(t("settings.websiteNotesExportIgnoredFilePatterns.invalidNotice"));
        return {
            normalizedPattern: null,
            isDuplicate: false,
        };
    }

    if (hasDuplicatePattern(patterns, normalizedPattern, currentIndex)) {
        new Notice(t("settings.websiteNotesExportIgnoredFilePatterns.duplicateNotice"));
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

function normalizeWebsiteNotesExcludedFolderPath(rawPath: string): string | null {
    const normalizedPath = rawPath.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    const pathSegments = normalizedPath.split("/");

    if (!normalizedPath || pathSegments.some(segment => !segment || segment === "." || segment === "..")) {
        return null;
    }

    return normalizedPath;
}

function hasDuplicateExcludedFolder(
    folders: WebsiteNotesExcludedFolder[],
    folderPath: string,
    currentIndex: number | null = null
): boolean {
    const normalizedFolderPath = folderPath.toLowerCase();
    return folders.some((folder, index) => {
        if (currentIndex !== null && index === currentIndex) {
            return false;
        }

        return folder.path.toLowerCase() === normalizedFolderPath;
    });
}

function getValidatedExcludedFolder(
    folders: WebsiteNotesExcludedFolder[],
    rawPath: string,
    currentIndex: number | null = null
): ExcludedFolderValidationResult {
    const normalizedPath = normalizeWebsiteNotesExcludedFolderPath(rawPath);

    if (!normalizedPath) {
        new Notice(t("settings.websiteNotesExcludedFolders.invalidNotice"));
        return {
            normalizedPath: null,
            isDuplicate: false,
        };
    }

    if (hasDuplicateExcludedFolder(folders, normalizedPath, currentIndex)) {
        new Notice(t("settings.websiteNotesExcludedFolders.duplicateNotice"));
        return {
            normalizedPath: null,
            isDuplicate: true,
        };
    }

    return {
        normalizedPath,
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
            text.setPlaceholder(t("settings.websiteNotesExportIgnoredFilePatterns.placeholder"));
            text.inputEl.onblur = () => void saveIgnoredPatternAtIndex(plugin, index, pattern, text.inputEl);
        })
        .addButton((button) => {
            button.setButtonText(t("settings.websiteNotesExportIgnoredFilePatterns.remove"))
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
            text.setPlaceholder(t("settings.websiteNotesExportIgnoredFilePatterns.placeholder"));
            newPatternInput = text.inputEl;
        })
        .addButton((button) => {
            button.setButtonText(t("settings.websiteNotesExportIgnoredFilePatterns.add"))
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

async function saveExcludedFolderPathAtIndex(
    plugin: EquationCitator,
    index: number,
    originalFolder: WebsiteNotesExcludedFolder,
    inputEl: HTMLInputElement
): Promise<void> {
    const { normalizedPath } = getValidatedExcludedFolder(
        plugin.settings.websiteNotesExcludedFolders ?? [],
        inputEl.value,
        index
    );

    if (!normalizedPath) {
        inputEl.value = originalFolder.path;
        return;
    }

    plugin.settings.websiteNotesExcludedFolders[index] = {
        ...originalFolder,
        path: normalizedPath,
    };
    inputEl.value = normalizedPath;
    await plugin.saveSettings();
}

async function setExcludedFolderCompleteIgnore(
    plugin: EquationCitator,
    index: number,
    value: boolean
): Promise<void> {
    const folder = plugin.settings.websiteNotesExcludedFolders[index];
    if (!folder) {
        return;
    }

    plugin.settings.websiteNotesExcludedFolders[index] = {
        ...folder,
        completelyIgnore: value,
    };
    await plugin.saveSettings();
}

async function addExcludedFolder(
    plugin: EquationCitator,
    inputEl: HTMLInputElement,
    rerender: () => void
): Promise<void> {
    const { normalizedPath, isDuplicate } = getValidatedExcludedFolder(
        plugin.settings.websiteNotesExcludedFolders ?? [],
        inputEl.value
    );

    if (!normalizedPath) {
        if (isDuplicate) {
            inputEl.value = "";
        }
        return;
    }

    plugin.settings.websiteNotesExcludedFolders.push({
        path: normalizedPath,
        completelyIgnore: false,
    });
    await plugin.saveSettings();
    rerender();
}

async function removeExcludedFolder(
    plugin: EquationCitator,
    index: number,
    rerender: () => void
): Promise<void> {
    plugin.settings.websiteNotesExcludedFolders.splice(index, 1);
    await plugin.saveSettings();
    rerender();
}

function addExcludedFolderSettingRow(
    containerEl: HTMLElement,
    plugin: EquationCitator,
    folder: WebsiteNotesExcludedFolder,
    index: number,
    rerender: () => void
): void {
    new Setting(containerEl)
        .setClass("ec-website-export-folder-exclude-item")
        .setDesc(t("settings.websiteNotesExcludedFolders.completeIgnore"))
        .addText((text) => {
            text.setValue(folder.path);
            text.setPlaceholder(t("settings.websiteNotesExcludedFolders.pathPlaceholder"));
            new WebsiteNotesExcludedFolderSuggest(plugin, text.inputEl);
            text.inputEl.onblur = () => void saveExcludedFolderPathAtIndex(plugin, index, folder, text.inputEl);
        })
        .addToggle((toggle) => {
            toggle.setTooltip(t("settings.websiteNotesExcludedFolders.completeIgnore"));
            toggle.setValue(folder.completelyIgnore);
            toggle.onChange(async (value) => setExcludedFolderCompleteIgnore(plugin, index, value));
        })
        .addButton((button) => {
            button.setButtonText(t("settings.websiteNotesExcludedFolders.remove"))
                .setClass("mod-warning")
                .onClick(async () => removeExcludedFolder(plugin, index, rerender));
        });
}

function addNewExcludedFolderSettingRow(
    containerEl: HTMLElement,
    plugin: EquationCitator,
    rerender: () => void
): void {
    let newFolderInput: HTMLInputElement;

    new Setting(containerEl)
        .setClass("ec-website-export-folder-exclude-add")
        .addText((text) => {
            text.setPlaceholder(t("settings.websiteNotesExcludedFolders.pathPlaceholder"));
            newFolderInput = text.inputEl;
            new WebsiteNotesExcludedFolderSuggest(plugin, text.inputEl);
        })
        .addButton((button) => {
            button.setButtonText(t("settings.websiteNotesExcludedFolders.add"))
                .setCta()
                .onClick(async () => addExcludedFolder(plugin, newFolderInput, rerender));
        });
}

function renderExcludedFolderList(containerEl: HTMLElement, plugin: EquationCitator): void {
    containerEl.empty();

    const rerender = () => renderExcludedFolderList(containerEl, plugin);
    plugin.settings.websiteNotesExcludedFolders ??= [];
    plugin.settings.websiteNotesExcludedFolders.forEach((folder, index) => {
        addExcludedFolderSettingRow(containerEl, plugin, folder, index, rerender);
    });
    addNewExcludedFolderSettingRow(containerEl, plugin, rerender);
}

export const PdfExportSettingsTab = {
    websiteNotesExportFolder(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.websiteNotesExportFolder;
        const setting = new Setting(containerEl);
        const currentFolderText = document.createElement("div");
        currentFolderText.addClass("setting-item-description");
        let openButtonEl: HTMLButtonElement | null = null;

        const updateCurrentFolderText = () => {
            const hasExportFolder = plugin.settings.websiteNotesExportFolder.trim().length > 0;
            currentFolderText.setText(hasExportFolder
                ? plugin.settings.websiteNotesExportFolder
                : t("settings.websiteNotesExportFolder.notSet"));
            if (openButtonEl) {
                openButtonEl.style.display = hasExportFolder ? "" : "none";
            }
        };

        setting.setName(name)
            .setDesc(desc)
            .addButton((button) => {
                button.setButtonText(t("settings.websiteNotesExportFolder.choose"))
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
                            new Notice(t("settings.websiteNotesExportFolder.outsideVaultNotice"));
                            return;
                        }

                        plugin.settings.websiteNotesExportFolder = selectedFolder.trim();
                        await plugin.saveSettings();
                        updateCurrentFolderText();
                    });
            })
            .addButton((button) => {
                openButtonEl = button.buttonEl;
                button.setButtonText(t("settings.websiteNotesExportFolder.open"))
                    .setTooltip(t("settings.websiteNotesExportFolder.openTooltip"))
                    .onClick(async () => openWebsiteExportFolder(plugin.settings.websiteNotesExportFolder));
            })
            .addButton((button) => {
                button.setButtonText(t("settings.websiteNotesExportFolder.clear"))
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
        updateCurrentFolderText();
    },

    websiteNotesExportIgnoredFilePatterns(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.websiteNotesExportIgnoredFilePatterns;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc);

        const patternListContainer = containerEl.createDiv("ec-website-export-ignore-list-container");
        renderIgnoredPatternList(patternListContainer, plugin);
    },

    websiteNotesExcludedFolders(containerEl: HTMLElement, plugin: EquationCitator) {
        const { name, desc } = SETTINGS_METADATA.websiteNotesExcludedFolders;
        new Setting(containerEl)
            .setName(name)
            .setDesc(desc);

        const folderListContainer = containerEl.createDiv("ec-website-export-folder-exclude-list-container");
        renderExcludedFolderList(folderListContainer, plugin);
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
            text: t("settings.pdfExport.tip"),
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
    PdfExportSettingsTab.websiteNotesExcludedFolders(containerEl, plugin);
    PdfExportSettingsTab.citationColorInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageCaptionsInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageDescInPdf(containerEl, plugin);
    PdfExportSettingsTab.keepImageSpacingForPdf(containerEl, plugin);
    PdfExportSettingsTab.injectCitationMetadataInExportedMarkdown(containerEl, plugin);
}
