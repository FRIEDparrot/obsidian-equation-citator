import { parseAllImagesFromMarkdown, ImageMatch } from '@/utils/parsers/image_parser';
import { BaseCache } from '@/cache/baseCache';
import EquationCitator from '@/main';
import { TFile, normalizePath } from 'obsidian';
import { isMarkdownFilePath } from '@/utils/misc/fileProcessor';
import Debugger from '@/debug/debugger';

/**
 * Cache for parsed images in markdown files
 * Stores image data including path, tag, title, and description
 */
export class ImageCache extends BaseCache<ImageMatch> {
    constructor(plugin: EquationCitator) {
        super(plugin);
    }

    protected parseMarkdown(markdown: string): ImageMatch[] {
        return parseAllImagesFromMarkdown(markdown, this.plugin.settings.figCitationPrefix);
    }

    /**
     * Override updateCache to add post-processing for heading links
     */
    async updateCache(sourcePath: string): Promise<void> {
        if (this.isDestroyed) return;
        this.autoCleanCache();

        const normalizedPath = normalizePath(sourcePath);
        const key = normalizedPath;
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(isMarkdownFilePath(normalizedPath) && file instanceof TFile)) {
            this.cache.delete(key);
            return;
        }
        try {
            const markdown = await this.plugin.app.vault.cachedRead(file);
            const data = this.parseMarkdown(markdown);
            
            // Post-process: prepend file path to heading links (imagePath starting with #)
            const processedData = data.map(img => {
                if (img.imagePath?.startsWith('#')) {
                    const newImagePath = `${normalizedPath}${img.imagePath}`;
                    // Also update raw to include the full path
                    const newRaw = img.raw.replace(img.imagePath, newImagePath);
                    return {
                        ...img,
                        imagePath: newImagePath,
                        raw: newRaw
                    };
                }
                return img;
            });
            
            this.cache.set(key, { hash: key, lastUpdated: Date.now(), data: processedData });
        }
        catch (error) {
            this.cache.delete(key);
            Debugger.error(`Failed to update image cache: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected getCacheTypeName(): string {
        return 'image';
    }

    /**
     * Get images for a specific file
     * @param sourcePath - Path to the file
     * @returns Array of ImageMatch objects
     */
    async getImagesForFile(sourcePath: string): Promise<ImageMatch[] | undefined> {
        return this.getDataForFile(sourcePath);
    }

    /**
     * Find a specific image by its tag in a file
     * @param sourcePath - Path to the file
     * @param tag - The tag to search for (without prefix, e.g., "3.1" not "fig:3.1")
     * @returns The matched ImageMatch or undefined
     */
    async getImageByTag(sourcePath: string, tag: string): Promise<ImageMatch | undefined> {
        const images = await this.getImagesForFile(sourcePath);
        return images?.find(img => img.tag === tag);
    }
}
