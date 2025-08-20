import { MarkdownView, Notice, TFile } from "obsidian";
import { makePrintMarkdown } from "@/views/citation_render";
import EquationCitator from "@/main";
import { ModalOption, OptionsModal } from "@/ui/optionsModal";


export async function exportCurrentMarkdown(plugin: EquationCitator) {
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view)
        return;
    const file = view.file;
    if (!file)
        return;
    const md = await plugin.app.vault.read(file);
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
    
    if (existingFile instanceof TFile) {
        const confirmOption: ModalOption = {
            label: "Confirm",
            cta: true,
            action: async () => {
                try {
                    await plugin.app.fileManager.trashFile(existingFile);
                    await plugin.app.vault.create(newFilePath, md_processed);
                    new Notice(`Exported to ${newFilePath}`);
                }
                catch (error) {
                    new Notice(`Error: ${error.message}`);
                }
            }
        }
        const cancelOption: ModalOption = {
            label: "Cancel",
            cta: false,
            action: () => {
                // do nothing on cancel 
            }
        }
        new OptionsModal(plugin.app, "File already exists",
            `${newFilePath} already exists. Do you want to overwrite it?`,
            [confirmOption, cancelOption]
        ).open();
    }
    else {
        await plugin.app.vault.create(newFilePath, md_processed);
        new Notice(`Exported to ${newFilePath}`);
    }
}   
