import { EquationCitatorSettings } from "@/settings/defaultSettings";
import { DISABLED_DELIMITER } from "@/utils/string_processing/string_utils";
import {
    replaceCitationsInMarkdownWithSpan,
    SpanStyles
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
        } as SpanStyles,
    );

    // Step 2: Replace figure citations
    result = replaceFigureCitationsInMarkdown(
        result,
        settings.figCitationPrefix,
        rangeSymbol,
        settings.continuousDelimiters.split(' ').filter(d => d.trim()),
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.figCitationFormat,
        {
            citationColorInPdf
        } as SpanStyles
    );

    // Step 3: Replace callout citations (table, theorem, definition, etc.)
    for (const prefixConfig of settings.calloutCitationPrefixes) {
        result = replaceCalloutCitationsInMarkdown(
            result,
            prefixConfig.prefix,
            rangeSymbol,
            settings.continuousDelimiters.split(' ').filter(d => d.trim()),
            fileCiteDelimiter,
            settings.multiCitationDelimiter || ',',
            prefixConfig.format,
            {
                citationColorInPdf
            } as SpanStyles
        );
    }

    // Step 4: Add figure titles and descriptions
    result = addFigureMetadataToMarkdown(result, settings);

    return result;
}

/**
 * Replace figure citations with styled spans for PDF export
 * Similar to replaceCitationsInMarkdownWithSpan but for figures
 */
function replaceFigureCitationsInMarkdown(
    markdown: string,
    figPrefix: string,
    rangeSymbol: string | null,
    validDelimiters: string[],
    fileDelimiter: string,
    multiCitationDelimiter: string,
    citationFormat: string,
    spanStyles: SpanStyles
): string {
    // Reuse the same logic as equation citations, just with different prefix
    return replaceCitationsInMarkdownWithSpan(
        markdown,
        figPrefix,
        rangeSymbol,
        validDelimiters,
        fileDelimiter,
        multiCitationDelimiter,
        citationFormat,
        spanStyles
    );
}

/**
 * Replace callout citations (table, thm, def, etc.) with styled spans for PDF export
 */
function replaceCalloutCitationsInMarkdown(
    markdown: string,
    calloutPrefix: string,
    rangeSymbol: string | null,
    validDelimiters: string[],
    fileDelimiter: string,
    multiCitationDelimiter: string,
    citationFormat: string,
    spanStyles: SpanStyles
): string {
    // Reuse the same logic as equation citations, just with different prefix
    return replaceCitationsInMarkdownWithSpan(
        markdown,
        calloutPrefix,
        rangeSymbol,
        validDelimiters,
        fileDelimiter,
        multiCitationDelimiter,
        citationFormat,
        spanStyles
    );
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

    // Filter to only images with tags (figures)
    const figures = images.filter(img => img.tag);

    if (figures.length === 0) {
        return markdown; // No figures to process
    }

    const lines = markdown.split('\n');
    let inMultilineCodeBlock = false;

    // Process each line and add figure metadata after image lines
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track code block state
        if (isCodeBlockToggle(line)) {
            inMultilineCodeBlock = !inMultilineCodeBlock;
        }

        // Check if this line contains a figure
        const figureOnLine = figures.find(fig => fig.line === i);

        if (figureOnLine && !inMultilineCodeBlock) {
            // Remove metadata from image line
            const cleanedImageLine = removeImageMetadata(line, settings.figCitationPrefix);

            // Add the cleaned image line (without center tags - markdown won't center properly)
            processedLines.push(cleanedImageLine);

            // Build caption with figure number and title
            const figNumber = settings.figCitationFormat.replace('#', figureOnLine.tag || '');

            // Combine figure number with title if title exists
            let captionText = figNumber;
            if (figureOnLine.title) {
                captionText = `${figNumber}: ${figureOnLine.title}`;
            }

            // Add figure number and title as centered bold text
            processedLines.push(`<center><strong>${escapeHtml(captionText)}</strong></center>`);

            // Add description if present
            if (figureOnLine.desc) {
                const descHtml = `<center><small>${escapeHtml(figureOnLine.desc)}</small></center>`;
                processedLines.push(descHtml);
            }

            // Add an empty line after metadata for better spacing
            processedLines.push('');
        } else {
            // Add the original line unchanged
            processedLines.push(line);
        }
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
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replaceAll(/[&<>"']/g, char => htmlEscapeMap[char]);
}
