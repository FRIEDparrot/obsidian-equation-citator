import { Notice, TFile } from "obsidian";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";

/**
 * Fix :
 * Not use current file processor 
 * (since it have bad real-time update and may confilct with some other file operation)
 */
export class MarkdownFileProcessor {
    constructor(private plugin: EquationCitator,
        private sourcePath: string,
        private callback: (content: string) => Promise<string>) { }
    
    public async execute() {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.sourcePath);
        if (!(file instanceof TFile)) {
            new Notice(`File ${this.sourcePath} not found.`);
            return;
        }
        const content = await this.plugin.app.vault.read(file);  // read file content 
        const processedContent = await this.callback(content);
        if (processedContent) {
            await this.plugin.app.vault.modify(file, processedContent);  // save processed content to file  
        }
        else {
            Debugger.log("No content processed.");
        }
    }
}
