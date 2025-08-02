import { Editor } from "obsidian"; 

export function insertTextWithCursorOffset(
    editor: Editor,
    insertText: string,
    offset: number
) : void {
   
    const cursorPos = editor.getCursor();
    editor.replaceRange(insertText, cursorPos);
    const newCursorPos = {
        line: cursorPos.line,
        ch: cursorPos.ch + offset,
    };
    editor.setCursor(newCursorPos);
}
