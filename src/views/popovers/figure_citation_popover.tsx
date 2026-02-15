import EquationCitator from "@/main";
import {
    WorkspaceLeaf, 
    TFile, 
    Notice, 
    MarkdownView, 
    MarkdownRenderer,
    EditorRange,
    Component,
    HoverPopover,
    HoverParent,
} from "obsidian";
import Debugger from "@/debug/debugger";
import { TargetElComponent } from "@/views/popovers/citation_popover";
import { RenderedFigure } from "@/services/figure_services";
import { getLeafByElement } from "@/utils/workspace/workspace_utils";
import { WidgetSizeManager } from "@/settings/styleManagers/widgetSizeManager";

/**
 * Figure Citation Popover Class
 * Displays image previews in a popover when hovering over figure citations
 */
export class FigureCitationPopover extends HoverPopover {
    private readonly figuresToRender: RenderedFigure[] = [];
    private readonly targetEl: HTMLElement;
    private readonly targetComponent: TargetElComponent;

    constructor(
        private readonly plugin: EquationCitator,
        parent: HoverParent,
        targetEl: HTMLElement,
        figuresToRender: RenderedFigure[],
        private readonly sourcePath: string,
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime);
        this.targetEl = targetEl;
        // Only render valid figures (must have tag and either imagePath or imageLink)
        this.figuresToRender = figuresToRender.filter(fig =>
            fig.tag && fig.sourcePath && (fig.imagePath || fig.imageLink)
        );
        // Create targetComponent once to avoid memory leaks
        this.targetComponent = new TargetElComponent(this.targetEl);
    }

    public onOpen() { }
    public onClose() { }
    
    onload(): void {
        this.onOpen();
        this.showFigures();
    }

    onunload(): void {
        this.targetComponent.unload();
        this.onClose();
    }

    /**
     * Display figures in the popover
     */
    showFigures() {
        if (!this.targetEl) {
            Debugger.log("can't find targetEl of figure citation popover");
            return;
        }

        const container: HTMLElement = this.hoverEl.createDiv();
        container.addClass("em-citation-popover-container", "em-figure-citation-popover-container", WidgetSizeManager.getCurrentClassName());

        // Create header
        const header = container.createDiv();
        header.addClass("em-citation-header");

        header.createEl("h3", { text: "Referenced figures", cls: "em-citation-title" });
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

        // Create scrollable figures container
        const figuresContainer = content.createDiv();
        figuresContainer.addClass("em-figures-container");

        // Get leaf for click navigation
        const leaf = getLeafByElement(this.plugin.app, this.targetEl);
        if (!leaf) return;

        // Loop and create div for each figure
        this.figuresToRender.forEach((fig, index) => {
            const figureOptionContainer = figuresContainer.createDiv();
            figureOptionContainer.addClass("em-figure-option-container");
            renderFigureWrapper(
                this.plugin,
                leaf,
                fig,
                figureOptionContainer,
                this.targetComponent,
                true
            );
        });

        // Add footer with figure count
        const footer = container.createDiv();
        const totalFigures = this.figuresToRender.length;
        footer.addClass("em-citation-footer");
        footer.textContent = `${totalFigures} figure${totalFigures === 1 ? '' : 's'}`;
    }
}

/**
 * Render a single figure wrapper with image and metadata
 * @note since there are 2 types of image formats (wiki link vs markdown link), 
 *      the rendering logic is different for each type
 * @summary for `markdown link` (web image link), we always use image link to render the image;
 *      i.e., <img src="imageLink" alt="title or tag">
 * @summary for `wiki link` (internal image in obsidian vault), we need to resolve the vault path first, then render the image;   
 */
export function renderFigureWrapper(
    plugin: EquationCitator,
    leaf: WorkspaceLeaf,
    fig: RenderedFigure,
    container: HTMLElement,
    targetComponent: Component,
    addLinkJump = false
): void {
    if (!container) {
        Debugger.log("can't find container for figure");
        return;
    }

    // Create a set of extensions that should use Markdown renderer
    const markdownRendererExtensions = new Set(plugin.settings.extensionsUseMarkdownRenderer);

    const figureWrapper = container.createDiv();
    figureWrapper.addClass("em-figure-wrapper");

    // Create figure label container
    const figureLabelContainer = figureWrapper.createDiv();
    figureLabelContainer.addClass("em-figure-label-container");

    // Create figure number/label
    const figureLabel = figureLabelContainer.createDiv();
    figureLabel.addClass("em-figure-label", "em-figure-number");
    const formattedLabel = plugin.settings.figCitationFormat.replace('#', fig.tag || '');
    figureLabel.textContent = formattedLabel;

    // Create figure filename label (if cross-file)
    if (fig.filename) {
        const fileNameLabel = figureLabelContainer.createDiv();
        fileNameLabel.addClass("em-figure-label", "em-figure-markdown-filename");
        fileNameLabel.textContent = fig.filename;
    }

    // Create figure content div
    const figureContentDiv = figureWrapper.createDiv();
    figureContentDiv.addClass("em-figure-content");

    // Render the image
    const imageContainer = figureContentDiv.createDiv();
    imageContainer.addClass("em-figure-image-container");

    if (fig.imageLink) {
        // wikiLink format image rendering - can directly use the link 
        const img = imageContainer.createEl("img", {
            attr: {
                src: fig.imageLink,
                alt: fig.title || fig.tag || 'Figure'
            }
        });
        img.addClass("em-figure-image");
    } else if (fig.imagePath && fig.sourcePath) {
        // Internal image path - need to resolve the vault path
        const sourceFile = plugin.app.vault.getAbstractFileByPath(fig.sourcePath);
        if (sourceFile instanceof TFile) {
            // the imagePath may be file#section, so split by # to get the actual file path
            const imageFile = plugin.app.metadataCache.getFirstLinkpathDest(fig.imagePath, fig.sourcePath);
            if (imageFile instanceof TFile) {
                // Check if the image extension requires Markdown renderer
                const fullPath = imageFile.path;
                const shouldUseMarkdownRenderer = Array.from(markdownRendererExtensions).some(ext => 
                    fullPath.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
                );

                if (shouldUseMarkdownRenderer) {
                    // Use Markdown renderer for special file types (e.g., excalidraw)
                    const markdownText = `![[${fullPath}]]`;
                    void MarkdownRenderer.render(
                        plugin.app,
                        markdownText,
                        imageContainer,
                        fig.sourcePath,
                        targetComponent
                    );
                    imageContainer.addClass("em-figure-markdown-rendered");
                } else {
                    // Use standard image element for regular images (default renderer)
                    const resourcePath = plugin.app.vault.getResourcePath(imageFile);
                    const img = imageContainer.createEl("img", {
                        attr: {
                            src: resourcePath,
                            alt: fig.title || fig.tag || 'Figure'
                        }
                    });
                    img.addClass("em-figure-image");
                }
            } 
            else if (fig.imagePath.contains("#") && markdownRendererExtensions.has("md")) {
                // special support for markdown section preview ![[file.md#section]]
                // just directly render the markdown link without resolving, since Obsidian can handle it in this format
                const markdownText = `![[${fig.imagePath}]]`;
                void MarkdownRenderer.render(
                    plugin.app,
                    markdownText,
                    imageContainer,
                    fig.sourcePath,
                    targetComponent
                );
                imageContainer.addClass("em-figure-markdown-rendered");
            }
            else {
                imageContainer.createDiv({
                    text: `Image not found: ${fig.imagePath}`,
                    cls: "em-figure-error"
                });
            }
        }
    }

    // Render title and description if available
    if (plugin.settings.enableRenderFigureInfoInPreview && (fig.title || fig.desc)) {
        const metadataDiv = figureContentDiv.createDiv();
        metadataDiv.addClass("em-figure-metadata");

        if (fig.title) {
            const titleDiv = metadataDiv.createDiv();
            titleDiv.addClass("em-figure-title");
            titleDiv.textContent = fig.title;
        }

        if (fig.desc) {
            const descDiv = metadataDiv.createDiv();
            descDiv.addClass("em-figure-desc");
            descDiv.textContent = fig.desc;
        }
    }

    // Add click effects
    addClickEffects(figureWrapper);

    // Add click to jump to figure source
    if (addLinkJump && fig.sourcePath) {
        addClickLinkJump(plugin, figureWrapper, fig, leaf);
    }
}

/**
 * Add hover and click visual effects to figure wrapper
 */
function addClickEffects(figureWrapper: HTMLElement): void {
    figureWrapper.addEventListener("mouseenter", () => {
        figureWrapper.addClass("em-figure-hover");
    });

    figureWrapper.addEventListener("mouseleave", () => {
        figureWrapper.removeClass("em-figure-hover");
    });

    figureWrapper.addEventListener("click", () => {
        figureWrapper.addClass("em-figure-clicked");
        setTimeout(() => {
            figureWrapper.removeClass("em-figure-clicked");
        }, 300);
    });
}

/**
 * Add double-click handler to jump to figure in source file
 * Similar to equation navigation:
 * - Double-click: Jump to figure in current pane
 * - Ctrl/Cmd + Double-click: Open in split and jump to figure
 */
function addClickLinkJump(
    plugin: EquationCitator,
    figureWrapper: HTMLElement,
    fig: RenderedFigure,
    leaf: WorkspaceLeaf
): void {
    figureWrapper.addEventListener("dblclick", (event: MouseEvent) => {
        if (!fig.sourcePath || !fig.tag) {
            Debugger.log("No source path or tag for figure");
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
        void openFileAndScrollToFigure(
            plugin,
            fig.sourcePath,
            fig.tag,
            ctrlKey,  // open in split if ctrl key is pressed
            view.leaf  // current leaf
        );
    });
}

/**
 * Opens a file and scrolls to a figure with smart panel reuse
 * Similar to openFileAndScrollToEquation but for figures
 */
async function openFileAndScrollToFigure(
    plugin: EquationCitator,
    sourcePath: string,
    tag: string,
    openInSplit: boolean,
    currentLeaf: WorkspaceLeaf
): Promise<void> {
    const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
        Debugger.log("Cannot find file:", sourcePath);
        return;
    }

    // Get all images in the file to find the line number
    const images = await plugin.imageCache.getImagesForFile(sourcePath);
    const targetImage = images?.find(img => img.tag === tag);

    if (!targetImage) {
        Debugger.log("Cannot find image with tag:", tag);
        new Notice(`Figure ${tag} not found in ${file.name}`);
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

    // Scroll to the figure
    setTimeout(() => {
        const view = targetLeaf.view;
        if (view instanceof MarkdownView && view.editor) {
            const editor = view.editor;
            const lineStart = targetImage.line;

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
