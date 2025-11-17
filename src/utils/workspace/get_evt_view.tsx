import { MarkdownView, Workspace } from "obsidian";

/**
 * Get the MarkdownView from a DOM event (MouseEvent, DragEvent, etc.)
 * This is used to find the correct HoverParent for popovers
 */
export function getMarkdownViewFromEvent(
    workspace: Workspace,
    evt: MouseEvent | DragEvent
): MarkdownView | null { 
    const targetEl = evt.target as HTMLElement;
    if (!targetEl) return null;

    for (const leaf of workspace.getLeavesOfType("markdown")) {
        const view = leaf.view as MarkdownView;
        if (!view.containerEl) continue;

        // Check if the event target lies inside this view's container
        if (view.containerEl.contains(targetEl)) {
            return view;
        }
    }
    
    return null;
}

/**
 * Get the MarkdownView from a target element
 * This is used when we have the element but no event
 */
export function getMarkdownViewFromElement(
    workspace: Workspace,
    targetEl: HTMLElement
): MarkdownView | null {
    if (!targetEl) return null;

    for (const leaf of workspace.getLeavesOfType("markdown")) {
        const view = leaf.view as MarkdownView;
        if (!view.containerEl) continue;

        // Check if the target element lies inside this view's container
        if (view.containerEl.contains(targetEl)) {
            return view;
        }
    }
    
    return null;
}
