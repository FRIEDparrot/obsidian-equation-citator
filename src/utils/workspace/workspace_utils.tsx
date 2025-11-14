import { App, WorkspaceLeaf, MarkdownView, editorInfoField, editorLivePreviewField } from "obsidian";
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
    return !view.state.field(editorLivePreviewField);
}
