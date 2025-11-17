import { Prec, RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { HoverParent, MarkdownPostProcessorContext, Notice, TFile, WorkspaceLeaf } from "obsidian";
import Debugger from "@/debug/debugger";
import { EquationCitatorSettings } from "@/settings/defaultSettings";
import { editorInfoField, MarkdownView } from "obsidian";
import {
    CitationRef,
    splitContinuousCitationTags
} from "@/utils/core/citation_utils";
import { CitationWidget } from "@/views/widgets/citation_widget";
import { FigureCitationWidget } from "@/views/widgets/figure_citation_widget";
import { CalloutCitationWidget } from "@/views/widgets/callout_citation_widget";
import { CitationCache } from "@/cache/citationCache";
import EquationCitator from "@/main";
import { CitationPopover } from "@/views/popovers/citation_popover";
import { FigureCitationPopover } from "@/views/popovers/figure_citation_popover";
import { CalloutCitationPopover } from "@/views/popovers/callout_citation_popover";
import { createEquationTagRegex, matchNestedCitation, inlineMathPattern } from "@/utils/string_processing/regexp_utils";
import { renderEquationCitation } from "@/views/widgets/citation_widget";
import { renderFigureCitation } from "@/views/widgets/figure_citation_render";
import { renderCalloutCitation } from "@/views/widgets/callout_citation_render";
import { find_array } from "@/utils/misc/array_utils";
import { fastHash } from "@/utils/misc/hash_utils";
import { isSourceMode } from "@/utils/workspace/workspace_utils";
import { parseAllImagesFromMarkdown, parseImageLine, ImageMatch } from "@/utils/parsers/image_parser";
import { getMarkdownViewFromEvent } from "@/utils/workspace/get_evt_view";

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
}


/**
 * Live Preview Extension (CodeMirror ViewPlugin) for render equation in editor   
 * @param settings 
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

                            // Check for equation, figure, and callout citations
                            // Try equation citation first
                            const eqCm = matchNestedCitation(text, settings.citationPrefix);
                            // Try figure citation
                            const figCm = matchNestedCitation(text, settings.figCitationPrefix);
                            // Try callout citations (check all configured prefixes)
                            let calloutCm: ReturnType<typeof matchNestedCitation> = null;
                            let matchedCalloutPrefix: string | null = null;
                            for (const prefixConfig of settings.quoteCitationPrefixes) {
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
                                let citationType: string;

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
            const citation = citations[index];

            // Check if this is a figure, equation, or callout citation
            const isFigureCitation = citation.label.startsWith(plugin.settings.figCitationPrefix);
            const isEquationCitation = citation.label.startsWith(citationPrefix);

            // Check for callout citations
            let isCalloutCitation = false;
            let calloutPrefix: string | null = null;
            for (const prefixConfig of plugin.settings.quoteCitationPrefixes) {
                if (citation.label.startsWith(prefixConfig.prefix)) {
                    isCalloutCitation = true;
                    calloutPrefix = prefixConfig.prefix;
                    break;
                }
            }

            if (!isFigureCitation && !isEquationCitation && !isCalloutCitation) return; // Skip if not a valid citation

            // Note: CitationRef.label includes the prefix (e.g., "fig:7", "eq:1.1", or "table:1.1")
            // We need to remove it before processing
            const prefix = isCalloutCitation ? calloutPrefix :
                          (isFigureCitation ? plugin.settings.figCitationPrefix : citationPrefix);
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

            const citationWidget = isCalloutCitation && calloutPrefix
                ? renderCalloutCitation(
                    plugin,
                    ctx.sourcePath,
                    activeLeaf,
                    calloutPrefix,
                    numbersAll,
                    true,
                )
                : (isFigureCitation
                    ? renderFigureCitation(
                        plugin,
                        ctx.sourcePath,
                        activeLeaf,
                        numbersAll,
                        true,
                    )
                    : renderEquationCitation(
                        plugin,
                        ctx.sourcePath,
                        activeLeaf,
                        numbersAll,
                        true,
                    ));

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
        return;  // finish rendering for this block 
    }
    else {
        // not full article, search part of the block for citations 
        const sectionLines = sectionInfo.text.split('\n').slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1);
        const sectionHashes = sectionLines.map(line => fastHash(line));
        const lineIndex = find_array(sectionHashes, lineHash.map(l => l.hash));
        Debugger.log("Block rendering - find hash index at line:", lineIndex);
        if (lineIndex === -1) {
            new Notice("Can't locate the line hash for this section, skip rendering");
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
        span.addEventListener('mouseenter', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            void showReadingModePopover(plugin, citationEl, eqNumbersAll, sourcePath, event);
        })
    })
}

function addReadingModeFigurePreviewListener(plugin: EquationCitator, citationEl: HTMLElement, figureTagsAll: string[], sourcePath: string): void {
    const citationSpans = citationEl.querySelectorAll('span.em-figure-citation');
    citationSpans.forEach(span => {
        span.addEventListener('mouseenter', (event: MouseEvent) => {
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
        span.addEventListener('mouseenter', (event: MouseEvent) => {
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

/////////////////////////////// Image Caption Rendering /////////////////////////

/**
 * Live Preview Extension for rendering image captions
 * This extension finds rendered image elements and adds captions below them
 */
export function createImageCaptionExtension(plugin: EquationCitator) {
    const settings: EquationCitatorSettings = plugin.settings;

    return ViewPlugin.fromClass(class {
        view: EditorView;
        captionElements: Map<string, HTMLElement> = new Map();
        captionsByLine: Map<number, { element: Element; caption: HTMLElement }> = new Map();
        lastCursorLine = -1;
        
        constructor(view: EditorView) {
            this.view = view;
            this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
            this.renderImageCaptions(view);
        }

        update(update: ViewUpdate) {
            // Check if cursor moved to a different line
            const currentCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
            const cursorLineChanged = currentCursorLine !== this.lastCursorLine;

            // Re-render if:
            // 1. Document content changed (typing, pasting, etc.)
            // 2. Viewport scrolled
            // 3. Cursor moved to a different line (Enter, arrow keys, clicking)
            if (update.docChanged || update.viewportChanged || (update.selectionSet && cursorLineChanged)) {
                this.lastCursorLine = currentCursorLine;
                this.renderImageCaptions(update.view);
            }
        }

        renderImageCaptions(view: EditorView) {
            const currentFile = view.state.field(editorInfoField).file;
            if (!(currentFile instanceof TFile)) {
                return;
            }

            // Get current cursor line for real-time parsing
            const cursorPos = view.state.selection.main.head;
            const cursorLine = view.state.doc.lineAt(cursorPos);
            const cursorLineNumber = cursorLine.number;
            const cursorLineText = cursorLine.text;

            // Check if current line is an image line
            const currentLineImage = parseImageLine(cursorLineText, cursorLineNumber, settings.figCitationPrefix);

            let images: ImageMatch[];

            // If current line is a valid image, parse all markdown directly for immediate feedback
            if (currentLineImage) {
                const markdown = view.state.doc.toString();
                images = parseAllImagesFromMarkdown(markdown, settings.figCitationPrefix);
                
                // Force-refresh the cache with the parsed images
                plugin.imageCache.set(currentFile.path, images);
            } else {
                // Not typing on an image line, use cache (will be handled asynchronously)
                void plugin.imageCache.getImagesForFile(currentFile.path).then(cachedImages => {
                    if (!cachedImages || cachedImages.length === 0) {
                        // No images in cache, remove all captions
                        const allCaptions = view.dom.querySelectorAll('.em-image-caption');
                        allCaptions.forEach(cap => cap.remove());
                        return;
                    }
                    this.processAndRenderImages(cachedImages, view);
                });
                return;
            }

            // Process and render images synchronously when on image line
            this.processAndRenderImages(images, view);
        }

        processAndRenderImages(images: ImageMatch[], view: EditorView) {
            // Only process images that have metadata to display
            const imagesWithMetadata = images.filter(img =>
                img.tag !== undefined && (img.tag || img.title || img.desc)
            );

            if (imagesWithMetadata.length === 0) {
                // No images with metadata, remove all captions
                const allCaptions = view.dom.querySelectorAll('.em-image-caption');
                allCaptions.forEach(cap => cap.remove());
                return;
            }

            // Find all image elements in the editor
            const editorEl = view.dom;
            const allImageElements = this.getAllImageElements(editorEl);

            // Match images by line position in document
            const matchedPairs = this.matchImagesByLine(allImageElements, imagesWithMetadata, view);

            // Track which elements should have captions
            const elementsWithCaptions = new Set<Element>();
            const processedLines = new Set<number>();

            // Apply captions
            matchedPairs.forEach(({ element, imageData }) => {
                if (imageData) {
                    this.ensureCaption(element, imageData, settings);
                    elementsWithCaptions.add(element);
                    processedLines.add(imageData.line);
                }
            });

            // Clean up any orphaned captions
            // Since we only render for internal embeds, this is simple
            const allCaptions = view.dom.querySelectorAll('.em-image-caption');
            allCaptions.forEach(caption => {
                // Check if this caption is attached to a tracked element
                const parentElement = caption.parentElement;
                const isAttached = Array.from(elementsWithCaptions).some(el =>
                    el === parentElement || el.contains(caption)
                );

                // Remove if not attached (shouldn't happen with internal embeds only)
                if (!isAttached) {
                    caption.remove();
                }
            });
        }

        getAllImageElements(editorEl: HTMLElement): Element[] {
            const images: Element[] = [];

            // Only process internal embeds (local files)
            // This prevents orphaned captions during editing for markdown/web link images
            const internalEmbeds = editorEl.querySelectorAll('.internal-embed.image-embed, .internal-embed.is-loaded');
            internalEmbeds.forEach(el => {
                const img = el.querySelector('img');
                if (img) {
                    images.push(el);
                }
            });

            return images;
        }

        matchImagesByLine(
            renderedImages: Element[],
            parsedImages: ImageMatch[],
            view: EditorView
        ): Array<{ element: Element; imageData: ImageMatch | null }> {
            const result: Array<{ element: Element; imageData: ImageMatch | null }> = [];
            const usedIndices = new Set<number>();

            for (const element of renderedImages) {
                const imgEl = element.tagName === 'IMG' ? element : element.querySelector('img');
                if (!imgEl) {
                    result.push({ element, imageData: null });
                    continue;
                }

                // Check if caption already exists - if so, try to preserve it
                const existingCaption = this.getExistingCaption(element);
                if (existingCaption) {
                    // Try to find matching data to update caption
                    const lineNum = this.getLineNumber(element, view);

                    if (lineNum !== -1) {
                        // Find the closest unused parsed image
                        let bestMatch: ImageMatch | null = null;
                        let bestMatchIndex = -1;
                        let bestDistance = Infinity;

                        for (let i = 0; i < parsedImages.length; i++) {
                            if (usedIndices.has(i)) continue;
                            const img = parsedImages[i];
                            const distance = Math.abs(img.line - lineNum);
                            if (distance <= 1 && distance < bestDistance) {
                                bestMatch = img;
                                bestMatchIndex = i;
                                bestDistance = distance;
                            }
                        }

                        if (bestMatch && bestMatchIndex !== -1) {
                            usedIndices.add(bestMatchIndex);
                            result.push({ element, imageData: bestMatch });
                            continue;
                        }
                    }

                    // If we can't match by line, keep the existing caption
                    // Don't remove it just because line detection failed
                    result.push({ element, imageData: null });
                    continue;
                }

                // No existing caption - try to create one
                const lineNum = this.getLineNumber(element, view);

                if (lineNum === -1) {
                    result.push({ element, imageData: null });
                    continue;
                }

                // Find the closest unused parsed image on the same or nearby line
                let bestMatch: ImageMatch | null = null;
                let bestMatchIndex = -1;
                let bestDistance = Infinity;

                for (let i = 0; i < parsedImages.length; i++) {
                    if (usedIndices.has(i)) continue;

                    const img = parsedImages[i];
                    const distance = Math.abs(img.line - lineNum);

                    // Only consider images within 1 line distance
                    if (distance <= 1 && distance < bestDistance) {
                        bestMatch = img;
                        bestMatchIndex = i;
                        bestDistance = distance;
                    }
                }

                if (bestMatch && bestMatchIndex !== -1) {
                    usedIndices.add(bestMatchIndex);
                    result.push({ element, imageData: bestMatch });
                } else {
                    result.push({ element, imageData: null });
                }
            }

            return result;
        }

        getExistingCaption(element: Element): Element | null {
            // Check for caption as child (internal embeds only)
            return element.querySelector('.em-image-caption');
        }

        getLineNumber(element: Element, view: EditorView): number {
            try {
                const domNode = element instanceof HTMLElement ? element : element.parentElement;
                if (domNode) {
                    const pos = view.posAtDOM(domNode);
                    const line = view.state.doc.lineAt(pos).number - 1; // 0-indexed
                    return line;
                }
            } catch (e) {
                console.error(e);
            }
            return -1;
        }

        ensureCaption(element: Element, imageData: ImageMatch, settings: EquationCitatorSettings) {
            // Check if caption already exists
            let existingCaption = element.querySelector('.em-image-caption');

            // For IMG elements, check next sibling
            if (!existingCaption && element.tagName === 'IMG') {
                const nextSibling = element.nextElementSibling;
                if (nextSibling?.classList.contains('em-image-caption')) {
                    existingCaption = nextSibling;
                }
            }

            if (existingCaption) {
                // Update existing caption
                this.updateCaption(existingCaption as HTMLElement, imageData, settings);
            } else {
                // Create new caption
                this.createCaption(element, imageData, settings);
            }
        }

        removeCaptionIfExists(element: Element) {
            // Check for caption as child (internal embeds only)
            const existingCaption = element.querySelector('.em-image-caption');
            if (existingCaption) {
                existingCaption.remove();
            }
        }

        createCaption(element: Element, image: ImageMatch, settings: EquationCitatorSettings) {
            const captionDiv = document.createElement('div');
            captionDiv.className = 'em-image-caption';

            // First line: Fig. X.X title
            if (image.tag || image.title) {
                const titleLine = document.createElement('div');
                titleLine.className = 'em-image-caption-title';

                let titleText = '';
                if (image.tag) {
                    const figLabel = settings.figCitationFormat.replace('#', image.tag);
                    titleText = figLabel;
                }
                if (image.title) {
                    titleText += (titleText ? ' ' : '') + image.title;
                }

                titleLine.textContent = titleText;
                captionDiv.appendChild(titleLine);
            }

            // Second line: description
            if (image.desc) {
                const descLine = document.createElement('div');
                descLine.className = 'em-image-caption-desc';
                descLine.textContent = image.desc;
                captionDiv.appendChild(descLine);
            }

            // Only append to internal embeds (not IMG elements)
            element.appendChild(captionDiv);
        }

        updateCaption(captionEl: HTMLElement, image: ImageMatch, settings: EquationCitatorSettings) {
            // Clear existing content
            captionEl.innerHTML = '';

            // First line: Fig. X.X title
            if (image.tag || image.title) {
                const titleLine = document.createElement('div');
                titleLine.className = 'em-image-caption-title';

                let titleText = '';
                if (image.tag) {
                    const figLabel = settings.figCitationFormat.replace('#', image.tag);
                    titleText = figLabel;
                }
                if (image.title) {
                    titleText += (titleText ? ' ' : '') + image.title;
                }

                titleLine.textContent = titleText;
                captionEl.appendChild(titleLine);
            }

            // Second line: description
            if (image.desc) {
                const descLine = document.createElement('div');
                descLine.className = 'em-image-caption-desc';
                descLine.textContent = image.desc;
                captionEl.appendChild(descLine);
            }
        }

        destroy() {
            this.captionElements.clear();
            this.captionsByLine.clear();
        }
    });
}

/**
 * Reading Mode Post-Processor for image captions
 */
export async function imageCaptionPostProcessor(
    plugin: EquationCitator,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
): Promise<void> {
    const { figCitationFormat, figCitationPrefix } = plugin.settings;

    // Get the source file content
    const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!file || !(file instanceof TFile)) return;

    const content = await plugin.app.vault.read(file);
    const images = parseAllImagesFromMarkdown(content, figCitationPrefix);

    // Only process images that have metadata
    const imagesWithMetadata = images.filter(img =>
        img.tag !== undefined && (img.tag || img.title || img.desc)
    );

    if (imagesWithMetadata.length === 0) return;

    // Get section info to calculate line offset
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;

    // Find all image elements (only internal embeds)
    const allImageElements: Element[] = [];

    // Internal embeds only (local files)
    const internalEmbeds = el.querySelectorAll('.internal-embed.image-embed, .internal-embed.is-loaded');
    internalEmbeds.forEach(embedEl => {
        const img = embedEl.querySelector('img');
        if (img) {
            allImageElements.push(embedEl);
        }
    });

    // Filter images in this section
    const sectionImages = imagesWithMetadata.filter(img =>
        img.line >= sectionInfo.lineStart && img.line <= sectionInfo.lineEnd
    );

    if (sectionImages.length === 0) return;

    // Sort by line number
    sectionImages.sort((a, b) => a.line - b.line);

    // Match by order - assume images appear in same order as in markdown
    const usedIndices = new Set<number>();

    allImageElements.forEach((element) => {
        // Check if caption already exists
        const hasCaption = element.querySelector('.em-image-caption') !== null;
        if (hasCaption) return;

        // Find next unused image data
        for (let i = 0; i < sectionImages.length; i++) {
            if (!usedIndices.has(i)) {
                usedIndices.add(i);
                createImageCaption(element, sectionImages[i], figCitationFormat);
                break;
            }
        }
    });
}

/**
 * Helper function to create image caption element
 * Only for internal embeds (local files)
 */
function createImageCaption(element: Element, image: ImageMatch, figCitationFormat: string): void {
    const captionDiv = document.createElement('div');
    captionDiv.className = 'em-image-caption';

    // First line: Fig. X.X title
    if (image.tag || image.title) {
        const titleLine = document.createElement('div');
        titleLine.className = 'em-image-caption-title';

        let titleText = '';
        if (image.tag) {
            const figLabel = figCitationFormat.replace('#', image.tag);
            titleText = figLabel;
        }
        if (image.title) {
            titleText += (titleText ? ' ' : '') + image.title;
        }

        titleLine.textContent = titleText;
        captionDiv.appendChild(titleLine);
    }

    // Second line: description
    if (image.desc) {
        const descLine = document.createElement('div');
        descLine.className = 'em-image-caption-desc';
        descLine.textContent = image.desc;
        captionDiv.appendChild(descLine);
    }

    // Append to internal embed element
    element.appendChild(captionDiv);
}
