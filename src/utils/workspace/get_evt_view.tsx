import { MarkdownView,Workspace } from "obsidian";

export function getMarkdownViewFromEvent(
    workspace: Workspace,
    evt: DragEvent
): MarkdownView | null { 
    const targetEl = evt.target as HTMLElement;
    if (!targetEl) return null;

    for (const leaf of workspace.getLeavesOfType("markdown")) {
        const view = leaf.view as MarkdownView;
        if (!view.containerEl) continue;

        // Check if the drop target lies inside this view’s container
        if (view.containerEl.contains(targetEl)) {
            return view;
        }
    }
    
    return null;
}
