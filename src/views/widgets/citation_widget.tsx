import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { HoverParent, MarkdownView, editorInfoField } from "obsidian";
import { CitationPopover } from "@/views/popovers/citation_popover";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import {
    combineContinuousCitationTags,
    splitFileCitation,
} from "@/utils/core/citation_utils";
import { DISABLED_DELIMITER } from "@/utils/string_processing/string_utils";
import { FileSuperScriptPopover } from "@/views/popovers/file_superscript_popover";

/**
 * Widget for render citation in Live Preview mode. 
 */
export class CitationWidget extends WidgetType {
    private el: HTMLElement;
    private view: EditorView;
    private popover: CitationPopover | null = null;
    private parent: HoverParent | null = null;
    constructor(
        private plugin: EquationCitator,
        private sourcePath: string,
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

        const parent = this.getMarkdownView() as HoverParent | null;
        const el = renderEquationCitation(
            this.plugin,
            this.sourcePath,
            parent,
            this.eqNumbersAll,
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
        this.registerCitaionEvents();
        return el;
    }

    /**
     * reigster events for whole citation part.
     * render equations in once  
     */
    private registerCitaionEvents() {
        if (this.el) {
            this.el.addEventListener('mouseenter', (event) => {
                const ctrlKey = event.ctrlKey || event.metaKey;
                if (ctrlKey) {
                    void this.showPopover();
                }
            })
        }
    }
    private getMarkdownView(): MarkdownView | null {
        const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
        if (mdView) {
            return mdView;
        }
        return null;
    }

    /**
     * Show popover with equations preview content. 
     * @returns 
     */
    private async showPopover() {
        const parent = this.getMarkdownView() as HoverParent | null;
        if (this.popover !== null) return;  // already showing popover
        if (!parent || !this.el) {
            Debugger.error(
                `parent or citationEl is not found for equation citation widget, can't show popover`);
            return;
        }
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || "";
        const renderedEquations = await this.plugin.equationServices.getEquationsByTags(this.eqNumbersAll, sourcePath);
        if (renderedEquations.length === 0) {
            Debugger.error("No valid equations found for citation widget");
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


/**
 * Shared rendering function for both modes 
 *    input splitted equation tags, render combined equation citation by settings 
 * @param citeEquationTags 
 * @param settings 
 * @param isInteractive if it's true, show footnote without ctrl key 
 * @returns 
 */
export function renderEquationCitation(
    plugin: EquationCitator,
    sourcePath: string,
    parent: HoverParent | null,
    citeEquationTags: string[],
    isInteractive = false
): HTMLElement {
    const {
        enableContinuousCitation,
        enableCrossFileCitation,
        fileCiteDelimiter,
        continuousRangeSymbol,
        continuousDelimiters,
        citationFormat,
        multiCitationDelimiterRender,
    } = plugin.settings;
    const el = document.createElement('span');
    const fileDelimiter = enableCrossFileCitation ?
        fileCiteDelimiter || '^' :
        DISABLED_DELIMITER;
    // set render format for the equation
    const formatedCiteEquationTags = enableContinuousCitation ?
        combineContinuousCitationTags(
            citeEquationTags,
            continuousRangeSymbol,
            continuousDelimiters.split(' ').filter(d => d.trim()), // remove empty string
            fileDelimiter,
        )
        : citeEquationTags;

    // handle empty citation case 
    if (!formatedCiteEquationTags.length) {
        // empty equation tags
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container');
        const emptyCitationSpanEl = document.createElement('span');
        emptyCitationSpanEl.className = 'em-math-citation';
        emptyCitationSpanEl.textContent = citationFormat.replace('#', '');
        containerDiv.appendChild(emptyCitationSpanEl);
        el.appendChild(containerDiv);
        return el;
    }

    const containers: HTMLElement[] = [];
    // render equation parts
    for (const tag of formatedCiteEquationTags) {
        // replace # in render format with the tag number
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container');
        const { local, crossFile } = splitFileCitation(tag, fileDelimiter);
        const citationSpanEl = document.createElement('span');
        citationSpanEl.className = 'em-math-citation';
        if (crossFile) {
            // Create citation with superscript bracket for cross-file references
            const localCitation = citationFormat.replace('#', local);
            citationSpanEl.textContent = localCitation;
            containerDiv.appendChild(citationSpanEl);

            // Create superscript bracket
            const fileSuperEl = document.createElement('sup');
            fileSuperEl.textContent = `[${crossFile}]`;
            fileSuperEl.className = "em-math-citation-file-superscript";
            if (parent) {
                fileSuperEl.addEventListener('mouseenter', (e: MouseEvent) => {
                    const ctrlKey = e.ctrlKey || e.metaKey;
                    if (isInteractive || ctrlKey) {
                        e.preventDefault();
                        e.stopPropagation();  // prevent original popover from showing up  
                        e.stopImmediatePropagation();    // prevent other popovers from showing up 

                        new FileSuperScriptPopover(
                            plugin,
                            parent,
                            fileSuperEl,
                            sourcePath,
                            crossFile,
                            300
                        );
                    }
                });
            }
            containerDiv.appendChild(fileSuperEl);
        } else {
            // Regular citation without cross-file reference
            citationSpanEl.textContent = citationFormat.replace('#', local);
            containerDiv.appendChild(citationSpanEl);
        }
        containers.push(containerDiv);

        // add  multi-citation delimiter if needed 
        if (multiCitationDelimiterRender && formatedCiteEquationTags.length > 1 &&
            tag !== formatedCiteEquationTags[formatedCiteEquationTags.length - 1] // not last one
        ) {
            const multiDelimEl = document.createElement('span');
            multiDelimEl.className = 'em-math-citation-multi-delimiter';
            multiDelimEl.textContent = multiCitationDelimiterRender;
            containers.push(multiDelimEl);
        }
    }

    for (const container of containers) {
        el.appendChild(container);
    }
    return el
}
