import { Prec, RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { MarkdownPostProcessorContext, Notice, WorkspaceLeaf } from "obsidian";
import Debugger from "@/debug/debugger";
import { EquationCitatorSettings } from "@/settings/settingsTab";
import { escapeRegExp } from "@/utils/string_utils";
import { editorInfoField, MarkdownView } from "obsidian";
import {
    CitationRef,
    combineContinuousCitationTags,
    splitFileCitation,
    replaceCitationsInMarkdownWithSpan,
    SpanStyles,
    splitContinuousCitationTags
} from "@/utils/citation_utils";
import { CitationCache } from "@/cache/citationCache";
import { DISABLED_DELIMITER } from "@/utils/string_utils";
import { CitationWidget } from "@/views/citation_widget";
import EquationCitator from "@/main";
import { CitationPopover } from "@/views/citation_popover";

//////////////////////////////////////// LIVE PREVIEW EXTENSION ////////////////////// 

export class EquationCitation {
    tagContent: string;
    fileCitation: string | null;
    constructor(
        tagContent: string,
        fileCitation: string | null
    ) {
        this.tagContent = tagContent.trim();
        this.fileCitation = fileCitation?.trim() || null;
    }
}

/**
 * Shared rendering function for both modes 
 *    input splitted equation tags, render combined equation citation by settings 
 * @param citeEquationTags 
 * @param settings 
 * @param isInteractive 
 * @returns 
 */
export function renderEquationCitation(
    citeEquationTags: string[],
    settings: EquationCitatorSettings,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    isInteractive: boolean = false,
): HTMLElement {
    const el = document.createElement('span');
    const fileCiteDelimiter = settings.enableCrossFileCitation ?
        settings.fileCiteDelimiter || '^' :
        DISABLED_DELIMITER;
    // set render format for the equation
    const formatedCiteEquationTags = settings.enableContinuousCitation ?
        combineContinuousCitationTags(
            citeEquationTags,
            settings.continuousRangeSymbol || '~',
            settings.continuousDelimiters.split(' ').filter(d => d.trim()),
            fileCiteDelimiter
        )
        : citeEquationTags;

    const containers: HTMLElement[] = [];

    // render equation parts
    for (const tag of formatedCiteEquationTags) {
        // replace # in render format with the tag number
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container')

        const { local, crossFile } = splitFileCitation(tag, fileCiteDelimiter);
        const citationSpanEl = document.createElement('span');
        citationSpanEl.className = 'em-math-citation';

        if (crossFile) {
            // Create citation with superscript bracket for cross-file references
            const localCitation = settings.citationFormat.replace('#', local);
            citationSpanEl.textContent = localCitation;
            containerDiv.appendChild(citationSpanEl);

            // Create superscript bracket
            const fileSuperEl = document.createElement('sup');
            fileSuperEl.textContent = `[${crossFile}]`;
            fileSuperEl.className = "em-math-citation-file-superscript";
            containerDiv.appendChild(fileSuperEl);
        } else {
            // Regular citation without cross-file reference
            citationSpanEl.textContent = settings.citationFormat.replace('#', local);
            containerDiv.appendChild(citationSpanEl);
        }
        containers.push(containerDiv);
    }

    for (const container of containers) {
        el.appendChild(container);
    }
    return el;
}

export interface EditorSelectionInfo {
    range: { from: number, to: number } | null;
    tagSelected: boolean;
    tagContent: string | null;
}

/**
 * The stateFiled to share the selection information of the editor 
 */
export const tagSelectedField = StateField.define<EditorSelectionInfo>({
    create() {
        return { range: null, tagSelected: false, tagContent: null };
    },
    update(value, tr) {
        const state = tr.state;
        const sel = tr.state.selection.main;
        const selectedText = tr.state.sliceDoc(sel.from, sel.to).trim();
        const tagPattern = /^\\tag\{([^}]*)\}$/;
        const tagContent = selectedText.match(tagPattern)?.[1] || null;
        
        let tagSelected = false; 
        if (tagPattern.test(selectedText)) {
            const tree = syntaxTree(state);
            let currentMathBlockRange: { from: number; to: number } | null = null; 
            tree.iterate({
                enter: (node) => {
                    const t = node.type.name;
                    // in math block, add the tag rename option  
                    if (t.includes("math-block")) {
                        if (t.includes("math-begin")) {
                            currentMathBlockRange = { from: node.from, to: -1 };
                        }
                    }
                    else if (currentMathBlockRange && t.includes("math-end")) {
                        if (!currentMathBlockRange) {
                            Debugger.error("Math block end without begin");
                            return;
                        }
                        currentMathBlockRange.to = node.to;
                        if (sel.from > currentMathBlockRange.from && sel.to < currentMathBlockRange.to) {
                            tagSelected = true;
                            return;  // stop searching 
                        }
                        currentMathBlockRange = null;
                    }
                }
            })

            return {
                tagSelected: tagSelected,  
                tagContent: tagContent,
                range: { from: sel.from, to: sel.to },
            };
        }
        
        return {
            tagSelected: false,
            tagContent: null,
            range: { from: sel.from, to: sel.to },
        };
    },
});

/**
 * Live Preview Extension (CodeMirror ViewPlugin) for render equation in editor   
 * @param settings 
 * @returns 
 */
export function createMathCitationExtension(plugin: EquationCitator) {
    const settings: EquationCitatorSettings = plugin.settings;
    return Prec.high([
        tagSelectedField,
        ViewPlugin.fromClass(class {
            decorations: DecorationSet;
            citePattern: RegExp;
            lastPrefix: string;
            lastUpdate = 0;
            pendingUpdate = false;
            lastCursorPos = -1;
            currentAutoCompleteInput: string | null = null;  // cache current to detect auto-complete input change 

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
                this.citePattern = new RegExp(
                    `\\\\ref\\{${escapeRegExp(settings.citationPrefix)}([^}]+)\\}`,
                    "g"
                );
                this.lastPrefix = settings.citationPrefix;
            }
            update(update: ViewUpdate) {
                const cursorPos = update.view.state.selection.main.to;
                if (update.docChanged ||
                    update.viewportChanged ||
                    update.focusChanged ||
                    update.selectionSet ||
                    this.lastCursorPos !== cursorPos) {

                    this.lastCursorPos = cursorPos;
                    this.decorations = this.buildDecorations(update.view);

                    if (this.lastPrefix !== settings.citationPrefix) {
                        this.lastPrefix = settings.citationPrefix;
                        this.citePattern = new RegExp(
                            `\\\\ref\\{${escapeRegExp(settings.citationPrefix)}([^}]+)\\}`,
                            "g"
                        );
                    }
                    return;
                }
            } 
                        
            private buildDecorations(view: EditorView): DecorationSet {
                const builder = new RangeSetBuilder<Decoration>();
                const { state } = view;

                let currentEqRange: { from: number; to: number } | null = null;
                const cursorPos = state.selection.main.to;
                const sel = state.selection.main;
                const sourceMode = isSourceMode(view);

                syntaxTree(state).iterate({
                    enter: (node) => {
                        const t = node.type.name;
                        if (t.includes("math-begin") && !t.includes("math-block")) {
                            currentEqRange = { from: node.from, to: -1 };
                        } else if (currentEqRange && currentEqRange.to === -1 && t.includes("math-end") && !t.includes("math-block")) {
                            currentEqRange.to = node.to;
                            const inCursor = cursorPos >= currentEqRange.from && cursorPos <= currentEqRange.to;
                            const inSelection = sel.from < currentEqRange.to && sel.to > currentEqRange.from;
                            const text = state.sliceDoc(currentEqRange.from, currentEqRange.to);
                            const matches = [...text.matchAll(this.citePattern)];
                            const matches_ref = [...text.matchAll(/\\ref\{([^}]*)\}/g)];
                            const hasEquationCitation = (matches.length === 1 && matches_ref.length === 1);
                            const modeRender = !sourceMode || (sourceMode && settings.enableCitationInSourceMode);
                            if (!hasEquationCitation || !modeRender) return;
                            if (!inSelection && !inCursor) {
                                // citations not in cursor,  render full citations 
                                const eqNumbers: string[] = matches[0][1].split(settings.multiCitationDelimiter || ',');
                                const eqNumbersAll = settings.enableContinuousCitation ?
                                    splitContinuousCitationTags(
                                        eqNumbers,
                                        settings.continuousRangeSymbol || '~',
                                        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                                        settings.fileCiteDelimiter
                                    ) : eqNumbers; // split continuous citation tags if enabled 
                                builder.add(
                                    currentEqRange.from,
                                    currentEqRange.to,
                                    Decoration.replace({
                                        widget: new CitationWidget(plugin, eqNumbersAll, currentEqRange)
                                    })
                                );
                            }
                            currentEqRange = null;
                        }
                    }
                });
                return builder.finish();
            }
        }, {
            decorations: v => v.decorations
        })
    ]);
}

/////////////////////////////// Reading Mode Post-Processor ///////////////////////// 

export function renderFailedCitation(citeTag: string): HTMLElement {
    const el = document.createElement('span');
    el.textContent = "ref{" + citeTag + "}";
    el.className = "em-math-citation-failed";
    return el;
}

/**
 * Reading Mode Post-Processor 
 * @abstract For design purpose, the cite will rendered once it has \ref{...} format,
 *       This will not render other part, for $txt1\ref{eq:1.1}txt2$, 
 *       it will only render the ref{eq:1.1} part. 
 * @param el 
 * @param ctx 
 * @param citationCache citation cache instance of the plugin, to get citation data from cache
 * @param settings 
 * @returns 
 */
export async function mathCitationPostProcessor(
    plugin: EquationCitator,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    citationCache: CitationCache,
): Promise<void> {
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;

    const allCitations: CitationRef[] | undefined = await citationCache.getCitationsForFile(ctx.sourcePath)
    if (!allCitations) return; // no citations found for this file

    // find citation spans in the section  
    const mathSpans = el.querySelectorAll("span.math.math-inline.is-loaded");
    if (mathSpans.length === 0) return;
    const citeSpans = Array.from(mathSpans).filter(span => {
        // mark span that render failed (???) as citation span  
        const anchorTags = span.querySelectorAll('a');  // find a from span 
        if (anchorTags.length !== 1) return false;
        // check if it is rendered as ???  
        return Array.from(anchorTags).some(a => {
            const questionMarks = a.querySelectorAll('mjx-mtext mjx-c.mjx-c3F');
            return questionMarks.length === 3;
        })
    });

    if (citeSpans.length === 0) return;   // no citation span found

    // all equation citations in the blcok 
    const equations = allCitations.filter(eq =>
        eq.line >= sectionInfo.lineStart && eq.line <= sectionInfo.lineEnd
    )
    if (citeSpans.length === equations.length) {
        // render equation citation for each math span
        Debugger.log(`Render ${equations.length} equation citations from line ${sectionInfo.lineStart} to ${sectionInfo.lineEnd}`)

        const fullCitationPattern = `\\\\ref\\{${escapeRegExp(plugin.settings.citationPrefix)}([^}]+)\\}`;
        citeSpans.forEach((span, index) => {
            const match = equations[index].fullMatch.match(fullCitationPattern);
            if (match) {
                const eqNumbers: string[] = match[1].split(plugin.settings.multiCitationDelimiter || ',').map(t => t.trim());
                const eqNumbersAll = plugin.settings.enableContinuousCitation ?
                    splitContinuousCitationTags(
                        eqNumbers,
                        plugin.settings.continuousRangeSymbol || '~',
                        plugin.settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                        plugin.settings.fileCiteDelimiter
                    ) : eqNumbers; // split continuous citation tags if enabled  

                const citationWidget = renderEquationCitation(eqNumbersAll, plugin.settings);
                addReadingModePreviewListener(plugin, citationWidget, eqNumbersAll, ctx.sourcePath);
                span.replaceWith(citationWidget);
            }
            else {
                const refPattern = /\\ref\{([^}]*)\}/;
                const match = equations[index].fullMatch.match(refPattern);
                const refTag = match ? match[1] : '';
                const failedWidget = renderFailedCitation(refTag);
                span.replaceWith(failedWidget);
            }
        })
    }
    else {
        new Notice("Equation Citator: Block render error, trun on debug mode and reopen file for details.")
        Debugger.warning(`Citation span number is: ${citeSpans.length},
But recognized citation count is : ${equations.length}, between line ${sectionInfo.lineStart} and ${sectionInfo.lineEnd}
Which is not match. this can cause rendering issue. skip rendering`);
    }
}

function addReadingModePreviewListener(plugin: EquationCitator, citationEl: HTMLElement, eqNumbersAll: string[], sourcePath: string): void {
    citationEl.addEventListener('mouseenter', async () => {
        await showReadingModePopover(plugin, citationEl, eqNumbersAll, sourcePath);
    })
}

async function showReadingModePopover(
    plugin: EquationCitator,
    citationEl: HTMLElement,
    eqNumbersAll: string[],
    sourcePath: string
): Promise<void> {
    const mdView: MarkdownView | null = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    const activeLeaf: WorkspaceLeaf | undefined = mdView?.leaf;
    if (!activeLeaf) return;  // no active leaf found, skip popover
    const equations = await plugin.equationServices.getEquationsByTags(eqNumbersAll, sourcePath);
    if (equations.length === 0) return; // no equations found for this citation, skip popover 

    let popover: CitationPopover | null = new CitationPopover(
        plugin,
        // @ts-ignore -> this can often work correctly.  
        activeLeaf,
        citationEl,
        equations,
        sourcePath,
        300);
    popover.onClose = function () {
        popover = null;
    };
}

// Utility functions
export function isSourceMode(view: EditorView): boolean {
    const mdView = view.state.field(editorInfoField, false) as MarkdownView | undefined;
    const currentMode = mdView?.currentMode;
    // @ts-ignore
    return currentMode?.sourceMode ? true : false;
}


//////////////////////////  Make Markdown for PDF Export  ////////////////////////  

/**
 * Replace all citations in markdown with HTML inline format for PDF rendering 
 * @note
 * Since the original PDF rendering function is not accessible,
 * and patching it is potentially unstable, we make a  markdown copy by replacing the 
 * markdown with HTML format with inline styles for PDF export to render correctly. 
 * 
 * This is admittedly a workaround—not elegant, and somewhat crude—
 *  but it is effective and stable in most practical cases.
 */
export function makePrintMarkdown(md: string, settings: EquationCitatorSettings): string {
    const rangeSymbol = settings.enableContinuousCitation ?
        settings.continuousRangeSymbol || '~' : null;
    const fileCiteDelimiter = settings.enableCrossFileCitation ?
        settings.fileCiteDelimiter || '^' : DISABLED_DELIMITER;

    const result = replaceCitationsInMarkdownWithSpan(
        md,
        settings.citationPrefix,
        rangeSymbol,
        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.citationFormat,
        {
            citationColorInPdf: settings.citationColorInPdf,
            superScriptColorInPdf: settings.fileSuperScriptColorInPdf,
        } as SpanStyles,
    );
    return result;
}
