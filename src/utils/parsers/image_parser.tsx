import { parseMarkdownLine } from "@/utils/string_processing/string_utils";
import Debugger from "@/debug/debugger";

export type ImageType = "weblink" | "markdown" | "excalidraw";

/**
 * The matched image information
 */
export interface ImageMatch {
    raw: string;              // Full image markdown
    type: ImageType;          // Type of image format
    imagePath?: string;       // Path for weblink format (![[path]])
    imageLink?: string;       // URL for markdown format (![](url))
    tag?: string;             // e.g., "3.1", "4-1" (without prefix like "fig:")
    label?: string;           // Full label with prefix, e.g., "fig:3.1"
    title?: string;           // Optional title
    desc?: string;            // Optional description
    line: number;             // Line number where image is found
    inQuote: boolean;         // Whether in quote block (should be false as we skip quotes)
}

/**
 * Parse weblink format image: ![[image.png|fig:3.1|title:test|desc:description]]
 * @param line - The line containing the image
 * @param imagePrefix - The prefix to match (e.g., "fig:")
 * @returns ImageMatch or null if not a valid weblink image
 */
function parseWeblinkImage(line: string, imagePrefix: string): Omit<ImageMatch, 'line' | 'inQuote' | 'raw'> | null {
    // Pattern: ![[path|metadata...]]
    const weblinkPattern = /^!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/;
    const match = line.match(weblinkPattern);

    if (!match) return null;

    const imagePath = match[1].trim();
    const metadata = match[2] || '';

    // Check if it's excalidraw
    const isExcalidraw = imagePath.endsWith('.excalidraw.svg') || imagePath.endsWith('.excalidraw');

    // Parse metadata parts: fig:3.1|title:test|desc:description
    const metaParts = metadata.split('|').map(p => p.trim()).filter(p => p.length > 0);

    let tag: string | undefined;
    let label: string | undefined;
    let title: string | undefined;
    let desc: string | undefined;

    for (const part of metaParts) {
        // Check for built-in metadata keys first (title: and desc:)
        if (part.startsWith('title:')) {
            title = part.substring(6); // Remove "title:" prefix
        } else if (part.startsWith('desc:')) {
            desc = part.substring(5); // Remove "desc:" prefix
        } else if (part.startsWith(imagePrefix)) {
            // Check if it matches the image prefix (e.g., "fig:")
            if (!label) { // Take first label found
                label = part;
                tag = part.substring(imagePrefix.length); // Remove prefix to get just the tag
            }
        }
    }

    return {
        type: isExcalidraw ? 'excalidraw' : 'weblink',
        imagePath,
        tag,
        label,
        title,
        desc,
    };
}

/**
 * Parse markdown format image: ![fig:4-1|desc:wikipedia](link)
 * @param line - The line containing the image
 * @param imagePrefix - The prefix to match (e.g., "fig:")
 * @returns ImageMatch or null if not a valid markdown image
 */
function parseMarkdownImage(line: string, imagePrefix: string): Omit<ImageMatch, 'line' | 'inQuote' | 'raw'> | null {
    // Pattern: ![alt text](url)
    const markdownPattern = /^!\[([^\]]*)\]\(([^)]+)\)$/;
    const match = line.match(markdownPattern);

    if (!match) return null;

    const altText = match[1].trim();
    const imageLink = match[2].trim();

    // Parse alt text for metadata: fig:4-1|desc:wikipedia
    const metaParts = altText.split('|').map(p => p.trim()).filter(p => p.length > 0);

    let tag: string | undefined;
    let label: string | undefined;
    let title: string | undefined;
    let desc: string | undefined;

    for (const part of metaParts) {
        // Check for built-in metadata keys first (title: and desc:)
        if (part.startsWith('title:')) {
            title = part.substring(6); // Remove "title:" prefix
        } else if (part.startsWith('desc:')) {
            desc = part.substring(5); // Remove "desc:" prefix
        } else if (part.startsWith(imagePrefix)) {
            // Check if it matches the image prefix (e.g., "fig:")
            if (!label) { // Take first label found
                label = part;
                tag = part.substring(imagePrefix.length); // Remove prefix to get just the tag
            }
        } else if (!label && !title) {
            // If no prefix match and no label/title found yet, use as title
            title = part;
        }
    }

    return {
        type: 'markdown',
        imageLink,
        tag,
        label,
        title,
        desc,
    };
}

/**
 * Parse a single image line and return ImageMatch if valid
 * @param line - The line to parse
 * @param lineNumber - Line number in the document
 * @param imagePrefix - The prefix to match (e.g., "fig:")
 * @returns ImageMatch or null if not a valid image
 */
function parseImageLine(line: string, lineNumber: number, imagePrefix: string): ImageMatch | null {
    const trimmedLine = line.trim();

    // Must start with ! to be an image
    if (!trimmedLine.startsWith('!')) return null;

    // we retain the weblink format parser here (since we )
    // const weblinkResult = parseWeblinkImage(trimmedLine, imagePrefix);
    // if (weblinkResult) {
    //     return {
    //         ...weblinkResult,
    //         raw: trimmedLine,
    //         line: lineNumber,
    //         inQuote: false,
    //     };
    // }

    // Try parse markdown format images
    const markdownResult = parseMarkdownImage(trimmedLine, imagePrefix);
    if (markdownResult) {
        return {
            ...markdownResult,
            raw: trimmedLine,
            line: lineNumber,
            inQuote: false,
        };
    }

    return null;
}

/**
 * Parse all images in markdown content
 * Only parses images that:
 * - Take the whole line (after trimming)
 * - Start with ! (are displayed)
 * - Are NOT inside quote blocks
 * 
 * Supports following types (local file only):
 * 1. Weblink: ![[image.png|fig:3.1|title:test|desc:description]]
 * 2. Markdown: ![fig:4-1|desc:wikipedia](link)
 *
 * @param markdown - The markdown content to parse
 * @param imagePrefix - The prefix to match (e.g., "fig:"), default is "fig:"
 * @returns Array of ImageMatch objects
 */
export function parseAllImagesFromMarkdown(
    markdown: string, 
    imagePrefix: string): ImageMatch[] {
    
    if (!markdown.trim()) return [];

    const lines = markdown.split('\n');
    const images: ImageMatch[] = [];

    let inCodeBlock = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        // Parse line to check environment (quotes, code blocks, etc.)
        const parseResult = parseMarkdownLine(line, false, inCodeBlock);
        
        // Update code block state
        if (parseResult.isCodeBlockToggle) {
            inCodeBlock = !inCodeBlock;
        }

        // Skip lines in code blocks
        if (inCodeBlock) continue;

        // Skip lines in quotes (we parse with parseQuotes=false, so this should be caught)
        if (parseResult.inQuote) continue;

        // Skip lines that are not images (optimization)
        if (!parseResult.isImage) continue;

        // Get the processed content (with quotes removed if any)
        const processedLine = parseResult.processedContent.trim();
        
        // Try to parse as image
        const imageMatch = parseImageLine(processedLine, lineNum, imagePrefix);

        if (imageMatch) {
            images.push(imageMatch);
            Debugger.log(`Parsed image at line ${imageMatch.line}: type=${imageMatch.type}, label=${imageMatch.label}`);
        }
    }
    Debugger.log(`Total images parsed: ${images.length}`);
    return images;
}

/**
 * Parse the first image with the given tag in the markdown content
 * TODO : improve performance 
 * @param markdown - The markdown content to parse
 * @param tag - The tag to search for (without prefix, e.g., "3.1" not "fig:3.1")
 * @param imagePrefix - The prefix to match (e.g., "fig:"), default is "fig:"
 * @returns The first ImageMatch with the matching tag, or undefined if not found
 */
export function parseFirstImageInMarkdown(
    markdown: string, tag: string, 
    imagePrefix = "fig:"
): ImageMatch | undefined {
    if (!markdown.trim() || !tag.trim()) return undefined;
    const allImages = parseAllImagesFromMarkdown(markdown, imagePrefix);
    return allImages.find(img => img.tag === tag);
}
