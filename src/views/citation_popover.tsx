import { App, MarkdownRenderer } from "obsidian";
import {
    HoverPopover,
    HoverParent,
} from "obsidian";
import Debugger from "@/debug/debugger";

/**
 * Citaton Popover Class, render the equations in the popover 
 */
export class CitationPopover extends HoverPopover {
    tags: string[] = []; // list of tags to be cited
    public isLoaded = false;  // flag to check if popover is loaded 

    constructor(
        private app: App,
        parent: HoverParent,
        private targetEl: HTMLElement | null,
        private equationsMarkdown: string[],
        private sourcePath: string,
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime, null);
        this.equationsMarkdown = equationsMarkdown; // list of equations to render
    }
    public onOpen() { }
    public onClose() { }

    async onload(): Promise<void> {
        this.onOpen();
        if (!this.isLoaded) {
            const container: HTMLElement = this.hoverEl.createDiv();
            container.addClass("em-citation-popover-container");
            container.innerHTML = "Loading...";
            this.isLoaded = true;
        }
    }

    async onunload(): Promise<void> {
        this.isLoaded = false;
        this.onClose();
    }

    // show() {
    //     const container: HTMLElement = this.hoverEl.createDiv();
    //     container.addClass("em-citation-popover-container");

    //     // Create header
    //     const header = container.createDiv();
    //     header.addClass("em-citation-header");
    //     header.createEl("h3", { text: "Referenced Equations", cls: "em-citation-title" });

    //     // Create content wrapper
    //     const content = container.createDiv();
    //     content.addClass("em-citation-content");

    //     // Create scrollable equations container
    //     const equationsContainer = content.createDiv();
    //     equationsContainer.addClass("em-equations-container");

    //     // Loop and create div for each equation
    //     this.equationsMarkdown.forEach((eq, index) => {
    //         const equationWrapper = equationsContainer.createDiv();
    //         this.addClickEffects(equationWrapper);   // Add click effects to each equation
    //         equationWrapper.addClass("em-equation-wrapper");
    //         equationWrapper.setAttribute("data-equation-index", index.toString());

    //         // Create equation number/label
    //         const equationLabel = equationWrapper.createDiv();
    //         equationLabel.addClass("em-equation-label");
    //         equationLabel.textContent = `Eq. ${index + 1}`;

    //         // Create equation content div
    //         const equationDiv = equationWrapper.createDiv();
    //         equationDiv.addClass("em-equation-content");

    //         // Render the markdown equation
    //         MarkdownRenderer.render(
    //             this.app, 
    //             eq, 
    //             equationDiv, 
    //             this.sourcePath,
    //             // @ts-ignore - targetEl may not be a Component but MarkdownRenderer can handle it
    //             this.targetEl
    //         );
    //     });

    //     // Add footer with equation count
    //     const footer = container.createDiv();
    //     footer.addClass("em-citation-footer");
    //     footer.textContent = `${this.equationsMarkdown.length} equation${this.equationsMarkdown.length !== 1 ? 's' : ''} referenced`;
    // }

    // private addClickEffects(equationWrapper: HTMLElement): void {
    //     // Add click handler for equation selection
    //     equationWrapper.addEventListener('click', () => {
    //         // Remove active class from all equations
    //         const allEquations = equationWrapper.parentElement?.querySelectorAll('.em-equation-wrapper');
    //         allEquations?.forEach(eq => eq.removeClass('em-equation-active'));

    //         // Add active class to clicked equation
    //         equationWrapper.addClass('em-equation-active');
    //     });
    // }
}
