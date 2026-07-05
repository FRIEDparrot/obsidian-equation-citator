import { MarkdownView, Notice, TFile, normalizePath } from "obsidian";
import { makePrintMarkdown } from "@/export/pdf_export";
import EquationCitator from "@/main";
import { ModalOption, OptionsModal } from "@/ui/modals/optionsModal";
import Debugger from "@/debug/debugger";

export async function makeExportedMarkdownForPdf(plugin: EquationCitator, file: TFile): Promise<string | null> {
    const md = await plugin.app.vault.read(file);
    if (!md) {
        return null;
    }

    const crossFilePathByIndex = await resolveCrossFilePathsForExport(plugin, file);
    return makePrintMarkdown(md, plugin.settings, crossFilePathByIndex) || null;
}

/**
 * Resolves cross-file citation footnote indexes to vault-relative markdown paths.
 * Unresolved footnotes are omitted so exported metadata can keep the index while
 * setting the machine-readable file path to null.
 */
async function resolveCrossFilePathsForExport(
    plugin: EquationCitator,
    file: TFile
): Promise<ReadonlyMap<string, string>> {
    const sourcePath = normalizePath(file.path);
    const crossFilePathByIndex = new Map<string, string>();

    if (!plugin.settings.enableCrossFileCitation) {
        return crossFilePathByIndex;
    }

    try {
        const footnotes = await plugin.footnoteCache.getFootNotesFromFile(sourcePath) || [];
        for (const footnote of footnotes) {
            if (!footnote.path) continue;

            const resolvedFile = plugin.app.metadataCache.getFirstLinkpathDest(footnote.path, sourcePath);
            if (!resolvedFile) {
                Debugger.log(
                    "Could not resolve export cross-file footnote:",
                    footnote.num,
                    footnote.path,
                    "from",
                    sourcePath
                );
                continue;
            }

            crossFilePathByIndex.set(footnote.num, resolvedFile.path);
        }
    }
    catch (error) {
        Debugger.error(
            "Failed to resolve export cross-file citation footnotes:",
            sourcePath,
            error
        );
    }

    return crossFilePathByIndex;
}

export async function exportCurrentMarkdown(plugin: EquationCitator) {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
        new Notice("No active markdown view found");
        return;
    }
    const file = view.file;
    if (!file || !(file instanceof TFile) || file.extension !== 'md') {
        new Notice("Invalid file type");
        return;
    }
    const md_processed = await makeExportedMarkdownForPdf(plugin, file);
    if (!md_processed) {
        new Notice("File is empty");
        return;
    }

    const originalName = file.name.replace(/\.md$/, '');
    const newName = originalName + '-exported.md';
    const folderPath = file.path.substring(0, file.path.lastIndexOf('/')) || '';
    const newFilePath = folderPath ? (folderPath + '/') + newName : newName;
    const normalizedNewFilePath = normalizePath(newFilePath);
    const existingFile = plugin.app.vault.getAbstractFileByPath(normalizedNewFilePath);

    // finish the export process of pdf
    const finishExport = async (newFilePath: string) => {
        new Notice(`Exported to ${newFilePath}`);
        const newLeaf = plugin.app.workspace.getLeaf(true);
        plugin.app.workspace.setActiveLeaf(newLeaf, { focus: true });
        await plugin.app.workspace.openLinkText("", newFilePath, false);
    }
    const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

    if (existingFile instanceof TFile) {
        const confirmOption: ModalOption = {
            label: "Confirm",
            cta: true,
            action : async():Promise<void> => {
                try {
                    await plugin.app.fileManager.trashFile(existingFile);
                    await plugin.app.vault.create(newFilePath, md_processed);
                    await finishExport(newFilePath);
                }
                catch (error) {
                    new Notice(`Export failed: ${getErrorMessage(error)}`);
                }
            }
        }
        const cancelOption: ModalOption = {
            label: "Cancel",
            cta: false,
            action : () : Promise<void> => {
                new Notice("Export cancelled");
                return Promise.resolve();
            }
        }
        new OptionsModal(plugin.app, "File already exists",
            `${newFilePath} already exists. Do you want to overwrite it?`,
            [confirmOption, cancelOption]
        ).open();
    }
    else {
        try {
            await plugin.app.vault.create(newFilePath, md_processed);
            await finishExport(newFilePath);
        }
        catch (error) {
            new Notice(`Error while exporting to ${newFilePath}: ${getErrorMessage(error)}`);
            Debugger.error(getErrorMessage(error));
        }
    }
}   
