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
        captionElements: Map<string, HTMLElement> = new Map();
        captionsByLine: Map<number, { element: Element; caption: HTMLElement }> = new Map();
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
            // Find all image elements in the editor
            const editorEl = view.dom;
            const allImageElements = this.getAllImageElements(editorEl);

            // Match images by line position in document
            const matchedPairs = this.matchImagesByLine(allImageElements, imagesWithMetadata, view);

            // Track which elements should have captions
            const elementsWithCaptions = new Set<Element>();

            // Apply captions
            matchedPairs.forEach(({ element, imageData }) => {
                if (imageData) {
                    this.ensureCaption(element, imageData, settings);
                    elementsWithCaptions.add(element);
                }
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
         * Find .internal-embed 
         * Patch : for excalidraw, add recognition for native svg element
         */
        getAllImageElements(editorEl: HTMLElement): Element[] {
            const images: Element[] = [];

            // Only process internal embeds (local files)
            // This prevents orphaned captions during editing for markdown/web link images
            const internalEmbeds = editorEl.querySelectorAll('.internal-embed.image-embed, .internal-embed.is-loaded');
            internalEmbeds.forEach(el => {
                const img = el.querySelector('img');
                // for obsidian-excalidraw, it use native svg for rednering 
                const svg = el.querySelector('svg');
                if (img || svg) {
                    images.push(el);
                }
            });

            return images;
        }

        matchImagesByLine(
            renderedImages: Element[],
            parsedImages: ImageMatch[],
            view: EditorView
        ): Array<{ element: Element; imageData: ImageMatch | null }> {
            const result: Array<{ element: Element; imageData: ImageMatch | null }> = [];
            const usedIndices = new Set<number>();

            for (const element of renderedImages) {
                const imgEl = element.tagName === 'IMG' ? element : element.querySelector('img');
                const svgEl = element.tagName === 'SVG' ? element : element.querySelector('svg');
                if (!imgEl && !svgEl) {
                    result.push({ element, imageData: null });
                    continue;
                }

                // Check if caption already exists - if so, try to preserve it
                const existingCaption = this.getExistingCaption(element);
                if (existingCaption) {
                    // Try to find matching data to update caption
                    const lineNum = this.getLineNumber(element, view);

                    if (lineNum !== -1) {
                        // Find the closest unused parsed image
                        let bestMatch: ImageMatch | null = null;
                        let bestMatchIndex = -1;
                        let bestDistance = Infinity;

                        for (let i = 0; i < parsedImages.length; i++) {
                            if (usedIndices.has(i)) continue;
                            const img = parsedImages[i];
                            const distance = Math.abs(img.line - lineNum);
                            if (distance <= 1 && distance < bestDistance) {
                                bestMatch = img;
                                bestMatchIndex = i;
                                bestDistance = distance;
                            }
                        }

                        if (bestMatch && bestMatchIndex !== -1) {
                            usedIndices.add(bestMatchIndex);
                            result.push({ element, imageData: bestMatch });
                            continue;
                        }
                    }

                    // If we can't match by line, keep the existing caption
                    // Don't remove it just because line detection failed
                    result.push({ element, imageData: null });
                    continue;
                }

                // No existing caption - try to create one
                const lineNum = this.getLineNumber(element, view);

                if (lineNum === -1) {
                    result.push({ element, imageData: null });
                    continue;
                }

                // Find the closest unused parsed image on the same or nearby line
                let bestMatch: ImageMatch | null = null;
                let bestMatchIndex = -1;
                let bestDistance = Infinity;

                for (let i = 0; i < parsedImages.length; i++) {
                    if (usedIndices.has(i)) continue;

                    const img = parsedImages[i];
                    const distance = Math.abs(img.line - lineNum);

                    // Only consider images within 1 line distance
                    if (distance <= 1 && distance < bestDistance) {
                        bestMatch = img;
                        bestMatchIndex = i;
                        bestDistance = distance;
                    }
                }

                if (bestMatch && bestMatchIndex !== -1) {
                    usedIndices.add(bestMatchIndex);
                    result.push({ element, imageData: bestMatch });
                } else {
                    result.push({ element, imageData: null });
                }
            }

            return result;
        }

        getExistingCaption(element: Element): Element | null {
            // Check for caption as child (internal embeds only)
            return element.querySelector('.em-image-caption');
        }

        getLineNumber(element: Element, view: EditorView): number {
            try {
                const domNode = element instanceof HTMLElement ? element : element.parentElement;
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
            // Check if caption already exists
            const isInternalEmbed = element.classList.contains('internal-embed');
            
            // For IMG elements, check next sibling
            if (!isInternalEmbed) return
            let existingCaption = element.querySelector('.em-image-caption');
            if (existingCaption) {
                // Update existing caption
                this.updateCaption(existingCaption as HTMLElement, imageData, settings);
            } else {
                // Create new caption
                Debugger.log("create caption for image:", imageData.raw);
                this.createCaption(element, imageData, settings);
            }
        }

        removeCaptionIfExists(element: Element) {
            // Check for caption as child (internal embeds only)
            const existingCaption = element.querySelector('.em-image-caption');
            if (existingCaption) {
                existingCaption.remove();
            }
        }

        createCaption(element: Element, image: ImageMatch, settings: EquationCitatorSettings) {
            const captionDiv = document.createElement('div');
            captionDiv.className = 'em-image-caption';

            // First line: Fig. X.X title
            if (image.tag || image.title) {
                const titleLine = document.createElement('div');
                titleLine.className = 'em-image-caption-title';

                let titleText = '';
                if (image.tag) {
                    const figLabel = settings.figCitationFormat.replace('#', image.tag);
                    titleText = figLabel;
                }
                if (image.title) {
                    titleText += (titleText ? ' ' : '') + image.title;
                }

                captionDiv.appendChild(titleLine);
                this.renderMarkdown(titleLine, titleText, this.mathRenderComponentCapt);
            }

            // Description - rendered as Markdown so inline math (e.g. $n_g$) is supported
            if (image.desc) {
                const descLine = document.createElement('div');
                descLine.className = 'em-image-caption-desc';
                captionDiv.appendChild(descLine);
                this.renderMarkdown(descLine, image.desc, this.mathRenderComponentCapt);
            }

            // Only append to internal embeds (not IMG elements)
            element.appendChild(captionDiv);
        }

        /**
         * Render the figure description as Markdown (so inline math like $n_g$ works)
         * into the given element, scoped to this view's source file.
         */
        renderMarkdown(descLine: HTMLElement, desc: string, mathComp: Component) {
            const currentFile = this.view.state.field(editorInfoField).file;
            const sourcePath = currentFile instanceof TFile ? currentFile.path : '';
            void MarkdownRenderer.render(plugin.app, desc, descLine, sourcePath, mathComp);
        }

        updateCaption(captionEl: HTMLElement, image: ImageMatch, settings: EquationCitatorSettings) {
            // Clear existing content
            captionEl.empty();

            // First line: Fig. X.X title
            if (image.tag || image.title) {
                const titleLine = document.createElement('div');
                titleLine.className = 'em-image-caption-title';

                let titleText = '';
                if (image.tag) {
                    const figLabel = settings.figCitationFormat.replace('#', image.tag);
                    titleText = figLabel;
                }
                if (image.title) {
                    titleText += (titleText ? ' ' : '') + image.title;
                }
                captionEl.appendChild(titleLine);
                this.renderMarkdown(titleLine, titleText, this.mathRenderComponentCapt);
            }

            // Second line: description - rendered as Markdown so inline math works
            if (image.desc) {
                const descLine = document.createElement('div');
                descLine.className = 'em-image-caption-desc';
                captionEl.appendChild(descLine);
                this.renderMarkdown(descLine, image.desc, this.mathRenderComponentDesc);
            }
        }

        destroy() {
            this.mathRenderComponentCapt.unload();
            this.mathRenderComponentDesc.unload();
            this.captionElements.clear();
            this.captionsByLine.clear();
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

    // Find all image elements (only internal embeds)
    const allImageElements: Element[] = [];

    // Internal embeds only (local files)
    const internalEmbeds = el.querySelectorAll('.internal-embed.image-embed, .internal-embed.is-loaded');
    internalEmbeds.forEach(embedEl => {
        const img = embedEl.querySelector('img');
        const svg = embedEl.querySelector('svg');
        if (img || svg) {
            allImageElements.push(embedEl);
        }
    });

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
    const captionDiv = document.createElement('div');
    captionDiv.className = 'em-image-caption';

    // First line: Fig. X.X title
    if (image.tag || image.title) {
        const titleLine = document.createElement('div');
        titleLine.className = 'em-image-caption-title';

        let titleText = '';
        if (image.tag) {
            const figLabel = figCitationFormat.replace('#', image.tag);
            titleText = figLabel;
        }
        if (image.title) {
            titleText += (titleText ? ' ' : '') + image.title;
        }
        const componentTitle = new MarkdownRenderChild(titleLine);
        ctx.addChild(componentTitle);
        void  MarkdownRenderer.render(plugin.app, titleText, titleLine, ctx.sourcePath, componentTitle);
        captionDiv.appendChild(titleLine);
    }

    // Second line: description - rendered as Markdown so inline math (e.g. $n_g$) works
    if (image.desc) {
        const descLine = document.createElement('div');
        descLine.className = 'em-image-caption-desc';
        captionDiv.appendChild(descLine);

        // Tie the render's lifecycle (and any embedded widgets) to this post-processor block
        const component = new MarkdownRenderChild(descLine);
        ctx.addChild(component);
        void MarkdownRenderer.render(plugin.app, image.desc, descLine, ctx.sourcePath, component);
    }

    // Append to internal embed element
    element.appendChild(captionDiv);
}
