import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { FootNote } from "@/utils/parsers/footnote_parser";
import { splitFileCitation } from "@/utils/core/citation_utils";
import { ImageMatch } from "@/utils/parsers/image_parser";
import { normalizePath } from "obsidian";

export interface RenderedFigure {
    tag: string;  // tag of the figure (without prefix)
    imagePath?: string;   // path for wikilink format (no need to be a correct file path)
    imageLink?: string;   // URL for markdown format
    title?: string;  // figure title
    desc?: string;   // figure description
    sourcePath: string | null; // the file path where the figure is referenced
    filename: string | null;   // filename to be rendered in preview 
    footnoteIndex: string | null; // index of the footnote (used for render citation)
}

/**
 * Service class for handling figure-related operations
 * Similar to EquationServices but for images/figures
 */
export class FigureServices {
    constructor(
        private readonly plugin: EquationCitator
    ) { }

    /**
     * Retrieves figures by their tags from a specified source file
     * Handles both local and cross-file figure references. 
     * @remarks The input is the figureTagsAll (which is 1^1.1, 1^3.2, 1^4.1) 
     *    this function retrieve the corresponding figure information for each tag
     * @remarks This operation query both footnoteCache and imageCache, so it should be optimized and only called when necessary
     * @param figureTagsAll - An array of figure tags to retrieve
     * @param sourcePath - The path of the source file where the figures are referenced
     * @returns A promise that resolves to an array of RenderedFigure objects
     */
    public async getFiguresByTags(figureTagsAll: string[], sourcePath: string): Promise<RenderedFigure[]> {
        const normalizedSourcePath = normalizePath(sourcePath);
        const { enableCrossFileCitation, fileCiteDelimiter,  enableRenderLocalFileName } = this.plugin.settings;
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(normalizedSourcePath);  // get footnotes from cache 

        const figures: RenderedFigure[] = figureTagsAll.map(tag => {
            const { local, crossFile } = enableCrossFileCitation
                ? splitFileCitation(tag, fileCiteDelimiter)
                : { local: tag, crossFile: null };

            const { path, filename } = crossFile
                ? this.resolveCrossFileRef(normalizedSourcePath, crossFile, footnotes)
                : {
                    path: normalizedSourcePath,
                    filename: enableRenderLocalFileName ?
                        this.plugin.app.workspace.getActiveFile()?.name || null : null
                };

            return {
                tag: local,
                sourcePath: path,
                filename: filename,
                footnoteIndex: crossFile
            };
        });

        const validFigures = figures.filter(fig => fig.sourcePath !== null);
        if (validFigures.length === 0) {
            Debugger.log("No valid figures found");
            return [];
        }

        return this.fillFiguresContent(validFigures);
    }

    /**
     * Fill figure content by querying the imageCache
     * This function map the ImageMatch object to RenderedFigure.
     */
    private async fillFiguresContent(figures: RenderedFigure[]): Promise<RenderedFigure[]> {
        // Get unique file paths
        const uniquePaths = [...new Set(figures.map(fig => fig.sourcePath))].filter(p => p !== null);
        const fileImagesMap = new Map<string, ImageMatch[]>();

        for (const filePath of uniquePaths) {
            if (!filePath) continue;
            const images = await this.plugin.imageCache.getImagesForFile(filePath);
            if (images) {
                fileImagesMap.set(filePath, images);
            }
        }

        // Fill content for each figure
        return figures.map(fig => {
            const fileImages = fig.sourcePath ? fileImagesMap.get(fig.sourcePath) : undefined;
            const matchedImage: ImageMatch | undefined = fileImages?.find(cached => cached.tag === fig.tag);

            return {
                ...fig,
                imagePath: matchedImage?.imagePath,
                imageLink: matchedImage?.imageLink,
                title: matchedImage?.title,
                desc: matchedImage?.desc,
            };
        });
    }

    /**
     * Get figures for autocomplete suggestions
     */
    public async getFiguresForAutocomplete(tag: string, sourcePath: string): Promise<RenderedFigure[]> {
        const normalizedSourcePath = normalizePath(sourcePath);
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(normalizedSourcePath);
        const { local, crossFile } = this.plugin.settings.enableCrossFileCitation ?
            splitFileCitation(tag, this.plugin.settings.fileCiteDelimiter) :
            { local: tag, crossFile: null };

        const { path, filename } = crossFile === null ?
            { path: normalizedSourcePath, filename: this.plugin.app.workspace.getActiveFile()?.name || null } :
            this.resolveCrossFileRef(normalizedSourcePath, crossFile, footnotes);

        if (!path) return [];

        const imagesAll = await this.plugin.imageCache.getImagesForFile(path);
        const images = imagesAll?.filter(img => img.tag?.startsWith(local)) || [];
        if (images.length === 0) return [];

        return images.map(img => ({
            tag: img.tag || '',
            imagePath: img.imagePath,
            imageLink: img.imageLink,
            title: img.title,
            desc: img.desc,
            sourcePath: path,
            filename,
            footnoteIndex: crossFile
        }) as RenderedFigure);
    }

    /**
     * Resolve cross-file reference using footnotes
     */
    private resolveCrossFileRef(sourcePath: string, crossFile: string, footnotes: FootNote[] | undefined) {
        const match = footnotes?.find(f => f.num === crossFile);
        if (!match?.path) return { path: null, filename: null };

        const file = this.plugin.app.metadataCache.getFirstLinkpathDest(match.path, sourcePath);
        if (!file) {
            Debugger.log("Invalid footnote file path: ", match.path);
            return { path: null, filename: null };
        }

        return { path: file.path, filename: match.label || null };
    }
}
