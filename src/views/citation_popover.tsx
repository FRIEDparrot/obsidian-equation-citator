import { Notice,  WorkspaceLeaf } from "obsidian";
import EquationCitator from "@/main";
import {
    MarkdownRenderer,
    Component,
    HoverPopover,
    HoverParent,
    TFile,
    MarkdownView,
    EditorRange,
} from "obsidian";
import Debugger from "@/debug/debugger";

export class TargetElComponent extends Component {
    constructor(public targetEl: HTMLElement | null) {
        super();
    }
}

import { RenderedEquation } from "@/services/equation_services";
import { EquationMatch, parseFirstEquationInMarkdown } from "@/utils/parsers/equation_parser";
import { getLeafByElement } from "@/utils/workspace/workspace_utils";
import { openFileAndScrollToEquation } from "@/utils/workspace/equation_navigation";

/**
 * Citaton Popover Class, render the equations in the popover 
 */
export class CitationPopover extends HoverPopover {
    tags: string[] = []; // list of tags to be cited
    private equationsToRender: RenderedEquation[] = [];
    constructor(
        private plugin: EquationCitator,
        parent: HoverParent,
        private targetEl: HTMLElement | null,
        equationsToRender: RenderedEquation[],
        private sourcePath: string,
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime, null);
        // only render valid equations 
        this.equationsToRender = equationsToRender.filter(eq => eq.tag && eq.md && eq.sourcePath);
    }
    public onOpen() { }
    public onClose() { }

    async onload(): Promise<void> {
        this.onOpen();
        this.showEquations();
        this.adjustPosition();
    }
    async onunload(): Promise<void> {
        this.onClose();
    }

    /**
    * Warning: Never use show() method. It will overwrite original method
    * and cause unexpected render issues.
    */
    showEquations() {
        if (!this.targetEl) {
            Debugger.log("can't find targetEl of citation popover");
            return;  
        }
        const container: HTMLElement = this.hoverEl.createDiv();
        const targetComponent = new TargetElComponent(this.targetEl);
        container.addClass("em-citation-popover-container");

        // Create header
        const header = container.createDiv();
        header.addClass("em-citation-header");

        header.createEl("h3", { text: "Referenced Equations", cls: "em-citation-title" });
        const footerSpan = header.createEl("div", {
            cls: "em-citation-title-note",
        });

        footerSpan.createDiv(); // placeholder  
        footerSpan.createDiv({
            text: "shift + scroll to scroll horizontally",
            cls: "em-citation-title-note-text",
        })
        // Create content wrapper
        const content = container.createDiv();
        content.addClass("em-citation-content");

        // Create scrollable equations container
        const equationsContainer = content.createDiv();
        equationsContainer.addClass("em-equations-container");
        
        // Loop and create div for each equation 
        const leaf = getLeafByElement(this.plugin.app, this.targetEl);
        if (!leaf) return ;
        this.equationsToRender.forEach((eq, index) => {
            const equationOptionContainer = equationsContainer.createDiv();
            equationOptionContainer.addClass("em-equation-option-container");
            renderEquationWrapper(this.plugin, leaf, this.sourcePath, eq, equationOptionContainer, targetComponent, true);
        });
        
        // Add footer with equation count
        const footer = container.createDiv();
        const totalEquations = this.equationsToRender.length;
        footer.addClass("em-citation-footer");
        footer.textContent = `${totalEquations} equation${totalEquations !== 1 ? 's' : ''}`;
    }

    /**
     * Dynamically adjust the position of the popover to avoid it going outside the viewport.
     * @returns 
     */
    private adjustPosition() {
        const popoverRect = this.hoverEl.getBoundingClientRect();
        const targetRect = this.targetEl?.getBoundingClientRect();
        if (!targetRect) {
            return;
        }
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = targetRect.right;
        let top = targetRect.bottom;

        if (left + popoverRect.width > viewportWidth) {
            left = targetRect.left - popoverRect.width;
            // when the popover is ouside the viewport, move it to the left  
            if (left < 0) {
                left = Math.max(10, targetRect.left - popoverRect.width);
            }
        }
        if (top + popoverRect.height > viewportHeight) {
            // when the popover is ouside the viewport, move it to the top
            top = targetRect.top - popoverRect.height;
            if (top < 0) {
                top = Math.max(10, targetRect.top - popoverRect.height);
            }
        }
        /* 
         * Skip these two line in "avoid assigning styles via JavaScript"
         * since pure css can't handle the dynamic positioning of the popover easily. 
         */
        this.hoverEl.style.left = `${left}px`;
        this.hoverEl.style.top = `${top}px`;
    }
}

/**
 * Render the equation container (shared function by reading and live preview mode)
 * @param plugin 
 * @param sourcePath 
 * @param eq 
 * @param container 
 * @param targetComponent 
 */
export function renderEquationWrapper(
    plugin: EquationCitator,
    leaf: WorkspaceLeaf,
    sourcePath: string,
    eq: RenderedEquation,
    container: HTMLElement,
    targetComponent: Component,
    addLinkJump = false
): void {
    if (!container) {
        Debugger.log("can't find container for equation");
        return;
    }
    const equationWrapper = container.createDiv();
    equationWrapper.addClass("em-equation-wrapper");
    // equationWrapper.setAttribute("data-equation-index", index.toString()); 

    const equationLabelContainer = equationWrapper.createDiv();
    equationLabelContainer.addClass("em-equation-label-container");

    // Create equation number/label
    const equationLabel = equationLabelContainer.createDiv();
    equationLabel.addClass("em-equation-label", "em-equation-number");
    equationLabel.textContent = `EQ ${eq.tag || ''}`;

    // Create equation filename label
    const fileNameLabel = equationLabelContainer.createDiv();
    fileNameLabel.addClass("em-equation-label", "em-equation-markdown-filename");
    fileNameLabel.textContent = `${eq.filename || ""}`;
    
    // Create equation content div
    const equationDiv = equationWrapper.createDiv();
    equationDiv.addClass("em-equation-content");

    // Render the markdown equation
    MarkdownRenderer.render(
        plugin.app,
        eq.md,
        equationDiv,
        sourcePath,
        targetComponent
    );
    // Add click effects to each equation
    addClickEffects(equationWrapper);
    if (addLinkJump) {
        addClickLinkJump(plugin, equationWrapper, eq, leaf);
    }
}


function addClickEffects(equationWrapper: HTMLElement): void {
    // Add click handler for equation selection
    equationWrapper.addEventListener('click', () => {
        // Remove active class from all equations
        const allEquations = equationWrapper.parentElement?.querySelectorAll('.em-equation-wrapper');
        allEquations?.forEach(eq => eq.removeClass('em-equation-active'));
        // Add active class to clicked equation
        equationWrapper.addClass('em-equation-active');
    });
}

function addClickLinkJump(
    plugin: EquationCitator,
    equationWrapper: HTMLElement,
    eq: RenderedEquation,
    leaf: WorkspaceLeaf,
): void {
    // double-click to jump to the equation file
    equationWrapper.addEventListener('dblclick', async (event) => {
        if (!eq.sourcePath || !eq.tag) {
            return;   // no valid equation file or tag
        }
        const view = leaf.view;
        if (!(view instanceof MarkdownView)) return;
        const isReadingMode = view.getMode() === "preview";
        if (isReadingMode) {
            new Notice("Link jump is not supported in reading mode. Use Live Preview instead.");
            return;
        }
        const ctrlKey = (event.ctrlKey || event.metaKey);
        await openFileAndScrollToEquation(
            plugin,
            eq.sourcePath,
            eq.tag,
            ctrlKey,  // open in split if ctrl key is pressed
            view.leaf  // current leaf: used for opening when not splitting, or excluded when splitting
        );
    });
}
