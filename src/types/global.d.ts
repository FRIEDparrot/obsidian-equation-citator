import "obsidian";
import type { EditorView } from "@codemirror/view";

declare global {
    const activeWindow: Window;
    const activeDocument: Document;
}

declare module "obsidian" {
    interface Editor {
        cm: EditorView;
    }
}