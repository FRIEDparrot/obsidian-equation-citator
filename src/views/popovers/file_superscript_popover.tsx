import { HoverParent, HoverPopover, TFile, normalizePath } from "obsidian";
import Debugger from "@/debug/debugger";
import { adjustPopoverPosition } from "@/utils/workspace/popoverPosition";
import EquationCitator from "@/main";
import { FootNote } from "@/utils/parsers/footnote_parser";

export class FileSuperScriptPopover extends HoverPopover {
    private readonly mouseX?: number;
    private readonly mouseY?: number;

    constructor(
        private readonly plugin: EquationCitator,
        parent: HoverParent,
        private readonly targetEl: HTMLElement | null,
        private readonly sourcePath: string,
        private readonly footnoteIndex: string,
        private readonly waitTime?: number,
        mouseX?: number,
        mouseY?: number
    ) {
        super(parent, targetEl, waitTime, null);
        // Hide the whole host (Obsidian's .hover-popover box) from the very
        // start — it has its own background/border and would flash at its
        // default position while content renders and we reposition it.
        this.hoverEl.addClass("em-popover-rendering");
        this.mouseX = mouseX;
        this.mouseY = mouseY;
    }
    onload(): void {
        void (async () => {
            const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(this.sourcePath);
            if (!footnotes) {
                Debugger.log("can't find footnotes for file: ", this.sourcePath);
                return;
            }
            const footnote = footnotes.find(f => f.num === this.footnoteIndex);
            if (!footnote) {
                Debugger.log("can't find footnote with index: ", this.footnoteIndex, " in file: ", this.sourcePath);
                return;
            }
            this.showFootnote(footnote)
        })().catch((error: unknown) => {
            Debugger.error(`Failed to load footnotes for ${this.sourcePath}.`, error);
        })
    }

    onunload() {
        // nothing to clean up
    }

    /**
     * Renders the footnote content. Popover is hidden for the first frame so
     * the user doesn't see content flicker while the footnote DOM is built.
     * After positioning completes we reveal it on the next frame.
     */
    showFootnote(footnote: FootNote) {
        const container: HTMLElement = this.hoverEl.createDiv();
        container.addClass("em-file-superscript-popover-container");
        // Hide until the first render + position pass completes.
        container.addClass("em-popover-rendering");

        const footnoteContent: HTMLElement = container.createDiv();
        footnoteContent.addClass("em-file-superscript-popover-content");

        if (footnote.path !== null) {
            // pure-file-link format footnote
            const filePath: string = footnote.path;
            const normalizedSourcePath = normalizePath(this.sourcePath);
            const linkEl = footnoteContent.createEl("a", {
                text: footnote.label ?? footnote.path,
            });
            linkEl.addClass("em-file-superscript-popover-link");
            linkEl.setAttr("href", footnote.path);
            linkEl.addEventListener("click", (evt) => {
                evt.preventDefault();
                const sourceFile = this.plugin.app.metadataCache.getFirstLinkpathDest(filePath, normalizedSourcePath);
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
                ).then().catch((error: unknown) => {
                    Debugger.error(`Failed to open footnote file ${sourceFile.path}.`, error);
                });
            });
        }
        else if (footnote.url === null) {
            // text-only format footnote
            const textEl = document.createElement("span");
            textEl.textContent = footnote.text;
            footnoteContent.appendChild(textEl);
            textEl.addClass("em-file-superscript-popover-text");
        }
        else {
            // weblink format footnote
            const linkEl = footnoteContent.createEl("a", {
                text: footnote.label ?? footnote.url,
            });
            linkEl.addClass("em-file-superscript-popover-link");
            linkEl.setAttr("href", footnote.url);
        }

        // Position the popover AFTER all content is in the DOM. Measuring
        // before content is appended under-estimates the height and the
        // viewport-clamp logic miscalculates, causing overflow. Position is
        // computed from the recorded cursor position only.
        if (this.mouseX !== undefined && this.mouseY !== undefined) {
            adjustPopoverPosition(this.hoverEl, this.mouseX, this.mouseY);
        }

        // Show only after rendering + positioning are done. Both the CSS
        // custom properties (position) and the visibility change are applied
        // synchronously, so the browser paints the popover directly at its
        // final position — no flash, no jump.
        container.removeClass("em-popover-rendering");
        this.hoverEl.removeClass("em-popover-rendering");
    }
}