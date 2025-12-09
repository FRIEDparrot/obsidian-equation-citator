import { EditorSuggest, Editor, EditorPosition, EditorSuggestTriggerInfo, TFile, EditorSuggestContext, MarkdownView } from "obsidian";
import { RenderedEquation } from "@/services/equation_services";
import { findLastUnescapedDollar, isInInlineMathEnvironment, isInInlineCodeEnvironment, removePairedBraces } from "@/utils/string_processing/string_utils";
import { renderEquationWrapper, TargetElComponent } from "@/views/popovers/citation_popover";
import { isSourceMode } from "@/utils/workspace/workspace_utils";
import { createCitationString, inlineMathPattern, isCodeBlockToggle, isValidCitationForm } from "@/utils/string_processing/regexp_utils";
import EquationCitator from "@/main";
import assert from "assert";
import { extractLastNumberFromTag, extractPrefixBeforeLastNumber } from "@/utils/parsers/equation_parser";
import { splitFileCitation } from "@/utils/core/citation_utils";


const CITATION_PADDING = 5; // \\ref{ is 5 characters  

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
    currentLabel: string;
    fullTags: string[];
    currentTags: string[];
}

export class AutoCompleteSuggest extends EditorSuggest<RenderedEquation> {
    inCodeBlockState = false; // whether the cursor is inside a code block or not 
    currentCursorLine: number; // only update codeblock state when cursor line change 
    lastCodeBlockStateUpdateTime = 0; // update codeblock state when last update time is more than 300ms
    private suggestionComponents: TargetElComponent[] = [];

    constructor(
        private plugin: EquationCitator
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
        const match = linePart.match(mathPattern);

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
     * @param eqContent - The equation content string to parse for citation information.
     * @param cursorCh - The character index of the cursor within the equation content.
     * @param eqStart - The starting character index of the equation within the document.
     * @returns An object containing the validity of the citation, citation index, full and current labels,
     *          and arrays of full and current tags.
     */
    private parseCitationInfo(
        eqContent: string,
        cursorCh: number,
        eqStart: number,
    ): CitationParseResult {
        const { citationPrefix, multiCitationDelimiter } = this.plugin.settings;
        const check = isValidCitationForm(eqContent + "}", citationPrefix);  // add a } to handle no-close citation case
        if (!check.valid) {
            return { valid: false, citationIndex: -1, fullLabel: "", currentLabel: "", fullTags: [], currentTags: [] };
        }
        // skip the "\\ref{" prefix length using CITATION_PADDING constant
        let fullLabel = eqContent.substring(check.index + CITATION_PADDING, eqContent.length).trim().substring(citationPrefix.length);
        if (fullLabel.endsWith("}")) {
            fullLabel = fullLabel.slice(0, -1).trim(); // remove trailing } if exists
        }
        const currentLabel = eqContent.substring(check.index + CITATION_PADDING, cursorCh - eqStart).trim().substring(citationPrefix.length);

        const delimiter = multiCitationDelimiter || ",";
        const fullTags = fullLabel.split(delimiter).map(tag => tag.trim()).filter(tag => tag);
        const currentTags = currentLabel.split(delimiter).map(tag => tag.trim()).filter(tag => tag);

        assert(
            fullTags.length >= currentTags.length,
            `Invalid current label length ${currentTags.length} is bigger than full tags length ${fullTags.length};` +
            `Current label: ${currentLabel}, Full label: ${fullLabel}`
        );   // current label should be a subset of full label 

        return {
            valid: true,
            citationIndex: check.index,
            fullLabel,
            currentLabel,
            fullTags,
            currentTags
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
            citationPrefix,
            multiCitationDelimiter,
            enableCitationInSourceMode
        } = this.plugin.settings;
        // judge if it's source mode or not 
        const mdView = this.plugin.app.workspace.activeEditor?.editor;
        if (!mdView) return null;

        const cm = editor.cm;
        if (isSourceMode(cm) && !enableCitationInSourceMode) {
            return null; // do not suggest in source mode if not enabled in settings
        }

        // refresh the code block state (while prevent refresh too frequently) 
        if (Date.now() - this.lastCodeBlockStateUpdateTime > 300) {
            this.refreshInCodeBlockState(editor, cursor); // update codeblock state  
            this.lastCodeBlockStateUpdateTime = Date.now();
        }

        const line = editor.getLine(cursor.line);  // get the line before the cursor  
        if (!this.shouldTriggerInEnvironment(line, cursor)) return null;

        const mathInfo = this.getMathEnvironmentInfo(editor, cursor);
        if (!mathInfo) return null;

        // get the equation content before cursor  and check validity by add end } to citation
        const eqContent = line.substring(mathInfo.lastDollarIndex + 1, cursor.ch);
        const check = isValidCitationForm(eqContent + "}", citationPrefix);

        if (!check.valid) return null;  // invalid citation form  

        // get the last tag for suggestion 
        const eqLabel = eqContent.substring(check.index + CITATION_PADDING, eqContent.length).substring(citationPrefix.length);
        const isNewTag = eqLabel.trim().endsWith(multiCitationDelimiter);
        const lastTag = isNewTag ? "" : (eqLabel.split(multiCitationDelimiter || ",").pop() ?? "");

        // if there is tag, and also the lastTag ends with space, stop suggesting
        if (eqLabel !== "" && lastTag.endsWith(" ")) return null;

        const eqPos = check.index + mathInfo.lastDollarIndex + 1;
        return {
            start: {
                line: cursor.line,
                ch: eqPos,
            },
            end: cursor,
            query: lastTag.trim(), // use last tag of citation for suggestion  
        }
    }

    async getSuggestions(context: EditorSuggestContext): Promise<RenderedEquation[]> {
        const lastTag = context.query;  // last tag for suggestion 
        const cleanedTag = removePairedBraces(lastTag); // remove paired braces and trim space  

        if (cleanedTag.contains("}")) return [];  // closed citation, do not suggest 
        const sourcePath = context.file?.path || null;
        if (!sourcePath) return [];

        const { enableContinuousCitation, continuousRangeSymbol, continuousDelimiters } = this.plugin.settings;

        if (enableContinuousCitation && cleanedTag.endsWith(continuousRangeSymbol) && cleanedTag.length > 1) {
            const validDelimiters = continuousDelimiters.split(" ").filter(d => d); // split by space and remove empty string
            const tagPrev = cleanedTag.slice(0, -continuousRangeSymbol.length).trim();
            // then get the prefix before last number 
            const prefix = extractPrefixBeforeLastNumber(tagPrev, validDelimiters);
            const lastNumber = extractLastNumberFromTag(tagPrev, validDelimiters);
            if (prefix === "" || lastNumber === null) return []; // no valid prefix, do not suggest anything 
            const equations = await this.plugin.equationServices.getEquationsForAutocomplete(
                prefix,   // last tag may contain space, remove it 
                sourcePath
            );
            return equations.filter(eq => {
                const eqLastNumber = extractLastNumberFromTag(eq.tag, validDelimiters);
                return eqLastNumber !== null && eqLastNumber > lastNumber;
            });
        }
        else {
            const equations = await this.plugin.equationServices.getEquationsForAutocomplete(
                cleanedTag.trim(),   // last tag may contain space, remove it 
                sourcePath
            );
            return equations;
        }
    }

    renderSuggestion(value: RenderedEquation, el: HTMLElement): void {
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || null;
        if (!sourcePath) return;
        el.addClass("em-equation-option-container");
        const targetEl = el.createDiv();
        // Create a new component for each suggestion and track it for cleanup
        const targetComponent = new TargetElComponent(targetEl);
        this.suggestionComponents.push(targetComponent);
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;

        void renderEquationWrapper(this.plugin, view.leaf, sourcePath, value, el, targetComponent);
    }

    selectSuggestion(value: RenderedEquation, evt: MouseEvent | KeyboardEvent): void {
        const {
            multiCitationDelimiter,
            enableCrossFileCitation,
            fileCiteDelimiter,
            citationPrefix,
            enableContinuousCitation,
            continuousRangeSymbol,
            continuousDelimiters,
        } = this.plugin.settings;
        const validDelimiters = continuousDelimiters.split(" ").filter(d => d); // split by space and remove empty string 

        const editor = this.context?.editor;
        if (!this.context || !editor) return;

        const cursor = editor.getCursor();

        const mathInfo = this.getMathEnvironmentInfo(editor, cursor);
        if (!mathInfo) return;
        const citationInfo = this.parseCitationInfo(mathInfo.eqContent, cursor.ch, mathInfo.eqStart);
        if (!citationInfo.valid) return;

        // ======== begin creating new tags for citation complete ====================== 
        const lastTag = this.context.query;  // last tag for suggestion 
        const isRangeContinuation = lastTag.endsWith(continuousRangeSymbol) && lastTag.length > 1;
        let newTag: string;
        if (isRangeContinuation && enableContinuousCitation) {
            // infer next number from chosen equation
            const basePart = lastTag.slice(0, -continuousRangeSymbol.length);
            const nextNum = extractLastNumberFromTag(value.tag, validDelimiters);
            if (nextNum === null) return; // should not happen 
            // parse local part 
            const local = enableCrossFileCitation ? splitFileCitation(basePart, fileCiteDelimiter).local : value.tag;
            newTag = value.footnoteIndex
                ? `${value.footnoteIndex}${fileCiteDelimiter}{${local}${continuousRangeSymbol}${nextNum}}`
                : `${local}${continuousRangeSymbol}${nextNum}`;
        } else {
            newTag = value.footnoteIndex
                ? `${value.footnoteIndex}${fileCiteDelimiter}{${value.tag}}`
                : value.tag;
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

        const newContent = createCitationString(citationPrefix, `${citationInfo.fullTags.join(eqDelimiter)}, `, false);
        const cursorContent = `\\ref{${citationPrefix}${citationInfo.currentTags.join(eqDelimiter)}, `;
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

