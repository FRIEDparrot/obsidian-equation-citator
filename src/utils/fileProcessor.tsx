import {  Editor, Notice } from "obsidian";
import EquationCitator from "@/main"; 

export class CurrentFileProcessor {
    plugin: EquationCitator;
    callback: (content: string) => Promise<string>;
    constructor(plugin: EquationCitator, callback: (content: string) => Promise<string>) {
        this.plugin = plugin;
        this.callback = callback; 
    }
    
    private async getEditorMarkdown(editor: Editor): Promise<string> {
        if (editor) {
            const activeFileContent = editor.getValue() || "";
            return activeFileContent;  
        }
        return ""; 
    }

    public async execute() {
        const editor = this.plugin.app.workspace.activeEditor?.editor;
        if (editor) {
            const content = await this.getEditorMarkdown(editor); 
            const processedContent = await this.callback(content); 
            if (processedContent) {
                editor.setValue(processedContent);
            }
        }
        else {
            new Notice("No active editor found."); 
        } 
    }
}
