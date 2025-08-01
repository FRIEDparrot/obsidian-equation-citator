import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { Notice, HoverParent, WorkspaceLeaf, MarkdownView, editorInfoField } from "obsidian";
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
    private citationEl: HTMLElement[] = [] ;
    private fileSuprtScriptEl: HTMLElement [] = [];

    private view: EditorView;
    private settings: EquationCitatorSettings;
    public citeEquationTags: string[] = [];   // render citation itseld 
    private renderedTags: RenderedCitationTag[] = []; // for render popover
    private popover: CitationPopover | null = null;
    private isMouseOverCitation = false;
    private isMouseOverFileSuperscript = false;   
    
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
            this.el.addEventListener('mouseenter',() => {
                this.isMouseOverCitation = true;
            })
            this.el.addEventListener('mouseleave', () => {
                this.isMouseOverCitation = false;
            });
            document.addEventListener('keydown', async (event) => {
                if (this.isMouseOverCitation && (event.ctrlKey || event.metaKey) && this.popover === null) {
                    event.preventDefault();
                    event.stopPropagation();
                    await this.showCitationPopover();
                }
            });
        }
    }
    private registerFileSuperscriptEvents() {
        // to be implemented 
    }

    private async showCitationPopover(): Promise<void> {
        if (this.popover !== null) return;  // already showing popover  
        const renderedEquations = await this.getHoveredEquation();
        const parent = this.getActiveLeaf() as HoverParent | null;
        if (!parent || !this.el) {
            Debugger.log(`parent is ${parent} and citationEl is ${this.el},` + 
                `some of them not found for equation citation widget, can't show popover`);
            return;
        }
        this.popover = new CitationPopover(
            this.plugin.app,
            parent,
            this.el,
            this.citeEquationTags,
            renderedEquations,
            this.plugin.app.workspace.getActiveFile()?.path || "",
            300
        );
        this.popover.onClose = function () {
            this.popover = null;  // remove popover when closed 
        }.bind(this);
    }

    private getActiveLeaf(): WorkspaceLeaf | null {
        const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
        if (mdView && mdView.leaf) {
            return mdView.leaf;
        }
        return null;
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
