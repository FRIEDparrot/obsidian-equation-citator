import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { HoverParent, WorkspaceLeaf, MarkdownView, editorInfoField, Notice } from "obsidian";
import { CalloutCitationPopover } from "@/views/popovers/callout_citation_popover";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { renderCalloutCitation } from "@/views/widgets/callout_citation_render";

/**
 * Widget for rendering callout citations in Live Preview mode
 * Similar to FigureCitationWidget but for callouts/quotes
 */
export class CalloutCitationWidget extends WidgetType {
    private el: HTMLElement;
    private view: EditorView;
    private popover: CalloutCitationPopover | null = null;

    constructor(
        private plugin: EquationCitator,
        private sourcePath: string,
        private prefix: string,  // e.g., "table:", "thm:", "def:"
        private calloutTagsAll: string[],  // e.g., ["1.1", "1.2"]
        public range: { from: number; to: number }
    ) {
        super();
    }

    eq(other: CalloutCitationWidget) {
        return this.prefix === other.prefix &&
            this.calloutTagsAll === other.calloutTagsAll &&
            this.range.from === other.range.from &&
            this.range.to === other.range.to;
    }

    toDOM(view: EditorView): HTMLElement {
        this.view = view;

        const parent = this.getActiveLeaf() as HoverParent | null;
        const el = renderCalloutCitation(
            this.plugin,
            this.sourcePath,
            parent,
            this.prefix,
            this.calloutTagsAll,
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

        this.registerCitationEvents();
        return el;
    }

    /**
     * Register events for the callout citation
     * Render callouts on hover with Ctrl key
     */
    private registerCitationEvents() {
        if (this.el) {
            this.el.addEventListener('mouseenter', (event) => {
                (async ()=> {const ctrlKey = event.ctrlKey || event.metaKey;
                if (ctrlKey) {
                    await this.showPopover();
                }})();
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
     * Show popover with callout preview content
     */
    private async showPopover() {
        const parent = this.getActiveLeaf() as HoverParent | null;
        if (this.popover !== null) return;  // already showing popover
        if (!parent || !this.el) {
            Debugger.error(`parent is ${parent} and citationEl is ${this.el}, can't show popover`);
            return;
        }

        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || "";
        const renderedCallouts = await this.plugin.calloutServices.getCalloutsByTags(
            this.calloutTagsAll,
            this.prefix,
            sourcePath
        );

        if (renderedCallouts.length === 0) {
            Debugger.log(`No valid callouts found for citation: ${this.calloutTagsAll.join(', ')}`);
            // Show a simple notice to the user instead of throwing an error
            new Notice(`Citation not found: ${this.prefix}${this.calloutTagsAll.join(', ')}`);
            return;
        }

        this.popover = new CalloutCitationPopover(
            this.plugin,
            parent,
            this.el,
            this.prefix,
            renderedCallouts,
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
