import { EditorSuggest, Editor, EditorPosition, EditorSuggestTriggerInfo, TFile, EditorSuggestContext } from "obsidian";
import EquationCitator from "@/main";
import { RenderedEquation } from "@/services/equation_services";
import { escapeRegExp, findLastUnescapedDollar, isInInlineMathEnvironment } from "@/utils/string_utils";
import { renderEquationWrapper, TargetElComponent } from "@/views/citation_popover";
import { splitFileCitation } from "@/utils/citation_utils";
import { EditorView } from "@codemirror/view";
import { isSourceMode } from "./citation_render";

export class AutoCompleteSuggest extends EditorSuggest<RenderedEquation> {
    citePattern: RegExp;
    inCodeBlockState = false; // whether the cursor is inside a code block or not 
    currentCursorLine: number; // only update codeblock state when cursor line change 
    lastCodeBlockStateUpdateTime = 0; // update codeblock state when last update time is more than 300ms

    constructor(
        private plugin: EquationCitator
    ) {
        super(plugin.app);
        // define pattern for matching citation 
        this.citePattern = new RegExp(
            `\\\\ref\\{${escapeRegExp(plugin.settings.citationPrefix)}([^}]*)`
        ) // note -> this may match } inside the citation 
    }

    refreshInCodeBlockState(editor: Editor, cursor: EditorPosition): void {
        const lines = editor.getValue().split("\n");
        let isInCodeBlock = false;
        for (let i = 0; i < cursor.line; i++) {
            const line = lines[i];
            const matches = /^\s*(?:>+\s*)*```/.test(line) ? line.match(/```/g) : null;
            if (matches && matches.length % 2 === 1) {
                isInCodeBlock = !isInCodeBlock;
                continue;
            }
        }
        this.inCodeBlockState = isInCodeBlock;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        // judge if it's source mode or not 
        const mdView = this.plugin.app.workspace.activeEditor?.editor;
        if (!mdView) return null;
        
        // @ts-ignore  this actually exists  
        const editorView : EditorView = editor.cm;
        if (!editorView) return null;
        if (isSourceMode(editorView) && !this.plugin.settings.enableCitationInSourceMode) {
            return null; // do not suggest in source mode if not enabled in settings
        }

        // get the line before the cursor
        if (Date.now() - this.lastCodeBlockStateUpdateTime > 300) {
            this.refreshInCodeBlockState(editor, cursor); // update codeblock state  
            this.lastCodeBlockStateUpdateTime = Date.now();
        }
        if (this.inCodeBlockState) {
            return null; // do not suggest inside code block
        }
        const line = editor.getLine(cursor.line);
        if (!isInInlineMathEnvironment(line, cursor.ch)) {
            return null; // do not suggest when not in inline math environment 
        }
        // find the last $ (withoud escape)  
        const lastDollarIndex = findLastUnescapedDollar(line, cursor.ch);
        if (lastDollarIndex === -1) return null; // do not suggest when no $ found
        const eqContent = line.substring(lastDollarIndex + 1, cursor.ch);
        const matches = eqContent.match(this.citePattern);
        if (!matches) return null;
        return {
            start: {
                line: cursor.line,
                ch: cursor.ch - matches[0].length,
            },
            end: cursor,
            query: matches[1],
        }
    }

    async getSuggestions(context: EditorSuggestContext): Promise<RenderedEquation[]> {
        const cursor = context.editor.getCursor();
        const line = context.editor.getLine(context.start.line);
        const lastDollarIndex = findLastUnescapedDollar(line, cursor.ch);
        const eqTag = line.substring(lastDollarIndex + 1, cursor.ch);
        const delimiter = this.plugin.settings.multiCitationDelimiter || ",";
        if (eqTag.contains("}")) return [];  // closed citation, do not suggest 

        const tagContent = eqTag.match(this.citePattern);
        if (!tagContent) return [];  // no citation found, do not suggest 

        const startNewTag = tagContent[1].trim().endsWith(delimiter);
        const lastTag = startNewTag ? "" : tagContent[1].split(delimiter).pop();
        const sourcePath = context.file?.path || null;
        if (lastTag === undefined || !sourcePath) {
            return [];
        }  // no source path found, do not suggest 

        const equations = await this.plugin.equationServices.getEquationsForAutocomplete(
            lastTag.trim(),   // last tag may contain space, remove it 
            sourcePath
        );
        return equations;
    }

    renderSuggestion(value: RenderedEquation, el: HTMLElement): void {
        const sourcePath = this.plugin.app.workspace.getActiveFile()?.path || null;
        if (!sourcePath) return;
        const targetEl = el.createDiv();
        const targetComponent = new TargetElComponent(targetEl);
        renderEquationWrapper(this.plugin, sourcePath, value, el, targetComponent);
    }

    //  when select a rendered equation. 
    selectSuggestion(value: RenderedEquation, evt: MouseEvent | KeyboardEvent): void {
        const delimiter = this.plugin.settings.multiCitationDelimiter || ",";
        const fileDelimiter = this.plugin.settings.fileCiteDelimiter || "^";

        const editor = this.context?.editor;
        if (!editor || !this.context) return;

        const cursor = editor.getCursor();
        const line = editor.getLine(this.context.start.line);
        const lastDollarIndex = findLastUnescapedDollar(line, cursor.ch);
        if (lastDollarIndex === -1) return;
        const eqContent = line.substring(lastDollarIndex + 1, cursor.ch);
        const matches = eqContent.match(this.citePattern);
        if (!matches) return;
        const currentTags = matches[1].trim();
        const startNewTag = currentTags.endsWith(delimiter);
        const lastTag = startNewTag ? "" : currentTags.split(delimiter).pop();
        if (lastTag === undefined) return;

        let newContent: string;
        if (lastTag === "") {
            // directly append the new tag 
            const originTags = currentTags.split(delimiter).join(delimiter + " ");
            newContent = `\\ref{${this.plugin.settings.citationPrefix}${originTags}${value.tag}${delimiter} `
        }
        else {
            const { crossFile } = splitFileCitation(lastTag, fileDelimiter);
            const filePrefix = crossFile ? value.footnoteIndex + fileDelimiter : "";
            const tags = currentTags.split(delimiter);
            tags[tags.length - 1] = filePrefix + value.tag;
            newContent = `\\ref{${this.plugin.settings.citationPrefix}${tags.join(delimiter + " ")}${delimiter} `
        }
        const replaceStart = {
            line: this.context.start.line,
            ch: lastDollarIndex + 1
        }
        const replaceEnd = {
            line: cursor.line,
            ch: cursor.ch
        };

        editor.replaceRange(newContent, replaceStart, replaceEnd);
        // update cursor position  
        const newCursorPos = {
            line: this.context.start.line,
            ch: lastDollarIndex + 1 + newContent.length
        };
        editor.setCursor(newCursorPos);
    }
}

