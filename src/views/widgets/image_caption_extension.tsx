import EquationCitator from "@/main";
import { parseAllImagesFromMarkdown, parseImageLine, ImageMatch } from "@/utils/parsers/image_parser";
import { normalizePath, 
    MarkdownRenderer, 
    MarkdownRenderChild, 
    Component, 
    editorInfoField, 
    TFile,
    MarkdownPostProcessorContext,
} from "obsidian";
import { EquationCitatorSettings } from '@/settings/defaultSettings';
import { ViewPlugin, EditorView, ViewUpdate } from '@codemirror/view'; 
import Debugger from '@/debug/debugger';

/////////////////////////////// Image Caption Rendering /////////////////////////

/**
 * Live Preview Extension for rendering image captions
 * This extension finds rendered image elements and adds captions below them
 */
export function createImageCaptionExtension(plugin: EquationCitator) {
    const settings: EquationCitatorSettings = plugin.settings;

    return ViewPlugin.fromClass(class {
        view: EditorView;
        lastCursorLine = -1;
        // Owns the lifecycle of MarkdownRenderer.render() calls used for caption descriptions
        mathRenderComponentCapt: Component = new Component();
        mathRenderComponentDesc: Component = new Component();

        constructor(view: EditorView) {
            this.view = view;
            this.mathRenderComponentCapt.load();
            this.mathRenderComponentDesc.load();
            this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
            this.renderImageCaptions(view);
        }

        update(update: ViewUpdate) {
            // Check if cursor moved to a different line
            const currentCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
            const cursorLineChanged = currentCursorLine !== this.lastCursorLine;

            // Re-render if:
            // 1. Document content changed (typing, pasting, etc.)
            // 2. Viewport scrolled
            // 3. Cursor moved to a different line (Enter, arrow keys, clicking)
            if (update.docChanged || update.viewportChanged || (update.selectionSet && cursorLineChanged)) {
                this.lastCursorLine = currentCursorLine;
                this.renderImageCaptions(update.view);
            }
        }

        /**
         * Extension to render the image caption 
         */
        renderImageCaptions(view: EditorView) {
            if (!settings.renderImageCaptionsAndDescriptions) {
                this.removeAllCaptions(view.dom);
                return;
            }

            const currentFile = view.state.field(editorInfoField).file;
            if (!(currentFile instanceof TFile)) {
                return;
            }

            // Get current cursor line for real-time parsing
            const cursorPos = view.state.selection.main.head;
            const cursorLine = view.state.doc.lineAt(cursorPos);
            const cursorLineNumber = cursorLine.number;
            const cursorLineText = cursorLine.text;

            // Check if current line is an image line
            const currentLineImage = parseImageLine(cursorLineText, cursorLineNumber, settings.figCitationPrefix);

            let images: ImageMatch[];

            // If current line is a valid image, parse all markdown directly for immediate feedback
            if (currentLineImage) {
                const markdown = view.state.doc.toString();
                images = parseAllImagesFromMarkdown(markdown, settings.figCitationPrefix);
                
                // Force-refresh the cache with the parsed images
                plugin.imageCache.set(currentFile.path, images);
            } else {
                // Not typing on an image line, use cache (will be handled asynchronously)
                void plugin.imageCache.getImagesForFile(currentFile.path).then(cachedImages => { // nosonar
                    if (!cachedImages || cachedImages.length === 0) {
                        this.removeAllCaptions(view.dom);
                        return;
                    }
                    this.processAndRenderImages(cachedImages, view);
                });
                return;
            }

            // Process and render images synchronously when on image line
            this.processAndRenderImages(images, view);
        }

        processAndRenderImages(images: ImageMatch[], view: EditorView) {
            if (!settings.renderImageCaptionsAndDescriptions) {
                this.removeAllCaptions(view.dom);
                return;
            }

            // Only process images that have metadata to display
            const imagesWithMetadata = images.filter(img =>
                img.tag !== undefined && (img.tag || img.title || img.desc)
            );
            if (imagesWithMetadata.length === 0) {
                this.removeAllCaptions(view.dom);
                return;
            }
            const allImageElements = getInternalImageEmbeds(view.dom);

            // Match images by line position in document
            const matchedPairs = this.matchImagesByLine(allImageElements, imagesWithMetadata, view);

            // Track which elements should have captions
            const elementsWithCaptions = new Set<Element>();

            // Apply captions
            matchedPairs.forEach(({ element, imageData }) => {
                this.ensureCaption(element, imageData, settings);
                elementsWithCaptions.add(element);
            });

            // Clean up any orphaned captions
            // Since we only render for internal embeds, this is simple
            const allCaptions = view.dom.querySelectorAll('.em-image-caption');
            allCaptions.forEach(caption => {
                // Check if this caption is attached to a tracked element
                const parentElement = caption.parentElement;
                const isAttached = Array.from(elementsWithCaptions).some(el =>
                    el === parentElement || el.contains(caption)
                );

                // Remove if not attached (shouldn't happen with internal embeds only)
                if (!isAttached) caption.remove();
            });
        }

        removeAllCaptions(root: ParentNode) {
            root.querySelectorAll('.em-image-caption').forEach(cap => cap.remove());
        }

        /**
         * Pairs rendered internal image embeds with parsed image metadata by nearest source line.
         * Each parsed image is used at most once, and only matches rendered images within one line.
         */
        matchImagesByLine(
            renderedImages: Element[],
            parsedImages: ImageMatch[],
            view: EditorView
        ): Array<{ element: Element; imageData: ImageMatch }> {
            const result: Array<{ element: Element; imageData: ImageMatch }> = [];
            const usedIndices = new Set<number>();

            for (const element of renderedImages) {
                const lineNum = this.getLineNumber(element, view);
                if (lineNum === -1) {
                    continue;
                }

                const match = this.findClosestUnusedImage(lineNum, parsedImages, usedIndices);
                if (match) {
                    usedIndices.add(match.index);
                    result.push({ element, imageData: match.image });
                }
            }

            return result;
        }

        /**
         * Finds the closest unused parsed image around a rendered embed's source line.
         */
        findClosestUnusedImage(
            lineNum: number,
            parsedImages: ImageMatch[],
            usedIndices: Set<number>
        ): { image: ImageMatch; index: number } | null {
            let bestMatch: { image: ImageMatch; index: number } | null = null;
            let bestDistance = Infinity;

            parsedImages.forEach((image, index) => {
                if (usedIndices.has(index)) return;

                const distance = Math.abs(image.line - lineNum);
                if (distance <= 1 && distance < bestDistance) {
                    bestMatch = { image, index };
                    bestDistance = distance;
                }
            });

            return bestMatch;
        }

        getLineNumber(element: Element, view: EditorView): number {
            try {
                const domNode = element.instanceOf(HTMLElement) ? element : element.parentElement;
                if (domNode) {
                    const pos = view.posAtDOM(domNode);
                    const line = view.state.doc.lineAt(pos).number - 1; // 0-indexed
                    return line;
                }
            } catch (e) {
                console.error(e);
            }
            return -1;
        }

        /**
         * render the image caption for the given element
         */
        ensureCaption(element: Element, imageData: ImageMatch, settings: EquationCitatorSettings) {
            const isInternalEmbed = element.classList.contains('internal-embed');
            
            if (!isInternalEmbed) return
            let existingCaption = element.querySelector('.em-image-caption');
            if (existingCaption) {
                this.updateCaption(existingCaption as HTMLElement, imageData, settings);
            } else {
                Debugger.log("create caption for image:", imageData.raw);
                this.createCaption(element, imageData, settings);
            }
        }

        createCaption(element: Element, image: ImageMatch, settings: EquationCitatorSettings) {
            const captionDiv = activeDocument.createElement('div');
            captionDiv.className = 'em-image-caption';
            this.renderCaptionContent(captionDiv, image, settings);
            element.appendChild(captionDiv);
        }

        /**
         * Render the figure description as Markdown (so inline math like $n_g$ works)
         * into the given element, scoped to this view's source file.
         */
        renderMarkdown(descLine: HTMLElement, desc: string, mathComp: Component) {
            const currentFile = this.view.state.field(editorInfoField).file;
            const sourcePath = currentFile instanceof TFile ? currentFile.path : '';
            void MarkdownRenderer.render(plugin.app, desc, descLine, sourcePath, mathComp); //nosonar
        }

        updateCaption(captionEl: HTMLElement, image: ImageMatch, settings: EquationCitatorSettings) {
            captionEl.empty();
            this.renderCaptionContent(captionEl, image, settings);
        }

        renderCaptionContent(captionEl: HTMLElement, image: ImageMatch, settings: EquationCitatorSettings) {
            const titleText = getImageCaptionTitle(image, settings.figCitationFormat);
            if (titleText) {
                const titleLine = activeDocument.createElement('div');
                titleLine.className = 'em-image-caption-title';
                captionEl.appendChild(titleLine);
                this.renderMarkdown(titleLine, titleText, this.mathRenderComponentCapt);
            }

            if (image.desc) {
                const descLine = activeDocument.createElement('div');
                descLine.className = 'em-image-caption-desc';
                captionEl.appendChild(descLine);
                this.renderMarkdown(descLine, image.desc, this.mathRenderComponentDesc);
            }
        }

        destroy() {
            this.mathRenderComponentCapt.unload();
            this.mathRenderComponentDesc.unload();
        }
    });
}

/**
 * Reading Mode Post-Processor for image captions
 */
export async function imageCaptionPostProcessor(
    plugin: EquationCitator,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
): Promise<void> {
    if (!plugin.settings.renderImageCaptionsAndDescriptions) {
        el.querySelectorAll('.em-image-caption').forEach(cap => cap.remove());
        return;
    }

    const { figCitationFormat, figCitationPrefix } = plugin.settings;

    // Get the source file content
    const normalizedSourcePath = normalizePath(ctx.sourcePath);
    const file = plugin.app.vault.getAbstractFileByPath(normalizedSourcePath);
    if (!file || !(file instanceof TFile)) return;

    const content = await plugin.app.vault.read(file);
    const images = parseAllImagesFromMarkdown(content, figCitationPrefix);

    // Only process images that have metadata
    const imagesWithMetadata = images.filter(img =>
        img.tag !== undefined && (img.tag || img.title || img.desc)
    );

    if (imagesWithMetadata.length === 0) return;

    // Get section info to calculate line offset
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;

    const allImageElements = getInternalImageEmbeds(el);

    // Filter images in this section
    const sectionImages = imagesWithMetadata.filter(img =>
        img.line >= sectionInfo.lineStart && img.line <= sectionInfo.lineEnd
    );

    if (sectionImages.length === 0) return;

    // Sort by line number
    sectionImages.sort((a, b) => a.line - b.line);

    // Match by order - assume images appear in same order as in markdown
    const usedIndices = new Set<number>();

    allImageElements.forEach((element) => {
        // Check if caption already exists
        const hasCaption = element.querySelector('.em-image-caption') !== null;
        if (hasCaption) return;

        // Find next unused image data
        for (let i = 0; i < sectionImages.length; i++) {
            if (!usedIndices.has(i)) {
                usedIndices.add(i);
                createImageCaption(plugin, ctx, element, sectionImages[i], figCitationFormat);
                break;
            }
        }
    });
}

/**
 * Helper function to create image caption element
 * Only for internal embeds (local files)
 */
function createImageCaption(
    plugin: EquationCitator,
    ctx: MarkdownPostProcessorContext,
    element: Element,
    image: ImageMatch,
    figCitationFormat: string
): void {
    const captionDiv = activeDocument.createElement('div');
    captionDiv.className = 'em-image-caption';

    const titleText = getImageCaptionTitle(image, figCitationFormat);
    if (titleText) {
        const titleLine = activeDocument.createElement('div');
        titleLine.className = 'em-image-caption-title';

        const componentTitle = new MarkdownRenderChild(titleLine);
        ctx.addChild(componentTitle);
        void  MarkdownRenderer.render(plugin.app, titleText, titleLine, ctx.sourcePath, componentTitle); //nosonar
        captionDiv.appendChild(titleLine);
    }

    // Second line: description - rendered as Markdown so inline math (e.g. $n_g$) works
    if (image.desc) {
        const descLine = activeDocument.createElement('div');
        descLine.className = 'em-image-caption-desc';
        captionDiv.appendChild(descLine);

        // Tie the render's lifecycle (and any embedded widgets) to this post-processor block
        const component = new MarkdownRenderChild(descLine);
        ctx.addChild(component);
        void MarkdownRenderer.render(plugin.app, image.desc, descLine, ctx.sourcePath, component); //nosonar
    }

    // Append to internal embed element
    element.appendChild(captionDiv);
}

function getInternalImageEmbeds(root: ParentNode): Element[] {
    const images: Element[] = [];
    const internalEmbeds = root.querySelectorAll(
        '.internal-embed.image-embed, .internal-embed.markdown-embed, .internal-embed.is-loaded'
    );

    internalEmbeds.forEach(embedEl => {
        if (embedEl.querySelector('img, svg, canvas, .markdown-embed-content')) {
            images.push(embedEl);
        }
    });

    return images;
}

function getImageCaptionTitle(image: ImageMatch, figCitationFormat: string): string {
    const figLabel = image.tag ? figCitationFormat.replace('#', image.tag) : '';
    return [figLabel, image.title].filter(Boolean).join(' ');
}
