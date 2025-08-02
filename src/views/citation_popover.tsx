import EquationCitator from "@/main";
import { MarkdownRenderer, Component } from "obsidian";
import {
    HoverPopover,
    HoverParent,
} from "obsidian";

export interface RenderedEquation {
    tag: string;
    md: string;  // markdown equation content 
    sourcePath: string | null; // source path of the equation file (if no valid footnote, its null) 
    filename: string | null;  // filename label (alias) of the equation 
}

class TargetElComponent extends Component {
    constructor(public targetEl: HTMLElement | null) {
        super();
    }
}

/**
 * Citaton Popover Class, render the equations in the popover 
 */
export class CitationPopover extends HoverPopover {
    tags: string[] = []; // list of tags to be cited
    constructor(
        private plugin: EquationCitator,
        parent: HoverParent,
        private targetEl: HTMLElement | null,
        private equationsToRender: RenderedEquation[],
        private sourcePath: string,
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime, null);
    }
    public onOpen() {}
    public onClose() {}

    async onload(): Promise<void> {
        this.onOpen();
        this.showEquations();
    }
    async onunload(): Promise<void> {
        this.onClose();
    }

    /**
    * Warning: Never use show() method. It will overwrite original method
    * and cause unexpected render issues.
    */
    showEquations() {
        const container: HTMLElement = this.hoverEl.createDiv();
        const targetComponent = new TargetElComponent(this.targetEl);

        container.addClass("em-citation-popover-container");

        // Create header
        const header = container.createDiv();
        header.addClass("em-citation-header");
        header.createEl("h3", { text: "Referenced Equations", cls: "em-citation-title" });

        // Create content wrapper
        const content = container.createDiv();
        content.addClass("em-citation-content");

        // Create scrollable equations container
        const equationsContainer = content.createDiv();
        equationsContainer.addClass("em-equations-container");

        // Loop and create div for each equation
        this.equationsToRender.forEach((eq, index) => {
            const equationWrapper = equationsContainer.createDiv();
            equationWrapper.addClass("em-equation-wrapper");
            equationWrapper.setAttribute("data-equation-index", index.toString());

            const equationLabelContainer = equationWrapper.createDiv(); 
            equationLabelContainer.addClass("em-equation-label-container");
            
            // Create equation number/label
            const equationLabel = equationLabelContainer.createDiv();
            equationLabel.addClass("em-equation-label", "em-equation-number");
            equationLabel.textContent = `EQ ${eq.tag || index+1}`;
            
            // Create equation filename label
            const fileNameLabel = equationLabelContainer.createDiv();
            fileNameLabel.addClass("em-equation-label", "em-equation-markdown-filename");
            fileNameLabel.textContent = `${eq.filename || ""}`;
            
            // Create equation content div
            const equationDiv = equationWrapper.createDiv();
            equationDiv.addClass("em-equation-content");

            // Render the markdown equation
            MarkdownRenderer.render(
                this.plugin.app,
                eq.md,
                equationDiv,
                this.sourcePath,
                targetComponent,
            );
            // Add click effects to each equation
            this.addClickEffects(equationWrapper);
        });

        // Add footer with equation count
        const footer = container.createDiv();
        const totalEquations = this.equationsToRender.length;
        footer.addClass("em-citation-footer");
        footer.textContent = `${totalEquations} equation${totalEquations !== 1 ? 's' : ''}`;
    }

    private addClickEffects(equationWrapper: HTMLElement): void {
        // Add click handler for equation selection
        equationWrapper.addEventListener('click', () => {
            // Remove active class from all equations
            const allEquations = equationWrapper.parentElement?.querySelectorAll('.em-equation-wrapper');
            allEquations?.forEach(eq => eq.removeClass('em-equation-active'));

            // Add active class to clicked equation
            equationWrapper.addClass('em-equation-active');
        });
    }
}
