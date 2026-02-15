import {
    WorkspaceLeaf,
    TFile,
    Notice,
    MarkdownView,
    EditorRange,
    MarkdownRenderer,
    Component,
    HoverPopover,
    HoverParent,
    normalizePath,
} from "obsidian";
import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { TargetElComponent } from "@/views/popovers/citation_popover";
import { RenderedCallout } from "@/services/callout_services";
import { getLeafByElement } from "@/utils/workspace/workspace_utils";
import { WidgetSizeManager } from "@/settings/styleManagers/widgetSizeManager";

/**
 * Callout Citation Popover Class
 * Displays callout/quote content previews in a popover when hovering over callout citations
 */
export class CalloutCitationPopover extends HoverPopover {
    private readonly calloutsToRender: RenderedCallout[] = [];
    private readonly targetEl: HTMLElement;
    private readonly targetComponent: TargetElComponent;
    
    constructor(
        private readonly plugin: EquationCitator,
        parent: HoverParent,
        targetEl: HTMLElement,
        private readonly prefix: string,  // e.g., "table:", "thm:", "def:"
        calloutsToRender: RenderedCallout[],
        private readonly sourcePath: string,
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime);
        this.targetEl = targetEl;
        // Only render valid callouts (must have tag and content)
        this.calloutsToRender = calloutsToRender.filter(c =>
            c.tag && c.sourcePath && c.content
        );
        // Create targetComponent once to avoid memory leaks
        this.targetComponent = new TargetElComponent(this.targetEl);
    }

    public onOpen() { }
    public onClose() { }

    onload(): void {
        this.onOpen();
        void this.showCallouts();
    }

    onunload(): void {
        this.targetComponent.unload();
        this.onClose();
    }

    /**
     * Display callouts in the popover
     */
    async showCallouts() {
        if (!this.targetEl) {
            Debugger.log("can't find targetEl of callout citation popover");
            return;
        }

        const container: HTMLElement = this.hoverEl.createDiv();
        container.addClass("em-citation-popover-container", "em-callout-citation-popover-container", WidgetSizeManager.getCurrentClassName());

        // Create header
        const header = container.createDiv();
        header.addClass("em-citation-header");

        // Find the matching prefix configuration to get the proper display name
        const prefixConfig = this.plugin.settings.calloutCitationPrefixes.find(p => p.prefix === this.prefix);
        let displayName = "Items"; // Default fallback

        if (prefixConfig) {
            // Extract the display name from the format (e.g., "Table. #" -> "Table", "Theorem #" -> "Theorem")
            const formatWithoutTag = prefixConfig.format.replace('#', '').trim();
            // Remove trailing punctuation (., :, etc.)
            displayName = formatWithoutTag.replace(/[.:;,\-_]+$/, '').trim();
        }

        header.createEl("h3", { text: `Referenced ${displayName}s`, cls: "em-citation-title" });
        const footerSpan = header.createEl("div", {
            cls: "em-citation-title-note",
        });

        footerSpan.createDiv(); // placeholder
        footerSpan.createDiv({
            text: "double-click to jump | ctrl+double-click to open in split",
            cls: "em-citation-title-note-text",
        });

        // Create content wrapper
        const content = container.createDiv();
        content.addClass("em-citation-content");

        // Create scrollable callouts container
        const calloutsContainer = content.createDiv();
        calloutsContainer.addClass("em-callouts-container");

        // Get leaf for click navigation
        const leaf = getLeafByElement(this.plugin.app, this.targetEl);
        if (!leaf) return;

        // Loop and create div for each callout
        for (const callout of this.calloutsToRender) {
            const calloutOptionContainer = calloutsContainer.createDiv();
            calloutOptionContainer.addClass("em-callout-option-container");
            await renderCalloutWrapper(
                this.plugin,
                leaf,
                callout,
                calloutOptionContainer,
                this.targetComponent,
                true
            );
        }

        // Add footer with callout count
        const footer = container.createDiv();
        const totalCallouts = this.calloutsToRender.length;
        footer.addClass("em-citation-footer");
        footer.textContent = `${totalCallouts} ${displayName.toLowerCase()}${totalCallouts === 1 ? '' : 's'}`;
    }
}

/**
 * Render a single callout wrapper with content and metadata
 */
export async function renderCalloutWrapper(
    plugin: EquationCitator,
    leaf: WorkspaceLeaf,
    callout: RenderedCallout,
    container: HTMLElement,
    targetComponent: Component,
    addLinkJump = false
): Promise<void> {
    if (!container) {
        Debugger.log("can't find container for callout");
        return;
    }

    const calloutWrapper = container.createDiv();
    calloutWrapper.addClass("em-callout-wrapper");

    // Create callout label container
    const calloutLabelContainer = calloutWrapper.createDiv();
    calloutLabelContainer.addClass("em-callout-label-container");

    // Create callout number/label using the format from settings
    const calloutLabel = calloutLabelContainer.createDiv();
    calloutLabel.addClass("em-callout-label", "em-callout-number");

    // Find the matching prefix configuration to get the format
    const prefixConfig = plugin.settings.calloutCitationPrefixes.find(p => p.prefix === callout.prefix);
    const format = prefixConfig?.format || `${callout.type}. #`;
    const formattedLabel = format.replace('#', callout.tag || '');
    calloutLabel.textContent = formattedLabel;

    // Create callout filename label (if cross-file)
    if (callout.filename) {
        const fileNameLabel = calloutLabelContainer.createDiv();
        fileNameLabel.addClass("em-callout-label", "em-callout-markdown-filename");
        fileNameLabel.textContent = callout.filename;
    }

    // Create callout content div
    const calloutContentDiv = calloutWrapper.createDiv();
    calloutContentDiv.addClass("em-callout-content");

    // Create callout content container
    const contentContainer = calloutContentDiv.createDiv();
    contentContainer.addClass("em-callout-content-container");

    if (callout.content) {
        try {
            await MarkdownRenderer.render(
                plugin.app,
                callout.content,
                contentContainer,
                callout.sourcePath || '',
                targetComponent
            );
        } catch (error) {
            Debugger.error("Error rendering callout markdown:", error);
            contentContainer.createDiv({
                text: callout.content,
                cls: "em-callout-content-text"
            });
        }
    } else {
        contentContainer.createDiv({
            text: `No content found for ${callout.type} ${callout.tag}`,
            cls: "em-callout-error"
        });
    }

    // Add click effects
    addClickEffects(calloutWrapper);

    // Add click to jump to callout source
    if (addLinkJump && callout.sourcePath) {
        addClickLinkJump(plugin, calloutWrapper, callout, leaf);
    }
}

/**
 * Add hover and click visual effects to callout wrapper
 */
function addClickEffects(calloutWrapper: HTMLElement): void {
    calloutWrapper.addEventListener("mouseenter", () => {
        calloutWrapper.addClass("em-callout-hover");
    });

    calloutWrapper.addEventListener("mouseleave", () => {
        calloutWrapper.removeClass("em-callout-hover");
    });

    calloutWrapper.addEventListener("click", () => {
        calloutWrapper.addClass("em-callout-clicked");
        setTimeout(() => {
            calloutWrapper.removeClass("em-callout-clicked");
        }, 300);
    });
}

/**
 * Add double-click handler to jump to callout in source file
 * Similar to equation navigation:
 * - Double-click: Jump to callout in current pane
 * - Ctrl/Cmd + Double-click: Open in split and jump to callout
 */
function addClickLinkJump(
    plugin: EquationCitator,
    calloutWrapper: HTMLElement,
    callout: RenderedCallout,
    leaf: WorkspaceLeaf
): void {
    calloutWrapper.addEventListener("dblclick", (event: MouseEvent) => {
        if (!callout.sourcePath || !callout.tag) {
            Debugger.log("No source path or tag for callout");
            return;
        }

        const view = leaf.view;
        if (!(view instanceof MarkdownView)) return;

        const isReadingMode = view.getMode() === "preview";
        if (isReadingMode) {
            new Notice("Link jump is not supported in reading mode. Use live preview instead.");
            return;
        }

        const ctrlKey = event.ctrlKey || event.metaKey;
        openFileAndScrollToCallout(
            plugin,
            callout.sourcePath,
            callout.tag,
            callout.prefix,
            ctrlKey,  // open in split if ctrl key is pressed
            view.leaf  // current leaf
        ).then().catch((error) => {
            Debugger.error("Error opening file:", error);
        });
    });
}

/**
 * Opens a file and scrolls to a callout with smart panel reuse
 * Similar to openFileAndScrollToEquation but for callouts
 */
async function openFileAndScrollToCallout(
    plugin: EquationCitator,
    sourcePath: string,
    tag: string,
    prefix: string,
    openInSplit: boolean,
    currentLeaf: WorkspaceLeaf
): Promise<void> {
    const normalizedSourcePath = normalizePath(sourcePath);
    const file = plugin.app.vault.getAbstractFileByPath(normalizedSourcePath);
    if (!(file instanceof TFile)) {
        Debugger.log("Cannot find file:", normalizedSourcePath);
        return;
    }

    // Get callout from cache to find the line number
    const targetCallout = await plugin.calloutCache.getCalloutByTag(normalizedSourcePath, tag);

    if (targetCallout?.prefix !== prefix) {
        Debugger.log("Cannot find callout with tag:", tag);
        new Notice(`${prefix}${tag} not found in ${file.name}`);
        return;
    }

    let targetLeaf: WorkspaceLeaf;

    if (openInSplit) {
        // Find existing leaf with the same file (excluding current)
        const existingLeaf = findLeafWithFile(plugin, sourcePath, currentLeaf);

        if (existingLeaf) {
            // Reuse existing leaf
            targetLeaf = existingLeaf;
            plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
        } else {
            // Create new split
            targetLeaf = plugin.app.workspace.getLeaf('split');
            await targetLeaf.openFile(file);
        }
    } else {
        // Open in current leaf
        targetLeaf = currentLeaf;
        await targetLeaf.openFile(file);
    }

    // Scroll to the callout
    setTimeout(() => {
        const view = targetLeaf.view;
        if (view instanceof MarkdownView && view.editor) {
            const editor = view.editor;
            const lineStart = targetCallout.lineStart;

            editor.setCursor({ line: lineStart, ch: 0 });
            const scrollRange: EditorRange = {
                from: { line: lineStart, ch: 0 },
                to: { line: lineStart, ch: 0 }
            };
            editor.scrollIntoView(scrollRange, true);
        }
    }, 100);
}

/**
 * Finds an existing leaf with the specified file open, excluding the current leaf
 */
function findLeafWithFile(
    plugin: EquationCitator,
    filePath: string,
    excludeLeaf?: WorkspaceLeaf
): WorkspaceLeaf | null {
    const leaves = plugin.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
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
