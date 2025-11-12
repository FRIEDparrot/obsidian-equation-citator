import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { HoverParent, WorkspaceLeaf, MarkdownView, editorInfoField, Notice } from "obsidian";
import { FigureCitationPopover } from "@/views/popovers/figure_citation_popover";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { renderFigureCitation } from "@/views/widgets/figure_citation_render";

/**
 * Widget for rendering figure citations in Live Preview mode
 * Similar to CitationWidget but for figures
 */
export class FigureCitationWidget extends WidgetType {
    private el: HTMLElement;
    private view: EditorView;
    private popover: FigureCitationPopover | null = null;

    constructor(
        private plugin: EquationCitator,
        private sourcePath: string,
        private figureTagsAll: string[],
        public range: { from: number; to: number }
    ) {
        super();
    }

    eq(other: FigureCitationWidget) {
        return this.figureTagsAll === other.figureTagsAll &&
            this.range.from === other.range.from &&
            this.range.to === other.range.to;
    }

    toDOM(view: EditorView): HTMLElement {
        this.view = view;

        const parent = this.getActiveLeaf() as HoverParent | null;
        const el = renderFigureCitation(
            this.plugin,
            this.sourcePath,
            parent,
            this.figureTagsAll,
            false,  // need ctrl key to show popover in Live Preview mode
        );

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

        setTimeout(() => {
            this.registerCitationEvents().catch(console.error);
        }, 0); 
        return el;
    }

    /**
     * Register events for the figure citation
     * Render figures on hover with Ctrl key
     */
    private async registerCitationEvents() {
        if (this.el) {
            this.el.addEventListener('mouseenter', async (event) => {
                const ctrlKey = event.ctrlKey || event.metaKey;
                if (ctrlKey) {
                    await this.showPopover();
                }
            });
        }
    }

    private getActiveLeaf(): WorkspaceLeaf | null {
        const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
        if (mdView && mdView.leaf) {
            return mdView.leaf;
        }
        return null;
    }

    /**
     * Show popover with figure preview content
     */
    private async showPopover() {
        const parent = this.getActiveLeaf() as HoverParent | null;
        if (this.popover !== null) return;  // already showing popover
        if (!parent || !this.el) {
            Debugger.error(`parent is ${parent} and citationEl is ${this.el}, can't show popover`);
            return;
        }

        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || "";
        const renderedFigures = await this.plugin.figureServices.getFiguresByTags(this.figureTagsAll, sourcePath);

        if (renderedFigures.length === 0) {
            Debugger.log(`No valid figures found for citation: ${this.figureTagsAll.join(', ')}`);
            // Show a simple notice to the user instead of throwing an error
            new Notice(`Figure not found: fig:${this.figureTagsAll.join(', ')}`);
            return;
        }

        this.popover = new FigureCitationPopover(
            this.plugin,
            parent,
            this.el,
            renderedFigures,
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
