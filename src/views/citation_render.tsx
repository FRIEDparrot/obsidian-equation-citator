import { Prec, RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { HoverParent, MarkdownPostProcessorContext, Notice, TFile, WorkspaceLeaf } from "obsidian";
import Debugger from "@/debug/debugger";
import { EquationCitatorSettings } from "@/settings/settingsTab";
import { editorInfoField, MarkdownView } from "obsidian";
import {
    CitationRef,
    replaceCitationsInMarkdownWithSpan,
    SpanStyles,
    splitContinuousCitationTags
} from "@/utils/citation_utils";
import { CitationWidget } from "@/views/citation_widget";
import { CitationCache } from "@/cache/citationCache";
import { DISABLED_DELIMITER } from "@/utils/string_utils";
import EquationCitator from "@/main";
import { CitationPopover } from "@/views/citation_popover";
import { createEquationTagRegex, matchNestedCitation, inlineMathPattern } from "@/utils/regexp_utils";
import { renderEquationCitation } from "@/views/citation_widget";
import { find_array } from "@/utils/array_utils";
import { fastHash } from "@/utils/hash_utils";

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
        const tagRegex = createEquationTagRegex(true, null);
        const tagContent = selectedText.match(tagRegex)?.[1] || null;

        let tagSelected = false;
        if (tagRegex.test(selectedText)) {
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
            lastPrefix: string;
            view: EditorView;
            constructor(view: EditorView) {
                this.view = view;
                this.decorations = this.buildDecorations(view);
                this.lastPrefix = settings.citationPrefix;
                // this.observeCallouts(view)
            }
            update(update: ViewUpdate) {
                // delay to let the editor finish rendering
                if (this.lastPrefix !== settings.citationPrefix) {
                    this.lastPrefix = settings.citationPrefix;  // update the prefix
                }
                if (update.docChanged ||
                    update.viewportChanged ||
                    update.focusChanged ||
                    update.selectionSet) {
                    this.decorations = this.buildDecorations(update.view);
                    return;
                }
            }

            private buildDecorations(view: EditorView): DecorationSet {
                const builder = new RangeSetBuilder<Decoration>();
                const currentFile = view.state.field(editorInfoField).file;
                if (!(currentFile instanceof TFile)) {
                    return builder.finish();  // no file, no decorations  
                }
                const { state } = view;
                let currentEqRange: { from: number; to: number } | null = null;
                const cursorPos = state.selection.main.to;
                const sel = state.selection.main;
                const sourceMode = isSourceMode(view);
                const tree = syntaxTree(state);
                let calloutId = 0;
                let citationId = 0;
                tree.iterate({
                    enter: (node) => {
                        const t = node.type.name;
                        if (t.includes("HyperMD-callout")) {
                            builder.add(node.from, node.to,
                                Decoration.mark({
                                    class: "em-math-citation-callout",
                                    attributes: {
                                        "data-ec-callout-id": `${calloutId}`,
                                        "data-ec-callout-pos": `${node.from}-${node.to}`,
                                    }
                                })
                            );
                            calloutId++;
                        }
                        if (t.includes("math-begin") && !t.includes("math-block")) {
                            currentEqRange = { from: node.from, to: -1 };
                        } else if (currentEqRange && currentEqRange.to === -1 && t.includes("math-end") && !t.includes("math-block")) {
                            currentEqRange.to = node.to;

                            const modeRender = !sourceMode || (sourceMode && settings.enableCitationInSourceMode);
                            if (!modeRender) return;  // source mode rendering is disabled, skip rendering 

                            const inCursor = cursorPos >= currentEqRange.from && cursorPos <= currentEqRange.to;
                            const inSelection = sel.from < currentEqRange.to && sel.to > currentEqRange.from;
                            const text = state.sliceDoc(currentEqRange.from, currentEqRange.to);

                            // citation match 
                            const cm = matchNestedCitation(text, settings.citationPrefix);
                            if (!cm) return;
                            if (!inSelection && !inCursor) {
                                // citations not in cursor,  render full citations
                                const eqNumbers: string[] = cm.label.split(settings.multiCitationDelimiter || ',').map(c => c.trim()).filter(c => c.length > 0);

                                // split all equations to combine later  
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
                                        widget: new CitationWidget(
                                            plugin,
                                            currentFile.path,
                                            eqNumbersAll,
                                            currentEqRange,
                                        ),
                                        attributes: {
                                            "data-citation-id": citationId
                                        }
                                    })
                                );
                                citationId++;
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

function isErrorRenderedSpan(span: Element): boolean {
    // mark span that render failed (???) as citation span  
    const anchorTags = span.querySelectorAll('a');  // find a from span 
    if (anchorTags.length !== 1) return false;
    // check if it is rendered as ???  
    return Array.from(anchorTags).some(a => {
        const questionMarks = a.querySelectorAll('mjx-mtext mjx-c.mjx-c3F');
        return questionMarks.length === 3;
    });
}

function getCitationSpan(el: Element): Element[] | null {
    const mathSpans = el.querySelectorAll("span.math.math-inline.is-loaded");
    if (mathSpans.length === 0) return null;
    const citeSpans = Array.from(mathSpans).filter(span => isErrorRenderedSpan(span));
    if (citeSpans.length === 0) return null;   // no citation span found
    return citeSpans;
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
    const { citationPrefix } = plugin.settings;
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;
    // find citation spans in the section 
    const citeSpans = getCitationSpan(el);
    if (!citeSpans) return;  // no citation span found, skip rendering 

    const allCitations: CitationRef[] | undefined = await citationCache.getCitationsForFile(ctx.sourcePath)
    if (!allCitations) return; // no citations found for this file

    const lineHash = await plugin.lineHashCache.getLineHashForFile(ctx.sourcePath);
    if (!lineHash) return; // no line hash found for this file

    // all equation citations in the blcok 
    const isFullArticle = (sectionInfo.text.split('\n').length === lineHash.length);
    const citations = allCitations.filter(
        eq => eq.line >= sectionInfo.lineStart && eq.line <= sectionInfo.lineEnd
    )

    const renderCiteSpans = (citeSpans: Element[], citations: CitationRef[]) => {
        citeSpans.forEach((span, index) => {  // no need to match for 2rd time here 
            const eq = citations[index];
            const eqLabel = eq.label.substring(citationPrefix.length);  // get the actual label without prefix 
            const eqNumbers: string[] = eqLabel.split(plugin.settings.multiCitationDelimiter || ',').map(t => t.trim());
            const eqNumbersAll = plugin.settings.enableContinuousCitation ?
                splitContinuousCitationTags(
                    eqNumbers,
                    plugin.settings.continuousRangeSymbol || '~',
                    plugin.settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                    plugin.settings.fileCiteDelimiter
                ) : eqNumbers; // split continuous citation tags if enabled  
            const activeLeaf = plugin.app.workspace.getActiveViewOfType(MarkdownView) as HoverParent | null;
            if (!activeLeaf) {
                Debugger.error("No active leaf found, skip rendering");
                return;
            }
            const citationWidget = renderEquationCitation(
                plugin,
                ctx.sourcePath,
                activeLeaf,
                eqNumbersAll,
                true,
            );
            addReadingModePreviewListener(plugin, citationWidget, eqNumbersAll, ctx.sourcePath);
            span.replaceWith(citationWidget);
        });
    }
    // substitute the block with equation citation 
    if (citations.length === citeSpans.length && isFullArticle) {
        // render equation citation for each math span
        renderCiteSpans(citeSpans, citations);
        return;  // finish rendering for this block 
    }
    else {
        // not full article, search part of the block for citations 
        const sectionLines = sectionInfo.text.split('\n').slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1);
        const sectionHashes = sectionLines.map(line => fastHash(line));
        const lineIndex = find_array(sectionHashes, lineHash.map(l => l.hash));
        Debugger.log("Block rendering - find hash index at line:", lineIndex);
        if (lineIndex === -1) {
            new Notice("Equation Citator: Can't locate the line hash for this section, skip rendering");
            return;
        }
        const lineStart = lineIndex;
        const lineEnd = lineStart + (sectionInfo.lineEnd - sectionInfo.lineStart);
        const newCitations = allCitations.filter(eq => eq.line >= lineStart && eq.line <= lineEnd);
        if (newCitations.length !== citeSpans.length) {
            new Notice("Citation block not fully matched, skip rendering (open debug mode for more information)");
            Debugger.warning(`Citation span number is: ${citeSpans.length},
        But recognized citation count is : ${newCitations.length}, between line ${lineStart} and ${lineEnd}
        Which is not match. this can cause rendering issue. skip rendering`);
            return;
        }
        renderCiteSpans(citeSpans, newCitations);
    }
}

function addReadingModePreviewListener(plugin: EquationCitator, citationEl: HTMLElement, eqNumbersAll: string[], sourcePath: string): void {
    const citationSpans = citationEl.querySelectorAll('span.em-math-citation');
    citationSpans.forEach(span => {
        span.addEventListener('mouseenter', async (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            await showReadingModePopover(plugin, citationEl, eqNumbersAll, sourcePath);
        })
    })
}

export async function calloutCitationPostProcessor(
    plugin: EquationCitator,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    citationCache: CitationCache,
): Promise<void> {
    // render the inline-code format citation in the callout block
    const calloutContent = el.querySelector('.callout-content');
    if (!calloutContent) return;  // no callout content found, skip rendering   
    const codeCitations = calloutContent.querySelectorAll('code');
    if (codeCitations.length === 0) return;  // no code citation found, skip rendering 

    codeCitations.forEach(code => {
        const citeContent = code.innerText.trim();
        const match = citeContent.match(inlineMathPattern.source);

        if (!match) return;
        const citation = matchNestedCitation(match[1], plugin.settings.citationPrefix);
        if (!citation) return;  // not valid citation, skip rendering  

        // get the actual label without prefix
        const eqNumbers: string[] = citation.label.split(plugin.settings.multiCitationDelimiter || ',').map(t => t.trim());
        const eqNumbersAll = plugin.settings.enableContinuousCitation ?
            splitContinuousCitationTags(
                eqNumbers,
                plugin.settings.continuousRangeSymbol || '~',
                plugin.settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                plugin.settings.fileCiteDelimiter
            ) : eqNumbers; // split continuous citation tags if enabled 
        const activeLeaf = plugin.app.workspace.getActiveViewOfType(MarkdownView) as HoverParent | null;
        if (!activeLeaf) {
            Debugger.error("No active leaf found, skip rendering");
            return;
        }
        const citationWidget = renderEquationCitation(
            plugin,
            ctx.sourcePath,
            activeLeaf,
            eqNumbersAll,
            true,
        );
        addReadingModePreviewListener(plugin, citationWidget, eqNumbersAll, ctx.sourcePath);
        code.replaceWith(citationWidget);
    });
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
    const cleanedEquations = equations.filter(eq => eq.md && eq.sourcePath);

    if (cleanedEquations.length === 0) {
        Debugger.log(`No valid equation found for citation: ${eqNumbersAll.join(', ')}`);
        return;
    } // no equations found for this citation, skip popover 

    let popover: CitationPopover | null = new CitationPopover(
        plugin,
        // @ts-ignore
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
    const { citationColorInPdf } = settings;
    const result = replaceCitationsInMarkdownWithSpan(
        md,
        settings.citationPrefix,
        rangeSymbol,
        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.citationFormat,
        {
            citationColorInPdf
        } as SpanStyles,
    );
    return result;
}
