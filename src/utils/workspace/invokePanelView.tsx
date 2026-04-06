import EquationCitator from "@/main"; 
import { WorkspaceLeaf } from "obsidian";

/**
 * Invoke a view by its type, 
 * if the view already exists in the workspace, return itself,
 * otherwise a new one will be created in the right sidebar. 
 * 
 * reveal this leaf if reveal is set to true, otherwise just create the leaf without switching to it.
 */
export async function invokeView (
    plugin: EquationCitator,
    panel_type: string,
    reveal = true, // whether to reveal the leaf after creating it
) {
    const workspace = plugin.app.workspace;
    /** wait until the workspace layout is ready in this window */
    await new Promise<void>((resolve) => workspace.onLayoutReady(resolve)); 

    const leaves = workspace.getLeavesOfType(panel_type);
    let leaf: WorkspaceLeaf | null = null;
    
    if (leaves.length > 0) {
        // A leaf with our view already exists, use that
        leaf = leaves[0];
    } else {
        // Our view could not be found in the workspace, create a new leaf in the right sidebar for it
        leaf = workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState(
                { type: panel_type, active: true }
            );
        }
    }
    if (leaf && reveal) {
        await plugin.app.workspace.revealLeaf(leaf);
    }
    return leaf;
}