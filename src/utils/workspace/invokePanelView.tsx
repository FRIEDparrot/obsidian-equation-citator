import EquationCitator from "@/main"; 
import { WorkspaceLeaf } from "obsidian";

export async function invokeView (
    plugin: EquationCitator,
    panel_type: string
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
    return leaf;
}