import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { Notice, HoverParent, WorkspaceLeaf, MarkdownView, editorInfoField, HoverPopover } from "obsidian";
import { renderEquationCitation } from "@/views/citation_render";
import { EquationCitatorSettings } from "@/settings/settingsTab";
import { CitationPopover } from "@/views/citation_popover";
import { splitFileCitation } from "@/utils/citation_utils";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";


export interface RenderedCitationTag {
    local: string;
    crossFile: string | null;
}

export class EquationCitationWidget extends WidgetType {
    private plugin: EquationCitator;
    private el: HTMLElement;
    private view: EditorView;
    private settings: EquationCitatorSettings;
    public citeEquationTags: string[] = [];   // render citation itseld 
    private renderedTags: RenderedCitationTag[] = []; // for render popover
    private popover: CitationPopover | null = null;
    private isMouseOver = false;

    constructor(
        plugin: EquationCitator,
        citeEquationTags: string[],
        public range: { from: number; to: number }
    ) {
        super();
        this.plugin = plugin;
        this.settings = plugin.settings;
        this.citeEquationTags = citeEquationTags.map(t => t.trim());
        this.renderedTags = citeEquationTags.map(
            (tag) => this.settings.enableCrossFileCitation ?
                splitFileCitation(tag.trim(), this.settings.fileCiteDelimiter) :
                { local: tag.trim(), crossFile: null }
        );
    }
    eq(other: EquationCitationWidget) {
        return this.renderedTags === other.renderedTags &&
            this.range.from === other.range.from &&
            this.range.to === other.range.to;
    }
    // view is the editor view to create the widget in  
    toDOM(view: EditorView): HTMLElement {
        this.view = view;
        const el = renderEquationCitation(this.citeEquationTags, this.settings, true);
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
        // Show popover when hover with ctrl key pressed
        el.addEventListener('mouseenter', async (event) => {
            this.isMouseOver = true;
            event.preventDefault();
            event.stopPropagation();
            const ctrlKey = event.ctrlKey || event.metaKey;
            if (ctrlKey && this.popover === null) {
                await this.showCitationPopover();
            }
        })
        el.addEventListener('mouseleave', () => {
            this.isMouseOver = false;
        });
        document.addEventListener('keydown', async (event) => {
            if (this.isMouseOver && ( event.ctrlKey || event.metaKey) && this.popover === null){
                event.preventDefault();
                event.stopPropagation();
                await this.showCitationPopover();
            }
        });
        this.el = el;
        return el;
    }
    private async showCitationPopover() : Promise<void> {
        if (this.popover !== null) return;  // already showing popover  
        const renderedEquations = await this.getHoveredEquation();
        const parent = this.getActiveLeaf() as HoverParent | null;
        if (!parent) {
            Debugger.error("Failed to get active leaf for equation citation widget. -> in toDOM");
            return; 
        }
        this.popover = new CitationPopover(
            this.plugin.app, 
            parent,
            this.el,
            renderedEquations,
            this.plugin.app.workspace.getActiveFile()?.path || "",
            300
        );
        this.popover.onClose = function(){
            this.popover = null;  // remove popover when closed 
        }.bind(this);
    }

    private getActiveLeaf(): WorkspaceLeaf | null {
        const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
        if (mdView && mdView.leaf) {
            return mdView.leaf;
        }
        return this.plugin.app.workspace.getMostRecentLeaf(); // fallback to most recent leaf  
    }

    private async getHoveredEquation(): Promise<string[]> {
        // NOW : only show preview of equations in current file, not cross-file references 
        try {
            const sourcePath = this.plugin.app.workspace.activeEditor?.file?.path;
            if (!sourcePath) return [];

            const equationsAll = await this.plugin.equationCache.getEquationsForFile(sourcePath);
            if (!equationsAll) return [];

            const equationsMarkdown = this.renderedTags
                .filter(tag => tag.crossFile === null)  // only show local references
                .map(tag => {
                    const match = equationsAll.find(eq => eq.tag === tag.local);
                    return match?.raw;
                })
                .filter((raw): raw is string => !!raw);  // filter out null or undefined 
            if (equationsMarkdown.length === 0) return [];

            return equationsMarkdown;
        }
        catch (error) {
            new Notice("Failed to load equation data from cache.");
            Debugger.error("Error in showEquationPopover:", error)
        }
        return [];
    }



    ignoreEvent() {
        return false;
    }
}
