import EquationCitator from "@/main";
import {
    loadMathJax, 
    Notice, 
    WorkspaceLeaf,
    Component,
    HoverPopover,
    HoverParent,
    MarkdownView,
} from "obsidian";
import Debugger from "@/debug/debugger";

export class TargetElComponent extends Component {
    constructor(public targetEl: HTMLElement | null) {
        super();
    }
}

import { RenderedEquation } from "@/services/equation_services";
import { getLeafByElement } from "@/utils/workspace/workspace_utils";
import { openFileAndScrollToEquation } from "@/utils/workspace/equation_navigation";
import { parseEquationTag } from "@/utils/parsers/equation_parser";
import { WidgetSizeManager } from "@/settings/styleManagers/widgetSizeManager";
import { forceMathRefresh } from "@/utils/misc/mathjax_utils";

/**
 * Citaton Popover Class, render the equations in the popover 
 */
export class CitationPopover extends HoverPopover {
    tags: string[] = []; // list of tags to be cited
    private readonly equationsToRender: RenderedEquation[] = [];
    private readonly targetEl: HTMLElement;
    private readonly targetComponent: TargetElComponent;
    
    constructor(
        private readonly plugin: EquationCitator,
        parent: HoverParent,
        targetEl: HTMLElement,
        equationsToRender: RenderedEquation[],
        private readonly sourcePath: string,
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime);
        this.targetEl = targetEl;
        // only render valid equations 
        this.equationsToRender = equationsToRender.filter(eq => eq.tag && eq.md && eq.sourcePath);
        // Create targetComponent once to avoid memory leaks
        this.targetComponent = new TargetElComponent(this.targetEl);
    }
    public onOpen() { }
    public onClose() { }
    
    onload(): void {
        this.onOpen();
        this.showEquations();
    }
    onunload(): void {
        this.targetComponent.unload();
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
        container.addClass("em-citation-popover-container", WidgetSizeManager.getCurrentClassName());

        // Create header
        const header = container.createDiv();
        header.addClass("em-citation-header");

        header.createEl("h3", { text: "Referenced equations", cls: "em-citation-title" });
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
        if (!leaf) return;
        this.equationsToRender.forEach((eq, index) => {
            const equationOptionContainer = equationsContainer.createDiv();
            equationOptionContainer.addClass("em-equation-option-container");
            void renderEquationWrapper(this.plugin, leaf, eq, equationOptionContainer, this.targetComponent, true);
        });

        // Add footer with equation count
        const footer = container.createDiv();
        const totalEquations = this.equationsToRender.length;
        footer.addClass("em-citation-footer");
        footer.textContent = `${totalEquations} equation${totalEquations === 1 ? '' : 's'}`;
    }
}

/**
 * Render the equation container (shared function by reading and live preview mode)
 * @param plugin 
 * @param leaf 
 * @param eq 
 * @param container 
 * @param targetComponent 
 * @param addLinkJump 
 */
export async function renderEquationWrapper(
    plugin: EquationCitator,
    leaf: WorkspaceLeaf,
    eq: RenderedEquation,
    container: HTMLElement,
    targetComponent: Component,
    addLinkJump = false
): Promise<void> {
    if (!container) {
        Debugger.log("can't find container for equation");
        return;
    }
    const equationWrapper = container.createDiv();
    equationWrapper.addClass("em-equation-wrapper");
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

    // Render the equation
    if (!window.MathJax) await loadMathJax();
    const eqTag = parseEquationTag(eq.md);
    equationDiv.replaceChildren(window.MathJax!.tex2chtml(eqTag.content, { display: true }));
    await forceMathRefresh(equationDiv);
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
    equationWrapper.addEventListener('dblclick', (event) => {
        if (!eq.sourcePath || !eq.tag) {
            return;   // no valid equation file or tag
        }
        const view = leaf.view;
        if (!(view instanceof MarkdownView)) return;
        const isReadingMode = view.getMode() === "preview";
        if (isReadingMode) {
            new Notice("Link jump is not supported in reading mode. Use live preview instead.");
            return;
        }
        const ctrlKey = (event.ctrlKey || event.metaKey);
        openFileAndScrollToEquation(
            plugin,
            eq.sourcePath,
            eq.tag,
            ctrlKey,  // open in split if ctrl key is pressed
            view.leaf  // current leaf: used for opening when not splitting, or excluded when splitting
        ).then().catch((error) => { Debugger.error("Error opening file:", error); });
    });
}
