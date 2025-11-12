import { HoverParent, HoverPopover, TFile } from "obsidian";
import Debugger from "@/debug/debugger";
import EquationCitator from "@/main";
import { FootNote } from "@/utils/parsers/footnote_parser";

export class FileSuperScriptPopover extends HoverPopover {
    constructor(
        private plugin: EquationCitator,
        parent: HoverParent,
        private targetEl: HTMLElement | null,
        private sourcePath: string,
        private footnoteIndex: string,
        private waitTime?: number
    ) {
        super(parent, targetEl, waitTime, null);
    }
    async onload(): Promise<void> {
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(this.sourcePath);
        if (!footnotes) {
            Debugger.log("can't find footnotes for file: ", this.sourcePath);
            return;
        }
        const footnote = footnotes.filter(f => f.num === this.footnoteIndex)[0];
        if (!footnote) {
            Debugger.log("can't find footnote with index: ", this.footnoteIndex, " in file: ", this.sourcePath);
            return;
        }
        this.showFootnote(footnote)
    }
    
    onunload() {}

    showFootnote(footnote: FootNote) {
        const container: HTMLElement = this.hoverEl.createDiv();
        container.addClass("em-file-superscript-popover-container");

        const footnoteContent: HTMLElement = container.createDiv();
        footnoteContent.addClass("em-file-superscript-popover-content");

        if (footnote.path !== null) {
            // pure-file-link format footnote  
            const filePath: string = footnote.path;
            const linkEl = footnoteContent.createEl("a", {
                text: footnote.label ?? footnote.path,
            });
            linkEl.addClass("em-file-superscript-popover-link");
            linkEl.setAttr("href", footnote.path);
            linkEl.addEventListener("click", (evt) => {
                evt.preventDefault();
                const sourceFile = this.plugin.app.metadataCache.getFirstLinkpathDest(filePath, this.sourcePath);
                if (!(sourceFile instanceof TFile)) {
                    Debugger.log("Invalid footnote file path: ", footnote.path);
                    return;
                }
                // open the file in current panel 
                const newLeaf = (evt.ctrlKey || evt.metaKey)   // Ctrl on Windows/Linux, Cmd on macOS
                    ? this.plugin.app.workspace.getLeaf("split", 'vertical') // split right by default
                    : this.plugin.app.workspace.getLeaf(true); // reuse current 

                this.plugin.app.workspace.setActiveLeaf(newLeaf, { focus: true });
                this.plugin.app.workspace.openLinkText(
                    "",
                    sourceFile.path,
                    false,
                ).then().catch((err) => {
                    Debugger.error(err);
                });
            });
        }
        else if (footnote.url !== null) {
            // weblink format footnote 
            const linkEl = footnoteContent.createEl("a", {
                text: footnote.label ?? footnote.url,
            });
            linkEl.addClass("em-file-superscript-popover-link");
            linkEl.setAttr("href", footnote.url);
        }
        else {
            // text-only format footnote  
            const textEl = footnoteContent.createEl("span", {
                text: footnote.text,
            });
            textEl.addClass("em-file-superscript-popover-text");
        }
    }
}