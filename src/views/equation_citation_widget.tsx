import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { HoverParent, WorkspaceLeaf, MarkdownView, editorInfoField } from "obsidian";
import { renderEquationCitation } from "@/views/citation_render";
import { CitationPopover } from "@/views/citation_popover";
import { splitFileCitation } from "@/utils/citation_utils";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { RenderedEquation } from "@/views/citation_popover";
import { EquationMatch } from "@/utils/equation_utils";

export class EquationCitationWidget extends WidgetType {
    private el: HTMLElement;
    // private fileSuprtScriptEl: HTMLElement [] = [];
    // private isMouseOverFileSuperscript = false; 
    private view: EditorView;
    private popover: CitationPopover | null = null;
    // second-level cache for equations  
    private equationCacheMap = new Map<string, {
        tagMap: Map<string, EquationMatch>,
        lastUpdated: number
    }>();

    constructor(
        private plugin: EquationCitator,
        private eqNumbersAll: string[],
        public range: { from: number; to: number }
    ) {
        super();
        this.plugin = plugin;

    }
    eq(other: EquationCitationWidget) {
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

    /**
     * Read footnotes and get equations without md content. 
     * @returns 
     */
    private async getEquations(): Promise<RenderedEquation[]> {
        const settings = this.plugin.settings;
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || "";  // get current file path  
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(sourcePath);
        const resolveCrossFileRef = (crossFile: string) => {
            const match = footnotes?.find(f => f.num === crossFile);
            if (!match?.path) return { path: null, filename: null };
            const file = this.plugin.app.metadataCache.getFirstLinkpathDest(match.path, sourcePath);
            if (!file) {
                Debugger.log("Invalid footnote file path: ", match.path);
                return { path: null, filename: null };
            }
            return { path: file.path, filename: match.label || null };
        };
        const equations: RenderedEquation[] = this.eqNumbersAll.map(tag => {
            const { local, crossFile } = settings.enableCrossFileCitation
                ? splitFileCitation(tag, settings.fileCiteDelimiter)
                : { local: tag, crossFile: null };

            const { path, filename } = crossFile
                ? resolveCrossFileRef(crossFile)
                : {
                    path: sourcePath,
                    filename: this.plugin.settings.renderLocalFileName ?
                        this.plugin.app.workspace.getActiveFile()?.name || null : null 
                };
            return {
                tag: local,
                md: "",
                sourcePath: path,
                filename: filename,
            };
        });
        const validEquations = equations.filter(eq => eq.sourcePath !== null);
        if (validEquations.length === 0) {
            Debugger.log("No valid equations found");
            return [];
        }
        return await this.fillEquationsContent(validEquations);
    }

    /**
     * Get md content of equations from file cache in batch 
     * @param equations 
     * @returns 
     */
    private async fillEquationsContent(equations: RenderedEquation[]): Promise<RenderedEquation[]> {
        // filter out duplicate file paths 
        const uniquePaths = [...new Set(equations.map(eq => eq.sourcePath))].filter(p => p !== null);
        const fileEquationsMap = new Map<string, EquationMatch[]>();
        for (const filePath of uniquePaths) {
            const eqs = await this.plugin.equationCache.getEquationsForFile(filePath);
            if (eqs) {
                fileEquationsMap.set(filePath, eqs);
            }
        }

        // fill content for each equation
        return equations.map(eq => {
            const fileEquations = eq.sourcePath ? fileEquationsMap.get(eq.sourcePath) : undefined;
            const matchedEquation = fileEquations?.find(cached => cached.tag === eq.tag);
            return {
                ...eq,
                md: matchedEquation?.raw || "", // 使用 raw 字段作为 md 内容
            };
        });
    }

    private getActiveLeaf(): WorkspaceLeaf | null {
        const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
        if (mdView && mdView.leaf) {
            return mdView.leaf;
        }
        return null;
    }

    private async showPopover() {
        if (this.popover !== null) return;  // already showing popover  
        const parent = this.getActiveLeaf() as HoverParent | null;
        if (!parent || !this.el) {
            Debugger.log(`parent is ${parent} and citationEl is ${this.el},` +
                `some of them not found for equation citation widget, can't show popover`);
            return;
        }
        const renderedEquations = await this.getEquations();

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
