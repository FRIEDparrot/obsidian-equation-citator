import { Prec, RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { HoverParent, MarkdownPostProcessorContext, Notice, TFile, editorInfoField, MarkdownView } from "obsidian";
import Debugger from "@/debug/debugger";
import { EquationCitatorSettings } from "@/settings/defaultSettings";
import {
    CitationRef,
    splitContinuousCitationTags
} from "@/utils/core/citation_utils";
import { CitationWidget, renderEquationCitation } from "@/views/widgets/citation_widget";
import { FigureCitationWidget } from "@/views/widgets/figure_citation_widget";
import { CalloutCitationWidget } from "@/views/widgets/callout_citation_widget";
import { CitationCache } from "@/cache/citationCache";
import EquationCitator from "@/main";
import { CitationPopover } from "@/views/popovers/citation_popover";
import { FigureCitationPopover } from "@/views/popovers/figure_citation_popover";
import { CalloutCitationPopover } from "@/views/popovers/callout_citation_popover";
import { createEquationTagRegex, matchNestedCitation, inlineMathPattern } from "@/utils/string_processing/regexp_utils";
import { renderFigureCitation } from "@/views/widgets/figure_citation_render";
import { renderCalloutCitation } from "@/views/widgets/callout_citation_render";
import { find_array } from "@/utils/misc/array_utils";
import { fastHash } from "@/utils/misc/hash_utils";
import { isSourceMode } from "@/utils/workspace/workspace_utils";

import { getMarkdownViewFromEvent } from "@/utils/workspace/get_evt_view";
import { CitationType } from "../auto_complete_suggest";
import t from "@/i18n/getLocale";

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
function createTagSelectedField(settings: EquationCitatorSettings) {
    return StateField.define<EditorSelectionInfo>({
        create() {
            return { range: null, tagSelected: false, tagContent: null };
        },
        update(value, tr) {
            const state = tr.state;
            const sel = tr.state.selection.main;
            const selectedText = tr.state.sliceDoc(sel.from, sel.to).trim();
            const tagRegex = createEquationTagRegex(true, null, settings.enableTypstMode);
            const tagContent = new RegExp(tagRegex).exec(selectedText)?.[1] || null;

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
}


/**
 * Live Preview Extension (CodeMirror ViewPlugin) for render equation in editor   
 * @param plugin - The plugin instance
 * @returns 
 */
export function createMathCitationExtension(plugin: EquationCitator) {
    const settings: EquationCitatorSettings = plugin.settings;
    plugin.tagSelectedField = createTagSelectedField(settings);
    return Prec.high([
        plugin.tagSelectedField,
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
                        } else if (currentEqRange?.to === -1 && t.includes("math-end") && !t.includes("math-block")) {
                            currentEqRange.to = node.to;

                            const modeRender = !sourceMode || (sourceMode && settings.enableCitationInSourceMode);
                            if (!modeRender) return;  // source mode rendering is disabled, skip rendering 

                            const inCursor = cursorPos >= currentEqRange.from && cursorPos <= currentEqRange.to;
                            const inSelection = sel.from < currentEqRange.to && sel.to > currentEqRange.from;
                            const text = state.sliceDoc(currentEqRange.from, currentEqRange.to);

                            // Check for equation, figure, and callout citations
                            // Try equation citation first
                            const eqCm = matchNestedCitation(text, settings.citationPrefix);
                            // Try figure citation
                            const figCm = matchNestedCitation(text, settings.figCitationPrefix);
                            // Try callout citations (check all configured prefixes)
                            let calloutCm: ReturnType<typeof matchNestedCitation> = null;
                            let matchedCalloutPrefix: string | null = null;
                            for (const prefixConfig of settings.calloutCitationPrefixes) {
                                const cm = matchNestedCitation(text, prefixConfig.prefix);
                                if (cm) {
                                    calloutCm = cm;
                                    matchedCalloutPrefix = prefixConfig.prefix;
                                    break;  // Use first matching prefix
                                }
                            }

                            const cm = eqCm || figCm || calloutCm;
                            if (!cm) return;

                            const isFigureCitation = !eqCm && figCm && !calloutCm;
                            const isCalloutCitation = !eqCm && !figCm && calloutCm;

                            if (!inSelection && !inCursor) {
                                // citations not in cursor, render full citations
                                // Note: matchNestedCitation already removes the prefix from cm.label
                                const numbers: string[] = cm.label.split(settings.multiCitationDelimiter || ',').map(c => c.trim()).filter(c => c.length > 0);

                                // split all citations to combine later
                                const numbersAll = settings.enableContinuousCitation ?
                                    splitContinuousCitationTags(
                                        numbers,
                                        settings.continuousRangeSymbol || '~',
                                        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                                        settings.fileCiteDelimiter
                                    ) : numbers; // split continuous citation tags if enabled

                                // Determine widget type and citation type
                                let widget: CitationWidget | FigureCitationWidget | CalloutCitationWidget;
                                let citationType: CitationType;

                                if (isCalloutCitation && matchedCalloutPrefix) {
                                    widget = new CalloutCitationWidget(
                                        plugin,
                                        currentFile.path,
                                        matchedCalloutPrefix,
                                        numbersAll,
                                        currentEqRange,
                                    );
                                    citationType = "callout";
                                } else if (isFigureCitation) {
                                    widget = new FigureCitationWidget(
                                        plugin,
                                        currentFile.path,
                                        numbersAll,
                                        currentEqRange,
                                    );
                                    citationType = "figure";
                                } else {
                                    widget = new CitationWidget(
                                        plugin,
                                        currentFile.path,
                                        numbersAll,
                                        currentEqRange,
                                    );
                                    citationType = "equation";
                                }

                                builder.add(
                                    currentEqRange.from,
                                    currentEqRange.to,
                                    Decoration.replace({
                                        widget,
                                        attributes: {
                                            "data-citation-id": citationId,
                                            "data-citation-type": citationType
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
 * @returns 
 */
export async function mathCitationPostProcessor(
    plugin: EquationCitator,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    citationCache: CitationCache,
): Promise<void> {
    const { calloutCitationPrefixes, figCitationPrefix, citationPrefix } = plugin.settings;
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
            const citation = citations[index];

            // Check if this is a figure, equation, or callout citation
            const isFigureCitation = citation.label.startsWith(plugin.settings.figCitationPrefix);
            const isEquationCitation = citation.label.startsWith(citationPrefix);

            // Check for callout citations
            let isCalloutCitation = false;
            let calloutPrefix: string | null = null;
            for (const prefixConfig of calloutCitationPrefixes) {
                if (citation.label.startsWith(prefixConfig.prefix)) {
                    isCalloutCitation = true;
                    calloutPrefix = prefixConfig.prefix;
                    break;
                }
            }

            if (!isFigureCitation && !isEquationCitation && !isCalloutCitation) return; // Skip if not a valid citation

            // Note: CitationRef.label includes the prefix (e.g., "fig:7", "eq:1.1", or "table:1.1")
            // We need to remove it before processing
            let prefix: string | null = null;
            if (isCalloutCitation) {
                prefix = calloutPrefix;
            } else if (isFigureCitation) {
                prefix = figCitationPrefix;
            } else if (isEquationCitation) {
                prefix = citationPrefix;
            }
            if (prefix === null) return;
            const label = citation.label.substring(prefix.length);  // get the actual label without prefix
            const numbers: string[] = label.split(plugin.settings.multiCitationDelimiter || ',').map(t => t.trim());
            const numbersAll = plugin.settings.enableContinuousCitation ?
                splitContinuousCitationTags(
                    numbers,
                    plugin.settings.continuousRangeSymbol || '~',
                    plugin.settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                    plugin.settings.fileCiteDelimiter
                ) : numbers; // split continuous citation tags if enabled

            const activeLeaf = plugin.app.workspace.getActiveViewOfType(MarkdownView) as HoverParent | null;
            if (!activeLeaf) {
                Debugger.error("No active leaf found, skip rendering");
                return;
            }

            let citationWidget: HTMLElement | null = null;
            if (isCalloutCitation && calloutPrefix) {
                citationWidget = renderCalloutCitation(
                    plugin,
                    ctx.sourcePath,
                    activeLeaf,
                    calloutPrefix,
                    numbersAll,
                    true,
                );
            } else if (isFigureCitation) {
                citationWidget = renderFigureCitation(
                    plugin,
                    ctx.sourcePath,
                    activeLeaf,
                    numbersAll,
                    true,
                );
            } else {
                citationWidget = renderEquationCitation(
                    plugin,
                    ctx.sourcePath,
                    activeLeaf,
                    numbersAll,
                    true,
                );
            }

            if (isCalloutCitation && calloutPrefix) {
                addReadingModeCalloutPreviewListener(plugin, citationWidget, calloutPrefix, numbersAll, ctx.sourcePath);
            } else if (isFigureCitation) {
                addReadingModeFigurePreviewListener(plugin, citationWidget, numbersAll, ctx.sourcePath);
            } else {
                addReadingModePreviewListener(plugin, citationWidget, numbersAll, ctx.sourcePath);
            }

            span.replaceWith(citationWidget);
        });
    }
    // substitute the block with equation citation 
    if (citations.length === citeSpans.length && isFullArticle) {
        // render equation citation for each math span
        renderCiteSpans(citeSpans, citations);
    }
    else {
        // not full article, search part of the block for citations 
        const sectionLines = sectionInfo.text.split('\n').slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1);
        const sectionHashes = sectionLines.map(line => fastHash(line));
        const lineIndex = find_array(sectionHashes, lineHash.map(l => l.hash));
        Debugger.log("Block rendering - find hash index at line:", lineIndex);
        if (lineIndex === -1) {
            new Notice(t("widget.lineHashNotFound"));
            return;
        }
        const lineStart = lineIndex;
        const lineEnd = lineStart + (sectionInfo.lineEnd - sectionInfo.lineStart);
        const newCitations = allCitations.filter(eq => eq.line >= lineStart && eq.line <= lineEnd);
        if (newCitations.length !== citeSpans.length) {
            new Notice(t("widget.citationBlockNotMatched"));
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
        (span as HTMLElement).addEventListener('mouseenter', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            void showReadingModePopover(plugin, citationEl, eqNumbersAll, sourcePath, event);
        })
    })
}

function addReadingModeFigurePreviewListener(plugin: EquationCitator, citationEl: HTMLElement, figureTagsAll: string[], sourcePath: string): void {
    const citationSpans = citationEl.querySelectorAll('span.em-figure-citation');
    citationSpans.forEach(span => {
        (span as HTMLElement).addEventListener('mouseenter', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            void showReadingModeFigurePopover(plugin, citationEl, figureTagsAll, sourcePath, event);
        })
    })
}

async function showReadingModeFigurePopover(
    plugin: EquationCitator,
    citationEl: HTMLElement,
    figureTagsAll: string[],
    sourcePath: string,
    event: MouseEvent
): Promise<void> {
    const mdView: MarkdownView | null = getMarkdownViewFromEvent(plugin.app.workspace, event);
    if (!mdView) return;  // no view found for event, skip popover

    const figures = await plugin.figureServices.getFiguresByTags(figureTagsAll, sourcePath);
    const cleanedFigures = figures.filter(fig => fig.tag && fig.sourcePath && (fig.imagePath || fig.imageLink));

    if (cleanedFigures.length === 0) {
        Debugger.log(`No valid figures found for citation: ${figureTagsAll.join(', ')}`);
        return;
    }

    let popover: FigureCitationPopover | null = new FigureCitationPopover(
        plugin,
        mdView,
        citationEl,
        figures,
        sourcePath,
        300
    );

    popover.onClose = function () {
        popover = null;
    };
}

function addReadingModeCalloutPreviewListener(
    plugin: EquationCitator,
    citationEl: HTMLElement,
    prefix: string,
    calloutTagsAll: string[],
    sourcePath: string
): void {
    const citationSpans = citationEl.querySelectorAll('span.em-callout-citation');
    citationSpans.forEach(span => {
        (span as HTMLElement).addEventListener('mouseenter', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            void showReadingModeCalloutPopover(plugin, citationEl, prefix, calloutTagsAll, sourcePath, event);
        })
    })
}

async function showReadingModeCalloutPopover(
    plugin: EquationCitator,
    citationEl: HTMLElement,
    prefix: string,
    calloutTagsAll: string[],
    sourcePath: string,
    event: MouseEvent
): Promise<void> {
    const mdView: MarkdownView | null = getMarkdownViewFromEvent(plugin.app.workspace, event);
    if (!mdView) return;  // no view found for event, skip popover

    const callouts = await plugin.calloutServices.getCalloutsByTags(calloutTagsAll, prefix, sourcePath);
    const cleanedCallouts = callouts.filter(c => c.tag && c.sourcePath && c.content);

    if (cleanedCallouts.length === 0) {
        Debugger.log(`No valid callouts found for citation: ${calloutTagsAll.join(', ')}`);
        return;
    }

    let popover: CalloutCitationPopover | null = new CalloutCitationPopover(
        plugin,
        mdView,
        citationEl,
        prefix,
        callouts,
        sourcePath,
        300
    );

    popover.onClose = function () {
        popover = null;
    };
}

export function calloutCitationPostProcessor(
    plugin: EquationCitator,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    citationCache: CitationCache,
): void {
    // render the inline-code format citation in the callout block
    const calloutContent = el.querySelector('.callout-content');
    if (!calloutContent) return;  // no callout content found, skip rendering   
    const codeCitations = calloutContent.querySelectorAll('code');
    if (codeCitations.length === 0) return;  // no code citation found, skip rendering 

    codeCitations.forEach(code => {
        const citeContent = code.innerText.trim();
        const match = new RegExp(inlineMathPattern.source).exec(citeContent);

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
    sourcePath: string,
    event: MouseEvent
): Promise<void> {
    const mdView: MarkdownView | null = getMarkdownViewFromEvent(plugin.app.workspace, event);
    if (!mdView) return;  // no view found for event, skip popover

    const equations = await plugin.equationServices.getEquationsByTags(eqNumbersAll, sourcePath);
    const cleanedEquations = equations.filter(eq => eq.md && eq.sourcePath);

    if (cleanedEquations.length === 0) {
        Debugger.log(`No valid equation found for citation: ${eqNumbersAll.join(', ')}`);
        return;
    } // no equations found for this citation, skip popover 

    let popover: CitationPopover | null = new CitationPopover(
        plugin,
        mdView,
        citationEl,
        equations,
        sourcePath,
        300);
    popover.onClose = function () {
        popover = null;
    };
}
