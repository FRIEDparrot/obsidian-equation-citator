import { MarkdownView, Notice, TFile } from "obsidian";
import { makePrintMarkdown } from "@/export/pdf_export";
import EquationCitator from "@/main";
import { ModalOption, OptionsModal } from "@/ui/modals/optionsModal";
import Debugger from "@/debug/debugger";


export async function exportCurrentMarkdown(plugin: EquationCitator) {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view)
        return;
    const file = view.file;
    if (!file)
        return;
    const md = await plugin.app.vault.read(file);
    if (!md) {
        new Notice("File is empty");
        return;
    }
    const md_processed = makePrintMarkdown(md, plugin.settings);
    if (!md_processed) {
        new Notice("Nothing to export");
        return;
    }

    const originalName = file.name.replace(/\.md$/, '');
    const newName = originalName + '-exported.md';
    const folderPath = file.path.substring(0, file.path.lastIndexOf('/'));
    const newFilePath = folderPath + '/' + newName;
    const existingFile = plugin.app.vault.getAbstractFileByPath(newFilePath);

    // finish the export process of pdf
    const finishExport = async (newFilePath: string) => {
        new Notice(`Exported to ${newFilePath}`);
        const newLeaf = plugin.app.workspace.getLeaf(true);
        plugin.app.workspace.setActiveLeaf(newLeaf, { focus: true });
        await plugin.app.workspace.openLinkText("", newFilePath, false);
    }

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
                    new Notice(`Export Failed: ${error.message}`);
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
            new Notice(`Error while exporting to ${newFilePath}: ${error.message}`);
            Debugger.error(error);
        }
    }
}   
