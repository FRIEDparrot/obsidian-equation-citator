import {
    AutoNumberConfigs,
    AutoNumberProceedResult,
    AutoNumberingState,
    generateNextTagForAutoNumber,
    processCodeBlockAndHeading,
} from "./auto_number_core";
import { parseHeadingsInMarkdown, Heading } from "../parsers/heading_parser";
import { ImageMatch, parseImageLine } from "../parsers/image_parser";
import { weblinkImagePattern, markdownImagePattern } from "../string_processing/regexp_utils";
import { parseMarkdownLine } from "../string_processing/string_utils";


export interface FigAutoNumberConfigs extends AutoNumberConfigs {
    figCitationPrefix: string,
}

/**
 * Auto number all the figures in the given markdown content based on the specified configurations.
 * 
 * This function not update citation, use `autoNumberCurrentFileFigures` in real function call.
 * 
 * @remarks process for quotes is handled inside parseMarkdownLine function
 * 
 * @param content - the markdown content to process 
 * @param figCitationPrefix - the prefix for figure citations (e.g., "fig:")
 * @param configs - the auto-numbering related configurations, including type, depth, delimiter, etc.
 */
export function autoNumberFigures(
    content: string,
    configs: FigAutoNumberConfigs,
): AutoNumberProceedResult {
    const {
        autoNumberingType,
        maxDepth,
        delimiter,
        noHeadingPrefix,
        globalPrefix,
        parseQuotes,
        enableTaggedOnly,
        figCitationPrefix,
    } = configs;
    const lines = content.split('\n');
    const headings: Heading[] = parseHeadingsInMarkdown(content);

    let inCodeBlock = false;
    const levelCounters: number[] = new Array(maxDepth).fill(0);

    const numberingState: AutoNumberingState = {
        levelCounters,
        objNumberBeforeHeading: 0,
        objNumber: 0,
        currentDepth: 0,
        maxDepth,
        delimiter,
        globalPrefix,
        noHeadingPrefix,
    };
    let currentHeadingIndex = 0;
    const tagMapping = new Map<string, string>();
    const result: string[] = [];

    for (const line of lines) {
        const parseResult = parseMarkdownLine(line, parseQuotes, inCodeBlock);

        // Process code blocks and headings
        const processResult = processCodeBlockAndHeading(
            parseResult,
            inCodeBlock,
            numberingState,
            currentHeadingIndex,
            headings,
            autoNumberingType
        );

        inCodeBlock = processResult.inCodeBlock;
        currentHeadingIndex = processResult.currentHeadingIndex;

        if (processResult.shouldContinue || !parseResult.isImage) {
            result.push(line);
            continue;
        }
        // the isImage only parse the first ! in the line, so we still need to parse the line strictly
        const image: ImageMatch | null = parseImageLine(line, 0, figCitationPrefix);
        const shouldNumber = (!enableTaggedOnly || image?.tag)
        if (!image || (image.inQuote && !parseQuotes) || !shouldNumber) {
            result.push(line);
            continue;
        }
        const newTag = generateNextTagForAutoNumber(numberingState);
        const addResult = addTagToImage(image, newTag, figCitationPrefix);

        if (addResult.valid) {
            // Add tag mapping if there was an old tag
            if (addResult.oldTag && !tagMapping.has(addResult.oldTag)) {
                tagMapping.set(addResult.oldTag, newTag);
            }
            result.push(addResult.processedLine);
        } else {
            result.push(line);
        }
    }

    return {
        md: result.join('\n'),
        tagMapping
    };
}

/**
 * Helper function to reconstruct a WikiLink or Excalidraw image with a new tag
 * 
 * @param image - The parsed ImageMatch object
 * @param newLabel - The new label with prefix (e.g., "fig:1.1")
 * @param originalLine - The original line containing the image
 * @param figCitationPrefix - The prefix for figure citations (e.g., "fig:")
 * @returns The reconstructed image markdown string
 */
function reconstructWikiLinkImage(
    image: ImageMatch,
    newLabel: string,
    figCitationPrefix: string
): string {
    const originalLine = image.raw;
    // Extract quote prefix if present
    const quotePrefixMatch = image.inQuote ? /^((?:>\s*)+)/.exec(originalLine) : null;
    const quotePrefix = quotePrefixMatch ? quotePrefixMatch[1] : '';

    // Get the actual image content without quote prefix
    const contentWithoutQuote = originalLine.substring(quotePrefix.length);

    // Parse the original metadata from the raw string
    const match = new RegExp(weblinkImagePattern).exec(contentWithoutQuote);
    if (!match) return originalLine;

    const imagePath = match[1].trim();
    const metadata = match[2] || '';

    // Parse metadata parts
    const metaParts = metadata.split('|').map(p => p.trim()).filter(p => p.length > 0);

    // If no metadata, just add the new label
    if (metaParts.length === 0) {
        return quotePrefix + `![[${imagePath}|${newLabel}]]`;
    }

    // Check if the last part is a pure number (width/size parameter)
    const lastPart = metaParts.at(-1)!;
    const isLastPartNumber = /^\d+$/.test(lastPart);

    // determine the parts to process (all except the last one if it's a number)
    const partsToProcess = isLastPartNumber ? metaParts.slice(0, -1) : metaParts;

    // Process parts: keep title/desc, remove old tags
    const newMetaParts: string[] = [];
    for (const part of partsToProcess) {
        if (part.startsWith('title:') || part.startsWith('desc:')) {
            newMetaParts.push(part);
        } else if (part.startsWith(figCitationPrefix)) {
            // Skip old tag (we'll add the new one)
            continue;
        } else {
            // Keep other metadata
            newMetaParts.push(part);
        }
    }

    // Add the new tag
    newMetaParts.push(newLabel);
    // Add the last part back if it was a number
    if (isLastPartNumber) {
        newMetaParts.push(lastPart);
    }

    // Reconstruct the image
    const result = `![[${imagePath}|${newMetaParts.join('|')}]]`;
    return quotePrefix + result;
}

/**
 * Helper function to reconstruct a Markdown format image with a new tag
 * 
 * @param image - The parsed ImageMatch object
 * @param newLabel - The new label with prefix (e.g., "fig:1.2")
 * @param originalLine - The original line containing the image
 * @param figCitationPrefix - The prefix for figure citations (e.g., "fig:")
 * @returns The reconstructed image markdown string
 */
function reconstructMarkdownImage(
    image: ImageMatch,
    newLabel: string,
    figCitationPrefix: string
): string {
    const originalLine = image.raw;
    // Extract quote prefix if present
    const quotePrefixMatch = image.inQuote ? /^((?:>\s*)+)/.exec(originalLine) : null;
    const quotePrefix = quotePrefixMatch ? quotePrefixMatch[1] : '';

    // Get the actual image content without quote prefix
    const contentWithoutQuote = originalLine.substring(quotePrefix.length);

    // Parse the original alt text from the raw string
    const match = new RegExp(markdownImagePattern).exec(contentWithoutQuote);
    if (!match) return originalLine;

    const altText = match[1].trim();
    const imageLink = match[2].trim();

    // Parse alt text parts
    const metaParts = altText.split('|').map(p => p.trim()).filter(p => p.length > 0);

    // If no metadata, just add the new label
    if (metaParts.length === 0) {
        return quotePrefix + `![${newLabel}](${imageLink})`;
    }

    // Check if the last part is a pure number (width/size parameter)
    const lastPart = metaParts.at(-1)!;
    const isLastPartNumber = /^\d+$/.test(lastPart);

    // Determine which parts to process
    const partsToProcess = isLastPartNumber ? metaParts.slice(0, -1) : metaParts;
    const newMetaParts: string[] = [];
    for (const part of partsToProcess) {
        if (part.startsWith('title:') || part.startsWith('desc:')) {
            newMetaParts.push(part);
        } else if (part.startsWith(figCitationPrefix)) {
            // Skip old tag (we'll add the new one)
            continue;
        } else {
            // Keep other metadata
            newMetaParts.push(part);
        }
    }

    // Add the new tag
    newMetaParts.push(newLabel);

    // Add the last part back if it was a number
    if (isLastPartNumber) {
        newMetaParts.push(lastPart);
    }

    // Reconstruct the image
    const result = `![${newMetaParts.join('|')}](${imageLink})`;

    return quotePrefix + result;
}

/**
 * Adds or replaces a tag in an image line
 * 
 * This function handles both WikiLink format (`![[image|metadata]]`) and Markdown format (`![alt](url)`) images.
 * When adding a tag, it ensures the tag is placed before any size parameters (numeric values).
 * 
 * @param line - The line to process (may contain an image)
 * @param newTag - The new tag to add (without prefix, e.g., "1.1")
 * @param figCitationPrefix - The prefix for figure citations (e.g., "fig:")
 * @param parseQuotes - Whether to parse images inside quote blocks
 * 
 * @returns An object containing:
 *   - `valid`: Whether a valid image was found and processed
 *   - `oldTag`: The old tag if one existed, otherwise null
 *   - `processedLine`: The processed line with the new tag, or the original line if not valid
 * 
 * @example
 * // WikiLink format
 * addTagToImage("![[image|400]]", "1.1", "fig:", false)
 * // Returns: { valid: true, oldTag: null, processedLine: "![[image|fig:1.1|400]]" }
 * 
 * addTagToImage("![[image|fig:old|400]]", "1.1", "fig:", false)
 * // Returns: { valid: true, oldTag: "old", processedLine: "![[image|fig:1.1|400]]" }
 * 
 * @example
 * // Markdown format
 * addTagToImage("![400](url)", "1.2", "fig:", false)
 * // Returns: { valid: true, oldTag: null, processedLine: "![fig:1.2|400](url)" }
 * 
 * addTagToImage("![fig:old|400](url)", "1.2", "fig:", false)
 * // Returns: { valid: true, oldTag: "old", processedLine: "![fig:1.2|400](url)" }
 */
function addTagToImage(
    image: ImageMatch,
    newTag: string,
    figCitationPrefix: string,
): {
    valid: boolean;
    oldTag: string | null;
    processedLine: string;
} {
    const oldTag = image.tag || null;
    const newLabel = `${figCitationPrefix}${newTag}`;

    // Reconstruct the image with the new tag
    let processedLine: string;
    if (image.type === 'wikilink' || image.type === 'excalidraw') {
        processedLine = reconstructWikiLinkImage(image, newLabel, figCitationPrefix);
    } else {
        // markdown type
        processedLine = reconstructMarkdownImage(image, newLabel, figCitationPrefix);
    }

    return {
        valid: true,
        oldTag: oldTag,
        processedLine: processedLine
    };
}