import { EquationCitatorSettings } from "@/settings/defaultSettings";
import { DISABLED_DELIMITER } from "@/utils/string_processing/string_utils";
import {
    replaceCitationsInMarkdownWithSpan,
} from "@/utils/core/citation_utils";
import { parseAllImagesFromMarkdown } from "@/utils/parsers/image_parser";
import { isCodeBlockToggle } from "@/utils/string_processing/regexp_utils";

//////////////////////////  Make Markdown for PDF Export  ////////////////////////  

/**
 * Main function to export markdown with all citations (equations, figures, callouts) replaced
 * This is used for PDF export
 * 
 * Replace all citations in markdown with HTML inline format for PDF rendering  
 * @remarks
 * Since the original PDF rendering function is not accessible,
 * and patching it is potentially unstable, we make a  markdown copy by replacing the 
 * markdown with HTML format with inline styles for PDF export to render correctly. 
 * 
 * This is admittedly a workaround—not elegant, and somewhat crude—
 *  but it is effective and stable in most practical cases.
 */
export function makePrintMarkdown(md: string, settings: EquationCitatorSettings): string {
    const rangeSymbol = settings.enableContinuousCitation ?
        settings.continuousRangeSymbol || '~' : null;
    const fileCiteDelimiter = settings.enableCrossFileCitation ?
        settings.fileCiteDelimiter || '^' : DISABLED_DELIMITER;
    const { citationColorInPdf } = settings;

    // Step 1: Replace equation citations
    let result = replaceCitationsInMarkdownWithSpan(
        md,
        settings.citationPrefix,
        rangeSymbol,
        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.citationFormat,
        {
            citationColorInPdf
        },  // span styles 
    );

    // Step 2: Replace figure citations
    result = replaceCitationsInMarkdownWithSpan(
        result,
        settings.figCitationPrefix,
        rangeSymbol,
        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.figCitationFormat,
        {
            citationColorInPdf
        }
    );

    // Step 3: Replace callout citations (table, theorem, definition, etc.)
    for (const prefixConfig of settings.calloutCitationPrefixes) {
        result = replaceCitationsInMarkdownWithSpan(
            result,
            prefixConfig.prefix,
            rangeSymbol,
            settings.continuousDelimiters.split(' ').filter(d => d.trim()),
            fileCiteDelimiter,
            settings.multiCitationDelimiter || ',',
            prefixConfig.format,
            {
                citationColorInPdf
            }
        );
    }

    // Step 4: Add figure titles and descriptions
    result = addFigureMetadataToMarkdown(result, settings);

    return result;
}

function addFigureMetadataToMarkdownLine(args: {
    line: string;
    lineIndex: number;
    inMultilineCodeBlock: boolean;
    figureByLine: Map<number, { tag?: string; title?: string; desc?: string }>;
    settings: EquationCitatorSettings;
    addCaptions: boolean;
    addDesc: boolean;
}): { processedLines: string[]; inMultilineCodeBlock: boolean } {
    let inMultilineCodeBlock = args.inMultilineCodeBlock;

    if (isCodeBlockToggle(args.line)) {
        inMultilineCodeBlock = !inMultilineCodeBlock;
    }

    const figureOnLine = args.figureByLine.get(args.lineIndex);
    if (!figureOnLine || inMultilineCodeBlock) {
        return {
            processedLines: [args.line],
            inMultilineCodeBlock,
        };
    }

    const processedLines: string[] = [];

    const cleanedImageLine = removeImageMetadata(args.line, args.settings.figCitationPrefix);
    processedLines.push(cleanedImageLine);

    if (!args.addCaptions) {
        return {
            processedLines,
            inMultilineCodeBlock,
        };
    }

    const figNumber = args.settings.figCitationFormat.replace('#', figureOnLine.tag || '');
    processedLines.push(buildFigureTitleMarkdown(figNumber, figureOnLine.title));

    if (figureOnLine.desc && args.addDesc) {
        processedLines.push(buildFigureDescMarkdown(figureOnLine.desc));
    }

    processedLines.push('');

    return {
        processedLines,
        inMultilineCodeBlock,
    };
}

/**
 * Add figure titles and descriptions to markdown for PDF export
 * - Removes metadata from image markdown (title:, desc:, fig: tags)
 * - Adds centered figure number, title, and description below each figure
 */
function addFigureMetadataToMarkdown(markdown: string, settings: EquationCitatorSettings): string {
    if (!markdown.trim()) return markdown;

    // Parse all images to find figure metadata
    const images = parseAllImagesFromMarkdown(markdown, settings.figCitationPrefix);
    const addCaptions = settings.addImageCaptionsInPdf;
    const addDesc = settings.addImageDescInPdf;

    // Filter to only images with tags (figures)
    const figures = images.filter(img => img.tag);
    if (figures.length === 0) return markdown; // No figures to process

    const figureByLine = new Map<number, { tag?: string; title?: string; desc?: string }>();
    for (const fig of figures) {
        if (!figureByLine.has(fig.line)) {
            figureByLine.set(fig.line, fig);
        }
    }

    const lines = markdown.split('\n');
    let inMultilineCodeBlock = false;

    // Process each line and add figure metadata after image lines
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const { processedLines: lineOutput, inMultilineCodeBlock: nextInCodeBlock } = addFigureMetadataToMarkdownLine({
            line: lines[i],
            lineIndex: i,
            inMultilineCodeBlock,
            figureByLine,
            settings,
            addCaptions,
            addDesc,
        });

        inMultilineCodeBlock = nextInCodeBlock;
        processedLines.push(...lineOutput);
    }

    return processedLines.join('\n');
}

/**
 * Remove metadata from image markdown line
 * Example: ![[image.png|fig:4|title:Test|desc:Description]] → ![[image.png]]
 * Example: ![alt|fig:3|title:Test|desc:Description](url) → ![alt](url)
 */
function removeImageMetadata(line: string, figPrefix: string): string {
    // Handle weblink format: ![[path|metadata]]
    const weblinkPattern = /^!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/;
    const weblinkMatch = new RegExp(weblinkPattern).exec(line);

    if (weblinkMatch) {
        const imagePath = weblinkMatch[1].trim();
        // Return just the image path without metadata
        return `![[${imagePath}]]`;
    }

    // Handle markdown format: ![alt|metadata](url)
    const markdownPattern = /^!\[([^\]]*)\]\(([^)]+)\)$/;
    const markdownMatch = new RegExp(markdownPattern).exec(line);

    if (markdownMatch) {
        const altText = markdownMatch[1];
        const imageUrl = markdownMatch[2].trim();

        // Parse alt text to remove metadata (fig:, title:, desc:)
        // Split by | and keep only the first part (actual alt text)
        const altParts = altText.split('|').map(p => p.trim());

        // Filter out metadata parts that start with fig:, title:, or desc:
        const cleanAltParts = altParts.filter(part => {
            return !part.startsWith(figPrefix) &&
                   !part.startsWith('title:') &&
                   !part.startsWith('desc:');
        });

        // Use the first non-metadata part as alt text, or empty if none
        const cleanAlt = cleanAltParts.length > 0 ? cleanAltParts[0] : '';

        return `![${cleanAlt}](${imageUrl})`;
    }

    // Return line unchanged if it doesn't match any pattern
    return line;
}

/**
 * Build an export-safe markdown line for figure title.
 *
 * We intentionally avoid wrapping the content in block HTML because Obsidian
 * will stop parsing markdown syntax inside HTML blocks. The inline marker span
 * gives CSS a hook for centering/sizing while preserving markdown and inline math
 * in the actual title text.
 */
function buildFigureTitleMarkdown(figNumber: string, title?: string): string {
    const marker = '<span class="ec-pdf-figure-title-marker"></span>';
    const formattedNumber = figNumber.trim() ? `**${figNumber.trim()}**` : '';
    const formattedTitle = title?.trim() || '';

    if (formattedNumber && formattedTitle) {
        return `${marker}${formattedNumber}: ${formattedTitle}`;
    }

    return `${marker}${formattedNumber || formattedTitle}`;
}

/**
 * Build an export-safe markdown line for figure description.
 */
function buildFigureDescMarkdown(desc: string): string {
    return `<span class="ec-pdf-figure-desc-marker"></span>${desc.trim()}`;
}
