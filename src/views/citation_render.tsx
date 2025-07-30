import { EditorSelection, Prec, RangeSetBuilder } from "@codemirror/state";
import { EditorView, WidgetType, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import {  MarkdownPostProcessorContext, Notice } from "obsidian";
import Debugger from "@/debug/debugger";
import { EquationCitatorSettings } from "@/settings/settingsTab";
import { escapeRegExp } from "@/utils/string_utils";
import { editorInfoField, MarkdownView } from "obsidian";
import {
    splitFileCitation,
    combineContinuousEquationTags
} from "@/utils/citation_utils";
import { CitationCache } from "@/cache/citationCache";
import { EquationRef, parseCitationsInMarkdown } from "@/utils/citation_utils";


const DISABLED_DELIMITER = `§¶∞&#&@∸∹≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≇≈≉≊≋≌≍≎≏⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱`

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

// Shared rendering function for both modes
function renderEquationCitation(
    citeEquationTags: string[],
    settings: EquationCitatorSettings,
    isInteractive: boolean = false
): HTMLElement {
    const el = document.createElement('span');
    const fileCiteDelimiter = settings.enableCrossFileCitation ?
        settings.fileCiteDelimiter || '^' :
        DISABLED_DELIMITER;

    // set render format for the equation
    const formatedCiteEquationTags = settings.enableContinuousCitation ?
        combineContinuousEquationTags(
            citeEquationTags,
            settings.continuousRangeSymbol || '~',
            settings.continuousDelimiters.split(' ').filter(d => d.trim()),
            fileCiteDelimiter
        )
        : citeEquationTags;

    const renderedCitations: string[] = [];

    // render equation parts
    for (const tag of formatedCiteEquationTags) {
        // replace # in render format with the tag number 
        const { local, crossFile } = splitFileCitation(tag, fileCiteDelimiter);
        const citationSpan = document.createElement('span');
        citationSpan.className = 'em-math-citation';

        if (crossFile) {
            // Create citation with superscript bracket for cross-file references
            const localCitation = settings.citationFormat.replace('#', local);
            citationSpan.textContent = localCitation;

            // Create superscript bracket
            const superscript = document.createElement('sup');
            superscript.textContent = `[${crossFile}]`;
            superscript.className = "em-math-citation-file-superscript";
            citationSpan.appendChild(superscript);
        } else {
            // Regular citation without cross-file reference
            citationSpan.textContent = settings.citationFormat.replace('#', local);
        }

        const tempDiv = document.createElement('div');
        tempDiv.appendChild(citationSpan);
        renderedCitations.push(tempDiv.innerHTML);
    }

    // Set innerHTML instead of textContent to preserve HTML formatting
    el.innerHTML = renderedCitations.join(settings.multiCitationDelimiter + ' ' || ', ');
    return el;
}

export class EquationCitationWidget extends WidgetType {
    public citeEquationTags: string[];
    constructor(
        citeEquationTags: string[],
        public range: { from: number; to: number },
        private settings: EquationCitatorSettings
    ) {
        super();
        this.citeEquationTags = citeEquationTags.map(t => t.trim());
    }

    eq(other: EquationCitationWidget) {
        return this.citeEquationTags === other.citeEquationTags &&
            this.range.from === other.range.from &&
            this.range.to === other.range.to;
    }

    toDOM(view: EditorView): HTMLElement {
        const el = renderEquationCitation(this.citeEquationTags, this.settings, true);

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

        return el;
    }

    ignoreEvent() {
        return false;
    }
}

/**
 * Live Preview Extension (CodeMirror ViewPlugin) for render equation in editor   
 * @param settings 
 * @returns 
 */
export function createMathCitationExtension(settings: EquationCitatorSettings) {
    return Prec.high(ViewPlugin.fromClass(class {
        decorations: DecorationSet;
        citePattern: RegExp;
        lastPrefix: string;
        lastUpdate = 0;
        pendingUpdate = false;
        lastCursorPos = -1;

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
            const selection = state.selection.main;
            const sourceMode = isSourceMode(view);

            syntaxTree(state).iterate({
                enter: (node) => {
                    const t = node.type.name;
                    if (t.includes("math-begin") && !t.includes("math-block")) {
                        currentEqRange = { from: node.from, to: -1 };
                    } else if (currentEqRange && currentEqRange.to === -1 && t.includes("math-end") && !t.includes("math-block")) {
                        currentEqRange.to = node.to;
                        const inCursor = cursorPos >= currentEqRange.from && cursorPos <= currentEqRange.to;
                        const inSelection = selection.from < currentEqRange.to && selection.to > currentEqRange.from;
                        const text = state.sliceDoc(currentEqRange.from, currentEqRange.to);
                        const matches = [...text.matchAll(this.citePattern)];
                        const hasEquationCitation = matches && matches.length === 1;
                        const modeRender = !sourceMode || (sourceMode && settings.enableCitationInSourceMode);

                        if (hasEquationCitation && modeRender && !inSelection && !inCursor) {
                            const eqNumbers: string[] = matches[0][1].split(settings.multiCitationDelimiter || ',');
                            // Debugger.log("Render Equation citation:", eqNumbers); 
                            builder.add(
                                currentEqRange.from,
                                currentEqRange.to,
                                Decoration.replace({
                                    widget: new EquationCitationWidget(eqNumbers, currentEqRange, settings)
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
    }));
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
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    citationCache: CitationCache,
    settings: EquationCitatorSettings
): Promise<void> {

    const printingMode = (Boolean(el.querySelector("div.print > *")) || Boolean(el.querySelector("div.slides > *")));
    if (printingMode && !settings.enableInPdfExport) {
        Debugger.log("Skip rendering equation citation in PDF print mode");
        return;   // skip rendering in PDF print mode if not enabled in settings
    }

    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;

    const allEquations: EquationRef[] | undefined = await citationCache.getCitationsForFile(ctx.sourcePath)
    if (!allEquations) return; // no citations found for this file

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
    const equations = allEquations.filter(eq =>
        eq.line >= sectionInfo.lineStart && eq.line <= sectionInfo.lineEnd
    )
    if (citeSpans.length === equations.length) {
        // render equation citation for each math span
        Debugger.log(`Render ${equations.length} equation citations from line ${sectionInfo.lineStart} to ${sectionInfo.lineEnd}`)

        const fullCitationPattern = `\\\\ref\\{${escapeRegExp(settings.citationPrefix)}([^}]+)\\}`;
        citeSpans.forEach((span, index) => {
            const match = equations[index].fullMatch.match(fullCitationPattern);
            if (match) {
                const eqNumbers: string[] = match[1].split(settings.multiCitationDelimiter || ',').map(t => t.trim());
                const citationWidget = renderEquationCitation(eqNumbers, settings);
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

// Utility functions
function isSourceMode(view: EditorView): boolean {
    const mdView = view.state.field(editorInfoField, false) as MarkdownView | undefined;
    const currentMode = mdView?.currentMode;
    // @ts-ignore
    return currentMode?.sourceMode ? true : false;
}

//////////////////////////  PDF  print element  ////////////////////////  

/**
 * @note
 * Since the original PDF rendering function is not accessible,
 * and patching it is potentially unstable, we adopt the following
 * approach to render equation citations during PDF export:
 * 
 * 1. Match citation patterns in the original markdown content
 * 2. Store the original content, and replace citations with HTML elements
 * 3. Export the file to PDF
 * 4. Restore the original markdown content
 * 
 * This is admittedly a workaround—not elegant, and somewhat crude—
 *  but it is effective and stable in most practical cases.
 */
/**
 * Enhanced PDF processing function that replaces citations with HTML format
 * and adds navigation features for equations and cross-file references
 */
export function processPrintMarkdown(md: string, settings: EquationCitatorSettings): string {
    let processedMd = md;
    
    // Step 1: Parse citations in the markdown
    const citations = parseCitationsInMarkdown(md);
    if (citations.length === 0) return md;
    
    // Step 2: Find and wrap equation blocks with IDs
    processedMd = wrapEquationBlocks(processedMd);
    
    // Step 3: Replace citations with HTML format
    processedMd = replaceCitationsWithHTML(processedMd, citations, settings);
    
    // Step 4: Add footnotes for cross-file references
    processedMd = addCrossFileFootnotes(processedMd, citations, settings);
    
    return processedMd;
}

/**
 * Wraps equation blocks ($$...$$) with div containers that have unique IDs
 */
function wrapEquationBlocks(md: string): string {
    const lines = md.split('\n');
    const result: string[] = [];
    let inEquationBlock = false;
    let equationCounter = 1;
    let currentEquation: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (trimmedLine === '$$' && !inEquationBlock) {
            // Start of equation block
            inEquationBlock = true;
            currentEquation = [];
            result.push(`<div id="eq-block-${equationCounter}" class="em-equation-block-print">`);
            result.push(line);
        } else if (trimmedLine === '$$' && inEquationBlock) {
            // End of equation block
            inEquationBlock = false;
            result.push(line);
            result.push('</div>');
            equationCounter++;
        } else {
            result.push(line);
        }
    }
    
    return result.join('\n');
}

/**
 * Replaces \ref{} citations with HTML format for PDF rendering
 */
function replaceCitationsWithHTML(
    md: string, 
    citations: EquationRef[], 
    settings: EquationCitatorSettings
): string {
    let processedMd = md;
    const fileCiteDelimiter = settings.enableCrossFileCitation ? 
        settings.fileCiteDelimiter || '^' : DISABLED_DELIMITER;
    
    // Process citations in reverse order to maintain string positions
    const sortedCitations = [...citations].sort((a, b) => b.line - a.line);
    
    for (const citation of sortedCitations) {
        const lines = processedMd.split('\n');
        const line = lines[citation.line];
        
        if (!line) continue;
        
        // Find the citation pattern in the line
        const fullCitationPattern = new RegExp(
            `\\$([^$]*?)\\\\ref\\{${escapeRegExp(settings.citationPrefix)}([^}]+)\\}([^$]*?)\\$`,
            'g'
        );
        
        const newLine = line.replace(fullCitationPattern, (match, beforeRef, citationContent, afterRef) => {
            // Only replace if this is a single \ref{} in the math expression
            const refCount = (match.match(/\\ref\{/g) || []).length;
            if (refCount !== 1) return match;
            
            // Parse citation tags
            const eqNumbers: string[] = citationContent.split(settings.multiCitationDelimiter || ',')
                .map(t => t.trim());
            
            // Apply continuous citation formatting if enabled
            const formattedCiteEquationTags = settings.enableContinuousCitation ?
                combineContinuousEquationTags(
                    eqNumbers,
                    settings.continuousRangeSymbol || '~',
                    settings.continuousDelimiters.split(' ').filter(d => d.trim()),
                    fileCiteDelimiter
                ) : eqNumbers;
            
            // Generate HTML for citations
            const citationHTML = generateCitationHTML(formattedCiteEquationTags, settings, fileCiteDelimiter);
            
            // Return the math expression with HTML citation
            const beforePart = beforeRef.trim() ? `$${beforeRef}$` : '';
            const afterPart = afterRef.trim() ? `$${afterRef}$` : '';
            
            return `${beforePart}${citationHTML}${afterPart}`.replace(/\$\$+/g, '$');
        });
        
        lines[citation.line] = newLine;
        processedMd = lines.join('\n');
    }
    
    return processedMd;
}

/**
 * Generates HTML for citation rendering in PDF
 */
function generateCitationHTML(
    citeEquationTags: string[], 
    settings: EquationCitatorSettings,
    fileCiteDelimiter: string
): string {
    const renderedCitations: string[] = [];
    
    for (const tag of citeEquationTags) {
        const { local, crossFile } = splitFileCitation(tag, fileCiteDelimiter);
        
        if (crossFile) {
            // Citation with cross-file reference
            const localCitation = settings.citationFormat.replace('#', local);
            const linkHTML = `<a href="#eq-${local.replace(/\./g, '-')}" class="em-math-citation-print">${localCitation}</a>`;
            const superscriptHTML = `<sup><a href="#footnote-${crossFile}" class="em-math-citation-file-superscript-print">[${crossFile}]</a></sup>`;
            
            renderedCitations.push(`<span class="em-math-citation-container-print">${linkHTML}${superscriptHTML}</span>`);
        } else {
            // Regular in-file citation
            const localCitation = settings.citationFormat.replace('#', local);
            const linkHTML = `<a href="#eq-${local.replace(/\./g, '-')}" class="em-math-citation-print">${localCitation}</a>`;
            
            renderedCitations.push(`<span class="em-math-citation-container-print">${linkHTML}</span>`);
        }
    }
    
    return renderedCitations.join(settings.multiCitationDelimiter + ' ' || ', ');
}

/**
 * Adds footnotes for cross-file references at the end of the document
 */
function addCrossFileFootnotes(
    md: string, 
    citations: EquationRef[], 
    settings: EquationCitatorSettings
): string {
    if (!settings.enableCrossFileCitation) return md;
    
    const fileCiteDelimiter = settings.fileCiteDelimiter || '^';
    const crossFileRefs = new Map<string, string>();
    
    // Collect all cross-file references
    for (const citation of citations) {
        const eqNumbers: string[] = citation.label.split(settings.multiCitationDelimiter || ',')
            .map(t => t.trim());
        
        for (const eqNum of eqNumbers) {
            const { crossFile } = splitFileCitation(eqNum, fileCiteDelimiter);
            if (crossFile && !crossFileRefs.has(crossFile)) {
                // You might want to resolve the actual filename from the crossFile number
                // For now, using a placeholder - you can implement file resolution logic
                crossFileRefs.set(crossFile, `Reference File ${crossFile}`);
            }
        }
    }
    
    if (crossFileRefs.size === 0) return md;
    
    // Add footnotes section
    let footnotesSection = '\n\n---\n\n### References\n\n';
    
    for (const [fileNum, fileName] of crossFileRefs) {
        footnotesSection += `<div id="footnote-${fileNum}">[^${fileNum}]: ${fileName}</div>\n`;
    }
    
    return md + footnotesSection;
}

/**
 * Inject PDF citation styles into the document head
 */
export function injectPDFStyles(): void {
    const existingStyle = document.getElementById('em-pdf-citation-styles');
    if (existingStyle) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'em-pdf-citation-styles';
    styleElement.innerHTML = PDF_CITATION_STYLES.replace(/<\/?style>/g, '');
    document.head.appendChild(styleElement);
}

/**
 * Remove PDF citation styles from the document head
 */
export function removePDFStyles(): void {
    const styleElement = document.getElementById('em-pdf-citation-styles');
    if (styleElement) {
        styleElement.remove();
    }
}

/**
 * Enhanced styles for PDF rendering
 */
export const PDF_CITATION_STYLES = `
<style>
.em-math-citation-print,
.em-math-citation-container-print {
    font-family: "Latin Modern Roman", "Latin Modern Math", "CMU Serif", "Computer Modern", serif;
    color: #000000 !important;
    text-decoration: none;
}

.em-math-citation-print:hover {
    text-decoration: underline;
}

.em-math-citation-file-superscript-print {
    font-family: "Latin Modern Roman", "Latin Modern Math", "CMU Serif", "Computer Modern", serif;
    font-size: 0.7em;
    vertical-align: super;
    margin-left: 1px;
    color: #000000 !important;
    text-decoration: none;
}

.em-math-citation-file-superscript-print:hover {
    text-decoration: underline;
}

.em-equation-block-print {
    position: relative;
    margin: 10px 0;
}

.em-equation-block-print::before {
    content: "";
    position: absolute;
    left: -20px;
    top: 0;
    width: 2px;
    height: 100%;
    background-color: #f0f0f0;
}

@media print {
    .em-math-citation-print,
    .em-math-citation-file-superscript-print,
    .em-math-citation-container-print {
        color: #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    
    .em-equation-block-print::before {
        display: none;
    }
}
</style>`;