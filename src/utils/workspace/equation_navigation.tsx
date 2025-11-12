import EquationCitator from "@/main";
import { TFile, MarkdownView, EditorRange, WorkspaceLeaf } from "obsidian";
import { EquationMatch, parseFirstEquationInMarkdown } from "@/utils/parsers/equation_parser";
import Debugger from "@/debug/debugger";

/**
 * Scrolls the editor to the first equation with the specified tag
 * @param plugin - The plugin instance
 * @param tag - The equation tag to scroll to
 * @param filePath - Optional file path, defaults to active file
 */
export async function scrollToEquationByTag(
    plugin: EquationCitator,
    tag: string,
    filePath?: string
): Promise<void> {
    // Get file path
    const targetFilePath = filePath || plugin.app.workspace.getActiveFile()?.path;
    if (!targetFilePath) {
        Debugger.log("No file path available for scrolling");
        return;
    }

    const file = plugin.app.vault.getAbstractFileByPath(targetFilePath);
    if (!(file instanceof TFile)) {
        Debugger.log("File not found: " + targetFilePath);
        return;
    }

    const md = await plugin.app.vault.cachedRead(file);
    const match: EquationMatch | undefined = parseFirstEquationInMarkdown(md, tag, plugin.settings.enableTypstMode);
    if (!match) {
        Debugger.log("Can't find equation with tag: " + tag + " in file: " + targetFilePath);
        return;
    }

    const lineStart = match.lineStart;
    // Scroll to the first equation with tag
    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.editor) {
        Debugger.log("Can't find active view or editor");
        return;
    }

    // Live preview mode
    const editor = view.editor;
    // Set cursor first with retry logic for async rendering
    const tryScroll = (retries = 5) => {
        if (editor.lineCount() >= lineStart) {
            editor.setCursor({ line: lineStart, ch: 0 });
            const scrollRange: EditorRange = {
                from: { line: lineStart, ch: 0 },
                to: { line: lineStart, ch: 0 }
            };
            editor.scrollIntoView(scrollRange, true);
        } else if (retries > 0) {
            Debugger.log(`Line count ${editor.lineCount()} is less than lineStart ${lineStart}, retrying...`);
            setTimeout(() => {
                tryScroll(retries - 1);
            }, 350);
        } else if (retries === 0) {
            Debugger.log(`Failed to scroll to line ${lineStart} in file ${targetFilePath}`);
        }
    };
    tryScroll();
}

/**
 * Finds an existing leaf with the specified file open, excluding the current leaf
 * @param plugin - The plugin instance
 * @param filePath - The file path to search for
 * @param excludeLeaf - The leaf to exclude from search (usually the current leaf)
 * @returns The leaf if found, null otherwise
 */
function findLeafWithFile(
    plugin: EquationCitator,
    filePath: string,
    excludeLeaf?: WorkspaceLeaf
): WorkspaceLeaf | null {
    const leaves = plugin.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
        // Skip the current leaf
        if (excludeLeaf && leaf === excludeLeaf) {
            continue;
        }
        const view = leaf.view;
        if (view instanceof MarkdownView && view.file?.path === filePath) {
            return leaf;
        }
    }
    return null;
}

/**
 * Opens a file and scrolls to an equation with smart panel reuse
 * @param plugin - The plugin instance
 * @param sourcePath - The file path to open
 * @param tag - The equation tag to scroll to
 * @param openInSplit - Whether to open in a split pane (ctrl/cmd + click)
 * @param currentLeaf - The current leaf (used when not opening in split, or to exclude when searching)
 */
export async function openFileAndScrollToEquation(
    plugin: EquationCitator,
    sourcePath: string,
    tag: string,
    openInSplit: boolean,
    currentLeaf?: WorkspaceLeaf
): Promise<void> {
    let targetLeaf: WorkspaceLeaf | null = null;

    if (openInSplit) {
        // Check if there's already a different leaf (not current) with this file open
        const existingLeaf = findLeafWithFile(plugin, sourcePath, currentLeaf);
        if (existingLeaf) {
            // Reuse the existing leaf in a different panel
            targetLeaf = existingLeaf;
            Debugger.log("Reusing existing panel (not current) for file: " + sourcePath);
        } else {
            // Create a new split pane on the right
            targetLeaf = plugin.app.workspace.getLeaf("split");
            Debugger.log("Creating new split pane on right for file: " + sourcePath);
        }
    } else {
        // Use current leaf
        targetLeaf = currentLeaf || plugin.app.workspace.getLeaf(false);
    }

    if (!targetLeaf) {
        Debugger.log("Failed to get target leaf");
        return;
    }

    // Set the leaf as active and open the file
    plugin.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
    await plugin.app.workspace.openLinkText("", sourcePath, false);

    // Scroll to the equation after layout is ready
    plugin.app.workspace.onLayoutReady(() => {
        // Ensure the layout is ready before scrolling to the tag
        setTimeout(() => {
            scrollToEquationByTag(plugin, tag, sourcePath).then().catch(console.error);
        }, 50);
    });
}
