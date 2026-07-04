import type { EquationCitatorSettings } from "@/settings/defaultSettings";
import { combineContinuousCitationTags, splitContinuousCitationTags, splitFileCitation } from "@/utils/core/citation_utils";
import { DISABLED_DELIMITER, escapeString, removeInlineCodeBlocks, validateNumber } from "@/utils/string_processing/string_utils";
import {
    equationBlockBracePattern,
    equationBlockStartPatternWithWhiteSpace,
    inlineMathPattern,
    isCodeBlockToggle,
    matchNestedCitation,
} from "@/utils/string_processing/regexp_utils";
import { parseAllImagesFromMarkdown } from "@/utils/parsers/image_parser";

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
    const validDelimiters = settings.continuousDelimiters.split(' ').filter(d => d.trim());
    const injectExportMetadata = settings.injectCitationMetadataInExportedMarkdown;

    // Step 1: Replace equation citations
    let result = replaceCitationsInMarkdownWithSpan(
        md,
        settings.citationPrefix,
        rangeSymbol,
        validDelimiters,
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.citationFormat,
        {
            citationColorInPdf
        },  // span styles
        injectExportMetadata ? {
            kind: getCitationDataKind(settings.citationPrefix),
            citationKind: "equation",
            rangeSymbol,
            validDelimiters,
            fileDelimiter: fileCiteDelimiter,
        } : undefined,
    );

    // Step 2: Replace figure citations
    result = replaceCitationsInMarkdownWithSpan(
        result,
        settings.figCitationPrefix,
        rangeSymbol,
        validDelimiters,
        fileCiteDelimiter,
        settings.multiCitationDelimiter || ',',
        settings.figCitationFormat,
        {
            citationColorInPdf
        },
        injectExportMetadata ? {
            kind: getCitationDataKind(settings.figCitationPrefix),
            citationKind: "figure",
            rangeSymbol,
            validDelimiters,
            fileDelimiter: fileCiteDelimiter,
        } : undefined,
    );

    // Step 3: Replace callout citations (table, theorem, definition, etc.)
    for (const prefixConfig of settings.calloutCitationPrefixes) {
        result = replaceCitationsInMarkdownWithSpan(
            result,
            prefixConfig.prefix,
            rangeSymbol,
            validDelimiters,
            fileCiteDelimiter,
            settings.multiCitationDelimiter || ',',
            prefixConfig.format,
            {
                citationColorInPdf
            },
            injectExportMetadata ? {
                kind: getCitationDataKind(prefixConfig.prefix),
                citationKind: "callout",
                rangeSymbol,
                validDelimiters,
                fileDelimiter: fileCiteDelimiter,
            } : undefined,
        );
    }

    // Step 4: Add figure titles and descriptions
    result = addFigureMetadataToMarkdown(result, settings);

    return result;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function addFigureMetadataToMarkdownLine(args: {
    line: string;
    lineIndex: number;
    previousLine?: string;
    nextLine?: string;
    previousLineIsImage: boolean;
    inMultilineCodeBlock: boolean;
    imageLines: Set<number>;
    figureByLine: Map<number, { tag?: string; title?: string; desc?: string }>;
    settings: EquationCitatorSettings;
    addCaptions: boolean;
    addDesc: boolean;
}): { processedLines: string[]; inMultilineCodeBlock: boolean } {
    let inMultilineCodeBlock = args.inMultilineCodeBlock;

    if (isCodeBlockToggle(args.line)) {
        inMultilineCodeBlock = !inMultilineCodeBlock;
    }

    const imageOnLine = args.imageLines.has(args.lineIndex);
    const figureOnLine = args.figureByLine.get(args.lineIndex);
    if (!imageOnLine || inMultilineCodeBlock) {
        return {
            processedLines: [args.line],
            inMultilineCodeBlock
        };
    }

    const processedLines: string[] = [];
    if (args.settings.keepImageSpacingForPdf && shouldAddBlankBeforeFigure(args.previousLine, args.previousLineIsImage)) {
        processedLines.push('');
    }

    const imageLine = (args.settings.injectCitationMetadataInExportedMarkdown || !figureOnLine) ?
        args.line :
        removeImageMetadata(args.line, args.settings.figCitationPrefix, true);
    processedLines.push(imageLine);

    if (!figureOnLine || !args.addCaptions) {
        if (args.settings.keepImageSpacingForPdf && shouldAddBlankAfterFigure(args.nextLine)) {
            processedLines.push('');
        }

        return {
            processedLines,
            inMultilineCodeBlock
        };
    }

    const figNumber = args.settings.figCitationFormat.replace('#', figureOnLine.tag || '');
    processedLines.push(buildFigureTitleMarkdown(figNumber, figureOnLine.title));

    if (figureOnLine.desc && args.addDesc) {
        processedLines.push(''); // add another line for separate the paragraph 
        processedLines.push(buildFigureDescMarkdown(figureOnLine.desc));
    }

    if (args.settings.keepImageSpacingForPdf && shouldAddBlankAfterFigure(args.nextLine)) {
        processedLines.push('');
    }

    return {
        processedLines,
        inMultilineCodeBlock
    };
}

function shouldAddBlankBeforeFigure(previousLine: string | undefined, previousLineIsImage: boolean): boolean {
    return !previousLineIsImage && previousLine !== undefined && previousLine.trim().length > 0;
}

function shouldAddBlankAfterFigure(nextLine?: string): boolean {
    return nextLine !== undefined && nextLine.trim().length > 0;
}

/**
 * Add figure titles and descriptions to markdown for PDF export
 * - Removes metadata from image markdown (title:, desc:, fig: tags) only when export metadata is disabled
 * - Preserves image metadata when export metadata is enabled, so figures can be indexed from the image line
 * - Adds centered figure number, title, and description below each figure
 */
function addFigureMetadataToMarkdown(markdown: string, settings: EquationCitatorSettings): string {
    if (!markdown.trim()) return markdown;

    // Parse all images to find figure metadata
    const images = parseAllImagesFromMarkdown(markdown, settings.figCitationPrefix);
    const addCaptions = settings.addImageCaptionsInPdf;
    const addDesc = settings.addImageDescInPdf;
    const imageLines = new Set(images.map(img => img.line));

    // Filter to only images with tags (figures)
    const figures = images.filter(img => img.tag);
    if (imageLines.size === 0) return markdown; // No images to process

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
            previousLine: lines[i - 1],
            nextLine: lines[i + 1],
            previousLineIsImage: imageLines.has(i - 1),
            inMultilineCodeBlock,
            imageLines,
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
 * Example: ![[image.png|fig:4|title:Test|desc:Description|width]] → ![[image.png|width]]
 * Example: ![alt|fig:3|title:Test|desc:Description](url) → ![alt](url)
 */
function removeImageMetadata(line: string, figPrefix: string, keepWidth: boolean): string {
    // Handle weblink format: ![[path|metadata]]
    const weblinkPattern = /^!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/;
    const weblinkMatch = new RegExp(weblinkPattern).exec(line);

    if (weblinkMatch) {
        const imagePath = weblinkMatch[1].trim();
        const metadata = weblinkMatch[2] || '';
        const width = keepWidth ? getLastMetadataWidth(metadata) : null;

        // Return just the image path without metadata
        if (width) {
            return `![[${imagePath}|${width}]]`;
        }

        return `![[${imagePath}]]`;
    }

    // Handle markdown format: ![alt|metadata](url)
    const markdownPattern = /^!\[([^\]]*)\]\(([^)]+)\)$/;
    const markdownMatch = new RegExp(markdownPattern).exec(line);

    if (markdownMatch) {
        const altText = markdownMatch[1];
        const imageUrl = markdownMatch[2].trim();
        const width = keepWidth ? getLastMetadataWidth(altText) : null;

        // Parse alt text to remove metadata (fig:, title:, desc:)
        // Split by | and keep only the first part (actual alt text)
        const altParts = altText.split('|').map(p => p.trim());
        const altPartsWithoutWidth = width ? altParts.slice(0, -1) : altParts;

        // Filter out metadata parts that start with fig:, title:, or desc:
        const cleanAltParts = altPartsWithoutWidth.filter(part => {
            return !part.startsWith(figPrefix) &&
                   !part.startsWith('title:') &&
                   !part.startsWith('desc:');
        });

        // Use the first non-metadata part as alt text, or empty if none
        const cleanAlt = cleanAltParts.length > 0 ? cleanAltParts[0] : '';
        const cleanAltWithWidth = width ? [cleanAlt, width].filter(Boolean).join('|') : cleanAlt;

        return `![${cleanAltWithWidth}](${imageUrl})`;
    }

    // Return line unchanged if it doesn't match any pattern
    return line;
}

function getLastMetadataWidth(metadata: string): string | null {
    const metaParts = metadata.split('|').map(p => p.trim()).filter(p => p.length > 0);
    const lastPart = metaParts.at(-1);

    if (!lastPart || !validateNumber(lastPart)) {
        return null;
    }
    return lastPart;
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

////////////////////  Citation span replacement for PDF export  ///////////////////////// 

export interface SpanStyles {
    citationColorInPdf: string;
}

export interface CitationSpanMetadataOptions {
    kind: string;
    citationKind: "equation" | "figure" | "callout";
    rangeSymbol: string | null;
    validDelimiters: string[];
    fileDelimiter: string;
}

export interface ExportCitationRef {
    file: string | null;
    tag: string;
}

/**
 * Replaces inline citations in markdown with <span> tags.
 * Ignores multiline code blocks, inline code blocks, and display math blocks.
 */
export function replaceCitationsInMarkdownWithSpan(
    markdown: string,
    prefix: string,
    rangeSymbol: string | null,
    validDelimiters: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ',',
    citationFormat = '(#)',
    spanStyles = {} as SpanStyles,
    metadataOptions?: CitationSpanMetadataOptions
): string {
    if (!markdown.trim()) return markdown;

    const lines = markdown.split('\n');
    let inMultilineCodeBlock = false;
    let inDisplayMath = false;

    const processedLines = lines.map((line) => {
        if (isCodeBlockToggle(line)) {
            inMultilineCodeBlock = !inMultilineCodeBlock;
            return line;
        }
        if (inMultilineCodeBlock) {
            return line;
        }

        const cleanedLine = removeInlineCodeBlocks(line);
        if (inDisplayMath) {
            const displayMathMatches = line.match(equationBlockBracePattern);
            if (displayMathMatches && displayMathMatches.length % 2 !== 0) {
                inDisplayMath = false;
            }
            return line;
        }

        if (equationBlockStartPatternWithWhiteSpace.test(cleanedLine)) {
            const displayMathMatches = cleanedLine.match(equationBlockBracePattern);
            if (!displayMathMatches || displayMathMatches.length % 2 !== 0) {
                inDisplayMath = true;
            }
            return line;
        }

        return processInlineReferences(
            line, prefix, rangeSymbol, validDelimiters, fileDelimiter, multiCitationDelimiter, citationFormat, spanStyles, metadataOptions
        );
    });
    return processedLines.join('\n');
}

/**
 * Processes inline citations to span while avoiding inline code blocks.
 */
function processInlineReferences(
    line: string,
    prefix: string,
    rangeSymbol: string | null,
    validDelimiters: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ',',
    citationFormat = '(#)',
    spanStyles = {} as SpanStyles,
    metadataOptions?: CitationSpanMetadataOptions
): string {
    const codeBlockRanges: Array<{ start: number, end: number }> = [];
    let i = 0;

    while (i < line.length) {
        if (line[i] === '`' && (i === 0 || line[i - 1] !== '\\')) {
            const start = i;
            i++;
            while (i < line.length) {
                if (line[i] === '`' && line[i - 1] !== '\\') {
                    codeBlockRanges.push({ start, end: i });
                    break;
                }
                i++;
            }
        }
        i++;
    }

    const isInCodeBlock = (pos: number): boolean => {
        return codeBlockRanges.some(range => pos >= range.start && pos <= range.end);
    };

    const dollarPositions: Array<{ pos: number, type: 'single' | 'double' }> = [];
    i = 0;
    let backslashRun = 0;
    while (i < line.length) {
        const ch = line[i];
        if (ch === '\\') {
            backslashRun++;
            i++;
            continue;
        }
        if (ch === '$') {
            const isEscaped = (backslashRun % 2 === 1);
            if (!isEscaped) {
                if (i + 1 < line.length && line[i + 1] === '$') {
                    dollarPositions.push({ pos: i, type: 'double' });
                    i += 2;
                } else {
                    dollarPositions.push({ pos: i, type: 'single' });
                    i += 1;
                }
                backslashRun = 0;
                continue;
            }
        }
        backslashRun = 0;
        i++;
    }

    const inlineMathRanges: Array<{ start: number, end: number }> = [];
    for (let j = 0; j < dollarPositions.length - 1; j++) {
        const current = dollarPositions[j];
        const next = dollarPositions[j + 1];
        if (current.type === 'single' && next.type === 'single') {
            if (isInCodeBlock(current.pos) || isInCodeBlock(next.pos)) continue;
            const content = line.substring(current.pos, next.pos + 1);
            if (new RegExp(inlineMathPattern).exec(content)) {
                inlineMathRanges.push({ start: current.pos, end: next.pos });
                j++;
            }
        }
    }

    const matches: Array<{
        mathStart: number,
        mathEnd: number,
        citations: string[]
    }> = [];
    for (const mathRange of inlineMathRanges) {
        const mathContent = line.substring(mathRange.start + 1, mathRange.end);
        const match = matchNestedCitation(mathContent, prefix);

        if (match) {
            const citations = match.label.split(multiCitationDelimiter).map(c => c.trim()).filter(c => c.length > 0);
            matches.push({
                mathStart: mathRange.start,
                mathEnd: mathRange.end + 1,
                citations
            });
        }
    }

    let result = line;
    matches.toReversed().forEach(({ mathStart, mathEnd, citations }) => {
        const combinedCitations = (rangeSymbol === null) ?
            citations :
            combineContinuousCitationTags(
                citations,
                rangeSymbol,
                validDelimiters,
                fileDelimiter
            );

        const replacement = generateCitationSpans(
            combinedCitations, fileDelimiter, multiCitationDelimiter, citationFormat, spanStyles, metadataOptions
        );
        result = result.substring(0, mathStart) + replacement + result.substring(mathEnd);
    });
    return result;
}

const DEFAULT_CONTAINER_STYLE = 'cursor: default;';
const DEFAULT_CITATION_STYLE = 'text-decoration: none; cursor: pointer;';

/**
 * Generates span tags for citations.
 */
export function generateCitationSpans(
    citations: string[],
    fileDelimiter: string,
    multiCitationDelimiter = ',',
    citationFormat = '(#)',
    spanStyles = {} as SpanStyles,
    metadataOptions?: CitationSpanMetadataOptions
): string {
    const spans = citations.map((citation) => {
        const { local, crossFile } = splitFileCitation(citation, fileDelimiter);
        const citationColorInPdf = spanStyles.citationColorInPdf || '#000000';

        const containerStyle = escapeString(
            DEFAULT_CONTAINER_STYLE + ` color: ${citationColorInPdf};`,
            "\""
        );

        const citationStyle = escapeString(
            DEFAULT_CITATION_STYLE + ` color: ${citationColorInPdf};`,
            "\""
        );
        const metadataAttributes = metadataOptions ?
            ` ${buildCitationMetadataAttributes(citation, metadataOptions)}` :
            '';
        let result = `<span${metadataAttributes} style="${containerStyle}">` + citationFormat.replace('#', `<span style="${citationStyle}">${local}</span>`);
        result += '</span>';
        if (crossFile) {
            result += `${'[^' + crossFile + ']'}`;
        }

        return result;
    });
    return spans.join(multiCitationDelimiter + ' ');
}

function buildCitationMetadataAttributes(
    citation: string,
    metadataOptions: CitationSpanMetadataOptions
): string {
    const refs = flattenCitationRefs(citation, metadataOptions);
    const classes = [
        "equation-citator-citation",
        `equation-citator-cite-${metadataOptions.citationKind}`,
    ].join(" ");

    return [
        `class="${escapeHtmlAttribute(classes)}"`,
        `data-ec-kind="${escapeHtmlAttribute(metadataOptions.kind)}"`,
        `data-ec-refs='${escapeHtmlAttribute(JSON.stringify(refs))}'`,
    ].join(" ");
}

function getCitationDataKind(prefix: string): string {
    return prefix.trim().replace(/:+$/, '');
}

export function flattenCitationRefs(
    citation: string,
    metadataOptions: CitationSpanMetadataOptions
): ExportCitationRef[] {
    const expandedCitations = metadataOptions.rangeSymbol ?
        splitContinuousCitationTags(
            [citation],
            metadataOptions.rangeSymbol,
            metadataOptions.validDelimiters,
            metadataOptions.fileDelimiter
        ) :
        [citation];

    return expandedCitations.map((expandedCitation) => {
        const { local, crossFile } = splitFileCitation(expandedCitation, metadataOptions.fileDelimiter);
        return {
            file: crossFile || null,
            tag: local,
        };
    });
}
