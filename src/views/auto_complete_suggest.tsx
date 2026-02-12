import { EditorSuggest, Editor, EditorPosition, EditorSuggestTriggerInfo, TFile, EditorSuggestContext, MarkdownView, Component } from "obsidian";
import { RenderedEquation } from "@/services/equation_services";
import { RenderedFigure } from "@/services/figure_services";
import { RenderedCallout } from "@/services/callout_services";
import { findLastUnescapedDollar, isInInlineMathEnvironment, isInInlineCodeEnvironment, removePairedBraces } from "@/utils/string_processing/string_utils";
import { renderEquationWrapper, TargetElComponent } from "@/views/popovers/citation_popover";
import { renderFigureWrapper } from "./popovers/figure_citation_popover";
import { isSourceMode } from "@/utils/workspace/workspace_utils";
import { createCitationString, inlineMathPattern, isCodeBlockToggle, isValidCitationForm, CITATION_PADDING } from "@/utils/string_processing/regexp_utils";
import EquationCitator from "@/main";
import { extractLastNumberFromTag, extractPrefixBeforeLastNumber } from "@/utils/parsers/equation_parser";
import { splitFileCitation } from "@/utils/core/citation_utils";
import Debugger from "@/debug/debugger";




type CitationType = 'equation' | 'figure' | 'callout';
type CitationItem = RenderedEquation | RenderedFigure | RenderedCallout;

interface MathEnvironmentInfo {
    line: string;        // line content
    lastDollarIndex: number;
    eqContent: string;   // content in ref{...}, e.g. "eq1" 
    eqStart: number;     // start and end position of the equation in the line  
    eqEnd: number;       // 
}

interface CitationParseResult {
    valid: boolean;
    citationIndex: number;
    fullLabel: string;
    currentLabel: string;   // label before cursor without prefix, used for suggestion filtering
    fullTags: string[];     // all tags in the citation, split by multiCitationDelimiter
    currentTags: string[];
    citationType: CitationType | null;  // detected citation type 
    citationPrefix: string | null;  // The actual prefix found (e.g., "eq:", "fig:", "table:")
}

export class AutoCompleteSuggest extends EditorSuggest<CitationItem> {
    inCodeBlockState = false; // whether the cursor is inside a code block or not
    currentCursorLine: number; // only update codeblock state when cursor line change
    lastCodeBlockStateUpdateTime = 0; // update codeblock state when last update time is more than 300ms
    private suggestionComponents: TargetElComponent[] = [];
    private currentCitationType: CitationType | null = null; // Track current citation type
    private currentCitationPrefix: string = ''; // Track current citation prefix
    private currentCitationLabel: string = ''; // Track current citation label

    constructor(
        private readonly plugin: EquationCitator
    ) {
        super(plugin.app);
    }

    onClose(): void {
        // Clean up all suggestion components when the suggest closes
        this.suggestionComponents.forEach(component => component.unload());
        this.suggestionComponents = [];
    }

    /**
     * refresh in code block state when cursor line change
     */
    private refreshInCodeBlockState(editor: Editor, cursor: EditorPosition): void {
        const lines = editor.getValue().split("\n");
        let isInCodeBlock = false;
        for (let i = 0; i < cursor.line; i++) {
            const line = lines[i];
            if (isCodeBlockToggle(line)) {
                isInCodeBlock = !isInCodeBlock;
            }
        }
        this.inCodeBlockState = isInCodeBlock;
    }

    /**
     *  get math environment info from line and cursor position, 
     *  including last dollar index, equation content, equation start and end position, and line content
     * @param editor 
     * @param cursor 
     * @returns 
     */
    private getMathEnvironmentInfo(editor: Editor, cursor: EditorPosition): MathEnvironmentInfo | null {
        const line = editor.getLine(cursor.line);
        const lastDollarIndex = findLastUnescapedDollar(line, cursor.ch);

        if (lastDollarIndex === -1) return null;

        const linePart = line.substring(lastDollarIndex);
        const mathPattern = new RegExp(inlineMathPattern.source);
        const match = new RegExp(mathPattern).exec(linePart);

        if (!match) return null;
        const eqContent = match[1];
        const eqStart = lastDollarIndex + 1;
        const eqEnd = eqStart + eqContent.length;

        return {
            lastDollarIndex,
            eqContent,
            eqStart,
            eqEnd,
            line
        };
    }

    /**
     * Parses citation information from the provided equation content string, extracting details
     * about the citation label and tags at the current cursor position.
     * 
     * Here we use cursorCh and eqStart parameter is just for the convenience of calling, it 
     *    can also be reduced to 1 parameter. 
     *
     * @param eqContent - The equation content string to parse for citation information.
     * @param cursorCh - The character index of the cursor of the current line.
     * @param eqStart - The starting character index of the equation of the current line.
     * @returns An object containing the validity of the citation, citation index, full and current labels,
     *          arrays of full and current tags, citation type, and citation prefix.
     */
    private parseCitationInfo(
        eqContent: string,
        cursorCh: number,
        eqStart: number,
    ): CitationParseResult {
        const invalidResult: CitationParseResult = {
            valid: false,
            citationIndex: -1,
            fullLabel: "",
            currentLabel: "",
            fullTags: [],
            currentTags: [],
            citationType: null,
            citationPrefix: null,
        };
        const { citationPrefix, multiCitationDelimiter, figCitationPrefix, calloutCitationPrefixes } = this.plugin.settings;
        const { valid, label, index } = isValidCitationForm(eqContent, null);

        // skip the "\\ref{" prefix length using CITATION_PADDING constant
        const cursorPadding = cursorCh - eqStart;
        const refLengthBeforeCursor = cursorPadding - (index + CITATION_PADDING);
        if (!valid || label === null || index === -1 || refLengthBeforeCursor < 0) {
            return invalidResult;
        }
        // Detect citation type from the prefix inline
        let detectedType: CitationType | null = null;
        let detectedPrefix: string = citationPrefix;

        if (label.startsWith(citationPrefix)) {
            detectedType = 'equation';
            detectedPrefix = citationPrefix;
        } else if (label.startsWith(figCitationPrefix)) {
            detectedType = 'figure';
            detectedPrefix = figCitationPrefix;
        } else {
            // Check for callout citation
            for (const calloutPrefix of calloutCitationPrefixes) {
                if (label.startsWith(calloutPrefix.prefix)) {
                    detectedType = 'callout';
                    detectedPrefix = calloutPrefix.prefix;
                    break;
                }
            }
        }
        if (!detectedType) return invalidResult; // No valid prefix found, return invalid result

        // Remove the detected prefix from the label
        let fullLabel = label.substring(detectedPrefix.length);
        const spacesBeforeLabel = eqContent.substring(index + CITATION_PADDING, cursorPadding).indexOf(detectedPrefix)
        const currentLabelLengthWithPrefix = refLengthBeforeCursor - spacesBeforeLabel;
        if (currentLabelLengthWithPrefix < detectedPrefix.length) {
            return invalidResult;
        }
        const currentLabel = label.substring(detectedPrefix.length, currentLabelLengthWithPrefix)

        console.log("Full label:", fullLabel, "Current label:", currentLabel);
        const delimiter = multiCitationDelimiter || ",";
        const fullTags = fullLabel.split(delimiter).map(tag => tag.trim()).filter(Boolean);
        const currentTags = currentLabel.split(delimiter).map(tag => tag.trim()).filter(Boolean);

        // current label should be a subset of full label
        if (fullTags.length < currentTags.length) {
            Debugger.log(`Invalid current label length ${currentTags.length} is bigger than full tags length ${fullTags.length};` +
                `Current label: ${currentLabel}, Full label: ${fullLabel}`)
        }

        return {
            valid: true,
            citationIndex: index,
            fullLabel,
            currentLabel,
            fullTags,
            currentTags,
            citationType: detectedType,
            citationPrefix: detectedPrefix
        };
    }

    /**
     * Test if the trigger should be triggered in the current environment. 
     */
    private shouldTriggerInEnvironment(line: string, cursor: EditorPosition): boolean {
        const { enableCiteWithCodeBlockInCallout } = this.plugin.settings;

        if (this.inCodeBlockState) return false;

        const isQuoteLine = /^\s*>/.test(line);
        const acceptInlineCode = isQuoteLine && enableCiteWithCodeBlockInCallout;
        const inCodeEnv = isInInlineCodeEnvironment(line, cursor.ch);
        const inMathEnv = isInInlineMathEnvironment(line, cursor.ch);

        return inMathEnv || (acceptInlineCode && inCodeEnv);
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        const {
            multiCitationDelimiter,
            enableCitationInSourceMode
        } = this.plugin.settings;
        // judge if it's source mode or not
        const mdView = this.plugin.app.workspace.activeEditor?.editor;
        if (!mdView) return null;

        const cm = editor.cm;
        if (isSourceMode(cm) && !enableCitationInSourceMode) return null;

        // refresh the code block state (while prevent refresh too frequently)
        if (Date.now() - this.lastCodeBlockStateUpdateTime > 300) {
            this.refreshInCodeBlockState(editor, cursor); // update codeblock state
            this.lastCodeBlockStateUpdateTime = Date.now();
        }

        const line = editor.getLine(cursor.line);  // get the line before the cursor
        if (!this.shouldTriggerInEnvironment(line, cursor)) return null;

        const mathInfo = this.getMathEnvironmentInfo(editor, cursor);
        if (!mathInfo) return null;

        // Use parseCitationInfo to get all information about the citation.
        const citationInfo = this.parseCitationInfo(mathInfo.eqContent, cursor.ch, mathInfo.lastDollarIndex + 1);

        if (!citationInfo.valid || !citationInfo.citationType || !citationInfo.citationPrefix) return null;

        // Store the detected citation type and prefix for use in getSuggestions
        this.currentCitationType = citationInfo.citationType;
        this.currentCitationPrefix = citationInfo.citationPrefix;
        this.currentCitationLabel = citationInfo.currentLabel;

        // Use the current label from citationInfo
        const isNewTag = citationInfo.currentLabel.trim().endsWith(multiCitationDelimiter);
        const lastTag = isNewTag ? "" : (citationInfo.currentTags.at(-1) ?? "");

        // if there is tag, and also the lastTag ends with space, stop suggesting
        if (citationInfo.currentLabel !== "" && lastTag.endsWith(" ")) return null;

        const eqPos = citationInfo.citationIndex + mathInfo.lastDollarIndex + 1;
        return {
            start: {
                line: cursor.line,
                ch: eqPos,
            },
            end: cursor,
            query: lastTag.trim(), // use last tag of citation for suggestion
        }
    }

    async getSuggestions(context: EditorSuggestContext): Promise<CitationItem[]> {
        const lastTag = context.query;  // last tag for suggestion
        const cleanedTag = removePairedBraces(lastTag); // remove paired braces and trim space

        if (cleanedTag.contains("}")) return [];  // closed citation, do not suggest
        const sourcePath = context.file?.path || null;
        if (!sourcePath) return [];

        const { enableContinuousCitation, continuousRangeSymbol, continuousDelimiters } = this.plugin.settings;

        // Handle continuous citation for all types
        if (enableContinuousCitation && cleanedTag.endsWith(continuousRangeSymbol) && cleanedTag.length > 1) {
            const validDelimiters = continuousDelimiters.split(" ").filter(Boolean); // split by space and remove empty string
            const tagPrev = cleanedTag.slice(0, -continuousRangeSymbol.length).trim();
            // then get the prefix before last number
            const prefix = extractPrefixBeforeLastNumber(tagPrev, validDelimiters);
            const lastNumber = extractLastNumberFromTag(tagPrev, validDelimiters);
            if (prefix === "" || lastNumber === null) return []; // no valid prefix, do not suggest anything

            // Fetch all items of the current type
            let items: CitationItem[];
            switch (this.currentCitationType) {
                case 'equation':
                    items = await this.plugin.equationServices.getEquationsForAutocomplete(prefix, sourcePath);
                    break;
                case 'figure':
                    items = await this.plugin.figureServices.getFiguresForAutocomplete(prefix, sourcePath);
                    break;
                case 'callout':
                    items = await this.plugin.calloutServices.getCalloutsForAutocomplete(prefix, this.currentCitationPrefix, sourcePath);
                    break;
                default:
                    return [];
            }

            // Filter to show only items with numbers greater than the last one
            return items.filter(item => {
                const itemTag = 'tag' in item ? item.tag : '';
                const itemLastNumber = extractLastNumberFromTag(itemTag, validDelimiters);
                return itemLastNumber !== null && itemLastNumber > lastNumber;
            });
        }

        // Fetch suggestions based on citation type
        switch (this.currentCitationType) {
            case 'equation':
                return await this.plugin.equationServices.getEquationsForAutocomplete(
                    cleanedTag.trim(),
                    sourcePath
                );

            case 'figure':
                return await this.plugin.figureServices.getFiguresForAutocomplete(
                    cleanedTag.trim(),
                    sourcePath
                );

            case 'callout':
                return await this.plugin.calloutServices.getCalloutsForAutocomplete(
                    cleanedTag.trim(),
                    this.currentCitationPrefix, // Pass the specific callout prefix
                    sourcePath
                );

            default:
                return [];
        }
    }

    renderSuggestion(value: CitationItem, el: HTMLElement): void {
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || null;
        if (!sourcePath) return;
        el.addClass("em-equation-option-container");
        const targetEl = el.createDiv();
        // Create a new component for each suggestion and track it for cleanup
        const targetComponent = new TargetElComponent(targetEl);
        this.suggestionComponents.push(targetComponent);
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        // Render based on citation type
        switch (this.currentCitationType) {
            case 'equation':
                void renderEquationWrapper(this.plugin, view.leaf, sourcePath, value as RenderedEquation, el, targetComponent);
                break;
            case 'figure':
                void this.renderFigureSuggestion(value as RenderedFigure, el, targetComponent);
                break;
            case 'callout':
                // For callouts, display tag and type
                void this.renderCalloutSuggestions(value as RenderedCallout, el, targetComponent);
                break;
        }
    }

    async renderFigureSuggestion(figure: RenderedFigure, container: HTMLElement, targetComponent: Component): Promise<void> {
        // For figures, display tag and title
        const { enableRichAutoComplete } = this.plugin.settings;

        if (enableRichAutoComplete) {
        }
        else {
            const figContainer = container.createDiv();
            figContainer.addClass("em-figure-autocomplete-item");
            const figLabel = figContainer.createSpan();
            figLabel.addClass("em-autocomplete-label");
            figLabel.textContent = `${this.plugin.settings.figCitationFormat.replace('#', figure.tag)}`;
            if (figure.title) {
                const figTitle = figContainer.createSpan();
                figTitle.addClass("em-autocomplete-title");
                figTitle.textContent = ` - ${figure.title}`;
            }
        }

    }

    async renderCalloutSuggestions(value: RenderedCallout, container: HTMLElement, targetComponent: Component): Promise<void> {
        const callout = value;
        const calloutContainer = container.createDiv();
        calloutContainer.addClass("em-callout-autocomplete-item");
        const calloutLabel = calloutContainer.createSpan();
        calloutLabel.addClass("em-autocomplete-label");
        const prefixConfig = this.plugin.settings.calloutCitationPrefixes.find(p => p.prefix === callout.prefix);
        const format = prefixConfig?.format || `${callout.type}. #`;
        calloutLabel.textContent = format.replace('#', callout.tag);
    }

    selectSuggestion(value: CitationItem, evt: MouseEvent | KeyboardEvent): void {
        const {
            multiCitationDelimiter,
            enableCrossFileCitation,
            fileCiteDelimiter,
            enableContinuousCitation,
            continuousRangeSymbol,
            continuousDelimiters,
        } = this.plugin.settings;
        const validDelimiters = continuousDelimiters.split(" ").filter(Boolean); // split by space and remove empty string

        const editor = this.context?.editor;
        if (!this.context || !editor) return;

        const cursor = editor.getCursor();

        const mathInfo = this.getMathEnvironmentInfo(editor, cursor);
        if (!mathInfo) return;
        const citationInfo = this.parseCitationInfo(mathInfo.eqContent, cursor.ch, mathInfo.eqStart);
        if (!citationInfo.valid) return;

        // Get the tag from the value based on type
        const itemTag = 'tag' in value ? value.tag : '';
        const footnoteIndex = 'footnoteIndex' in value ? value.footnoteIndex : null;

        // ======== begin creating new tags for citation complete ======================
        const lastTag = this.context.query;  // last tag for suggestion
        const isRangeContinuation = lastTag.endsWith(continuousRangeSymbol) && lastTag.length > 1;
        let newTag: string;

        // Handle continuous citation for all types
        if (isRangeContinuation && enableContinuousCitation) {
            // infer next number from chosen item
            const basePart = lastTag.slice(0, -continuousRangeSymbol.length);
            const nextNum = extractLastNumberFromTag(itemTag, validDelimiters);
            if (nextNum === null) return; // should not happen
            // parse local part
            const local = enableCrossFileCitation ? splitFileCitation(basePart, fileCiteDelimiter).local : itemTag;
            newTag = footnoteIndex
                ? `${footnoteIndex}${fileCiteDelimiter}{${local}${continuousRangeSymbol}${nextNum}}`
                : `${local}${continuousRangeSymbol}${nextNum}`;
        } else {
            newTag = footnoteIndex
                ? `${footnoteIndex}${fileCiteDelimiter}{${itemTag}}`
                : itemTag;
        }
        const newTagIdx = lastTag ? citationInfo.currentTags.length - 1 : citationInfo.currentTags.length;

        if (lastTag === "") {
            // if last tag is empty, insert new tag at correct position; or replace last tag(on cursor) with new tag
            citationInfo.currentTags.splice(newTagIdx, 0, newTag);
            citationInfo.fullTags.splice(newTagIdx, 0, newTag);
        } else {
            citationInfo.currentTags[newTagIdx] = newTag;
            citationInfo.fullTags[newTagIdx] = newTag;
        }
        const eqDelimiter = multiCitationDelimiter + " " || ", ";

        // Use the detected citation prefix instead of hardcoded citationPrefix
        const newContent = createCitationString(this.currentCitationPrefix, `${citationInfo.fullTags.join(eqDelimiter)}, `, false);
        const cursorContent = String.raw`\ref{${this.currentCitationPrefix}${citationInfo.currentTags.join(eqDelimiter)}, `;
        const replaceStart = {
            line: this.context.start.line,
            ch: mathInfo.eqStart
        }
        const replaceEnd = {
            line: cursor.line,
            ch: mathInfo.eqEnd
        };

        editor.replaceRange(newContent, replaceStart, replaceEnd);
        const newCursorPos = {
            line: this.context.start.line,
            ch: mathInfo.lastDollarIndex + 1 + cursorContent.length,
        };
        editor.setCursor(newCursorPos);
    }
}

