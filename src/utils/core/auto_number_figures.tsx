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
        // this is wrong, 
        const newTag = generateNextTagForAutoNumber(numberingState);
        const addResult = addTagToImage(line, newTag, figCitationPrefix, parseQuotes);
        
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
    originalLine: string, 
    figCitationPrefix: string
): string {
    // Extract quote prefix if present
    const quotePrefixMatch = /^((?:>\s*)+)/.exec(originalLine);
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
    
    // Categorize parts: separate tags, metadata, and size parameters
    const newMetaParts: string[] = [];
    const sizeParts: string[] = [];
    
    for (const part of metaParts) {
        // Check if it's a size parameter (numeric only)
        if (/^\d+$/.test(part)) {
            sizeParts.push(part);
        } else if (part.startsWith('title:') || part.startsWith('desc:')) {
            // Keep title and desc
            newMetaParts.push(part);
        } else if (part.startsWith(figCitationPrefix)) {
            // This is the old tag, skip it (we'll add the new tag later)
            continue;
        } else {
            // Other metadata
            newMetaParts.push(part);
        }
    }
    
    // Add the new tag before size parts
    const finalMetaParts = [...newMetaParts, newLabel, ...sizeParts];
    
    // Reconstruct the image
    let result: string;
    if (finalMetaParts.length > 0) {
        result = `![[${imagePath}|${finalMetaParts.join('|')}]]`;
    } else {
        result = `![[${imagePath}|${newLabel}]]`;
    }
    
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
    originalLine: string,
    figCitationPrefix: string
): string {
    // Extract quote prefix if present
    const quotePrefixMatch = /^((?:>\s*)+)/.exec(originalLine);
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
    
    // Categorize parts: separate tags, metadata, and size parameters
    const newMetaParts: string[] = [];
    const sizeParts: string[] = [];
    
    for (const part of metaParts) {
        // Check if it's a size parameter (numeric only)
        if (/^\d+$/.test(part)) {
            sizeParts.push(part);
        } else if (part.startsWith('title:') || part.startsWith('desc:')) {
            // Keep title and desc
            newMetaParts.push(part);
        } else if (part.startsWith(figCitationPrefix)) {
            // This is the old tag, skip it (we'll add the new tag later)
            continue;
        } else {
            // Other metadata (title without prefix)
            newMetaParts.push(part);
        }
    }
    
    // Add the new tag before size parts
    const finalMetaParts = [...newMetaParts, newLabel, ...sizeParts];
    
    // Reconstruct the image
    const result = `![${finalMetaParts.join('|')}](${imageLink})`;
    
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
    line: string,
    newTag: string,
    figCitationPrefix: string,
    parseQuotes: boolean
): {
    valid: boolean;
    oldTag: string | null;
    processedLine: string;
} {
    // Try to parse the line as an image
    const image = parseImageLine(line, 0, figCitationPrefix);
    
    // If not a valid image or if it's in a quote and we're not parsing quotes
    if (!image || (image.inQuote && !parseQuotes)) {
        return {
            valid: false,
            oldTag: null,
            processedLine: line
        };
    }
    
    const oldTag = image.tag || null;
    const newLabel = `${figCitationPrefix}${newTag}`;
    
    // Reconstruct the image with the new tag
    let processedLine: string;
    
    if (image.type === 'wikilink' || image.type === 'excalidraw') {
        processedLine = reconstructWikiLinkImage(image, newLabel, line, figCitationPrefix);
    } else {
        // markdown type
        processedLine = reconstructMarkdownImage(image, newLabel, line, figCitationPrefix);
    }
    
    return {
        valid: true,
        oldTag: oldTag,
        processedLine: processedLine
    };
}