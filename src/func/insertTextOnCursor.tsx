import { Editor } from "obsidian";

export function insertTextWithCursorOffset(
    editor: Editor,
    insertText: string,
    offset: number
): void {
    const selections = editor.listSelections(); // first selection
    if (selections.length > 0) {
        const selection = selections[0]; 

        const start = selection.anchor;
        const end = selection.head;
        const from = start.line < end.line || (start.line === end.line && start.ch < end.ch) ? start : end;
        const to = start.line < end.line || (start.line === end.line && start.ch < end.ch) ? end : start;
            
        // Replace the selected text  
        editor.replaceRange(insertText, from, to); 
        const newCursorPos = {
            line: from.line,
            ch: from.ch + offset,
        };
        editor.setCursor(newCursorPos);
    }
    else {
        const cursorPos = editor.getCursor();
        editor.replaceRange(insertText, cursorPos);
        const newCursorPos = {
            line: cursorPos.line,
            ch: cursorPos.ch + offset,
        };
        editor.setCursor(newCursorPos);
    }
}
 