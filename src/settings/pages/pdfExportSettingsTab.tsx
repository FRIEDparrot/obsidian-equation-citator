import EquationCitator from "@/main";
import { FileSystemAdapter, Notice, Platform, Setting } from "obsidian";
import { SETTINGS_METADATA } from "../defaultSettings";

type ElectronDialog = {
    showOpenDialog: (options: {
        title?: string;
        defaultPath?: string;
        properties: string[];
    }) => Promise<{ canceled: boolean; filePaths: string[] }>;
};

export function normalizeAbsolutePathForComparison(path: string): string {
    return path
        .trim()
        .replace(/\\/g, "/")
        .replace(/\/+$/, "")
        .toLowerCase();
}

export function isPathInsideOrEqual(parentPath: string, targetPath: string): boolean {
    const parent = normalizeAbsolutePathForComparison(parentPath);
    const target = normalizeAbsolutePathForComparison(targetPath);

    return target === parent || target.startsWith(`${parent}/`);
}

function getVaultBasePath(plugin: EquationCitator): string | null {
    const adapter = plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }

    return null;
}

function getElectronDialog(): ElectronDialog | null {
    const windowWithRequire = window as typeof window & {
        require?: (moduleName: string) => unknown;
    };

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

    const trimmedPath = path.replace(/[\\/]+$/, "");
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
    PdfExportSettingsTab.citationColorInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageCaptionsInPdf(containerEl, plugin);
    PdfExportSettingsTab.addImageDescInPdf(containerEl, plugin);
    PdfExportSettingsTab.keepImageSpacingForPdf(containerEl, plugin);
    PdfExportSettingsTab.injectCitationMetadataInExportedMarkdown(containerEl, plugin);
}
