import { parseAllImagesFromMarkdown, ImageMatch } from '@/utils/parsers/image_parser';
import { BaseCache } from '@/cache/baseCache';
import EquationCitator from '@/main';

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
