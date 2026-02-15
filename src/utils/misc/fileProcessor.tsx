import { Notice, TFile, normalizePath } from "obsidian";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";

const PROHIBIT_SUFFIXES = [
    ".excalidraw.md",
]

export function isMarkdownFilePath(filePath: string) : boolean {
    if (!filePath.endsWith(".md")) {
        return false;
    }
    for (const suffix of PROHIBIT_SUFFIXES) {
        if (filePath.endsWith(suffix)) {
            return false;
        }
    }
    return true;
}

/**
 * Fix :
 * Not use current file processor 
 * (since it have bad real-time update and may confilct with some other file operation)
 */
export class MarkdownFileProcessor {
    constructor(private readonly plugin: EquationCitator,
        private readonly sourcePath: string,
        private readonly callback: (content: string) => Promise<string>) { }
    
    public async execute() : Promise<boolean> {
        const normalizedPath = normalizePath(this.sourcePath);
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(file instanceof TFile)) {
            new Notice(`File ${normalizedPath} not found.`);
            return true;
        }
        
        try {
            const content = await this.plugin.app.vault.read(file);
            const processedContent = await this.callback(content);
            await this.plugin.app.vault.process(file, () => processedContent);
            return true;
        }
        catch (error) {
            Debugger.error("Error processing file:", error, ". Stop processing file");
            return false;
        }
    }
}
