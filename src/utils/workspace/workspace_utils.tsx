import { App, WorkspaceLeaf, MarkdownView, editorInfoField } from "obsidian";
import { EditorView } from "@codemirror/view";

export function getLeafByElement(app: App, el: HTMLElement) : WorkspaceLeaf | null { 
    for (const leaf of app.workspace.getLeavesOfType("markdown")) {
        const v = leaf.view;
        if (v instanceof MarkdownView) { 
            if (v.containerEl?.contains(el)) {
                return leaf;
            }
        }
    }
    return null;
}

export function isSourceMode(view: EditorView): boolean {
    const mdView = view.state.field(editorInfoField, false) as MarkdownView | undefined;
    const currentMode = mdView?.currentMode;
    // @ts-expect-error editor.cm exists

    return currentMode?.sourceMode ? true : false;
}
