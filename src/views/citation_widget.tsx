import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { HoverParent, WorkspaceLeaf, MarkdownView, editorInfoField } from "obsidian";
import { renderEquationCitation } from "@/views/citation_render";
import { CitationPopover } from "@/views/citation_popover";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";

/**
 * Widget for render citation in Live Preview mode. 
 */
export class CitationWidget extends WidgetType {
    private el: HTMLElement;
    // private fileSuprtScriptEl: HTMLElement [] = [];
    // private isMouseOverFileSuperscript = false;
    private view: EditorView;
    private popover: CitationPopover | null = null;
    constructor(
        private plugin: EquationCitator,
        private eqNumbersAll: string[],
        public range: { from: number; to: number }
    ) {
        super();
        this.plugin = plugin;
    }
    eq(other: CitationWidget) {
        return this.eqNumbersAll === other.eqNumbersAll &&
            this.range.from === other.range.from &&
            this.range.to === other.range.to;
    }
    // view is the editor view to create the widget in  
    toDOM(view: EditorView): HTMLElement {
        this.view = view;
        const el = renderEquationCitation(this.eqNumbersAll, this.plugin.settings, true);
        this.el = el;
        el.setAttribute('tabindex', '0');  // make it focusable
        // Add interactive behavior for Live Preview mode
        el.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const setSelectionRange = (view: EditorView, from: number, to: number) => {
                view.dispatch({
                    selection: EditorSelection.range(from, to)
                });
            };
            view.focus();
            setSelectionRange(view, this.range.from, this.range.to);
        });
        this.registerCitaionEvents();
        // this.registerFileSuperscriptEvents();
        return el;
    }

    /**
     * reigster events for whole citation part.
     * render equations in once  
     */
    private async registerCitaionEvents() {
        if (this.el) {
            this.el.addEventListener('mouseenter', async (event) => {
                const ctrlKey = event.ctrlKey || event.metaKey;
                if (ctrlKey) {
                    await this.showPopover();
                }
            })
        }
    }
    // superscript preview (in development)
    // private registerFileSuperscriptEvents() {
    // }
    private getActiveLeaf(): WorkspaceLeaf | null {
        const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
        if (mdView && mdView.leaf) {
            return mdView.leaf;
        }
        return null;
    }

    /**
     * Show popover with equations preview content. 
     * @returns 
     */
    private async showPopover() {
        if (this.popover !== null) return;  // already showing popover  
        const parent = this.getActiveLeaf() as HoverParent | null;
        if (!parent || !this.el) {
            Debugger.log(`parent is ${parent} and citationEl is ${this.el},` +
                `some of them not found for equation citation widget, can't show popover`);
            return;
        }
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || "";
        const renderedEquations = await this.plugin.equationServices.getEquationsByTags(this.eqNumbersAll, sourcePath);
        if (renderedEquations.length === 0) {
            Debugger.log("No valid equations found for citation widget");
            return;
        }
        this.popover = new CitationPopover(
            this.plugin,
            parent,
            this.el,
            renderedEquations,
            this.plugin.app.workspace.getActiveFile()?.path || "",
            300
        );
        this.popover.onClose = function () {
            this.popover = null;  // remove popover when closed 
        }.bind(this);
    }

    ignoreEvent() {
        return false;
    }
}
