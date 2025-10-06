import { App, WorkspaceLeaf, MarkdownView } from "obsidian";

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