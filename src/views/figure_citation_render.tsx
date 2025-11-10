import { HoverParent } from "obsidian";
import EquationCitator from "@/main";
import { DISABLED_DELIMITER } from "@/utils/string_processing/string_utils";
import {
    combineContinuousCitationTags,
    splitFileCitation,
} from "@/utils/core/citation_utils";

/**
 * PROTOTYPE: Render function for figure citations
 *
 * This is a prototype implementation that follows the same pattern as renderEquationCitation()
 * but adapted for figures. The full implementation will require:
 *
 * 1. FigureCache integration to fetch figure data
 * 2. Figure preview popover (showing image instead of math)
 * 3. Settings for figure citation format
 * 4. Cross-file figure resolution
 * 5. Continuous citation support for figures
 *
 * Usage:
 * - User writes: $\ref{fig:3.1}$ in markdown
 * - Parser detects "fig:" prefix
 * - Routes to this function instead of equation renderer
 * - Displays as: (fig:3.1) or customizable format
 *
 * @param plugin - The main plugin instance
 * @param sourcePath - Path to the current file
 * @param parent - Hover parent for popover support
 * @param citeFigureTags - Array of figure tags to cite (e.g., ["3.1", "3.2", "4.1"])
 * @param isInteractive - Whether to show preview without Ctrl key (for reading mode)
 * @returns HTMLElement containing the rendered citation
 */
export function renderFigureCitation(
    plugin: EquationCitator,
    sourcePath: string,
    parent: HoverParent | null,
    citeFigureTags: string[],
    isInteractive = false
): HTMLElement {
    const {
        enableContinuousCitation,
        enableCrossFileCitation,
        fileCiteDelimiter,
        continuousRangeSymbol,
        continuousDelimiters,
        multiCitationDelimiterRender,
    } = plugin.settings;

    // TODO: Add figure-specific citation format to settings
    // For now, use a hardcoded format
    const figureCitationFormat = "(fig:#)"; // e.g., (fig:3.1)

    const el = document.createElement('span');
    const fileDelimiter = enableCrossFileCitation ?
        fileCiteDelimiter || '^' :
        DISABLED_DELIMITER;

    // Combine continuous citations if enabled (e.g., 3.1, 3.2, 3.3 -> 3.1~3)
    const formattedCiteFigureTags = enableContinuousCitation ?
        combineContinuousCitationTags(
            citeFigureTags,
            continuousRangeSymbol,
            continuousDelimiters.split(' ').filter(d => d.trim()),
            fileDelimiter,
        )
        : citeFigureTags;

    // Handle empty citation case
    if (!formattedCiteFigureTags.length) {
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container');
        containerDiv.addClass('em-figure-citation-container'); // Add figure-specific class
        const emptyCitationSpanEl = document.createElement('span');
        emptyCitationSpanEl.className = 'em-math-citation em-figure-citation';
        emptyCitationSpanEl.textContent = figureCitationFormat.replace('#', '');
        containerDiv.appendChild(emptyCitationSpanEl);
        el.appendChild(containerDiv);
        return el;
    }

    const containers: HTMLElement[] = [];

    // Render each figure citation
    for (const tag of formattedCiteFigureTags) {
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container');
        containerDiv.addClass('em-figure-citation-container'); // Add figure-specific class

        const { local, crossFile } = splitFileCitation(tag, fileDelimiter);
        const citationSpanEl = document.createElement('span');
        citationSpanEl.className = 'em-math-citation em-figure-citation';

        if (crossFile) {
            // Create citation with superscript bracket for cross-file references
            const localCitation = figureCitationFormat.replace('#', local);
            citationSpanEl.textContent = localCitation;
            containerDiv.appendChild(citationSpanEl);

            // Create superscript bracket
            const fileSuperEl = document.createElement('sup');
            fileSuperEl.textContent = `[${crossFile}]`;
            fileSuperEl.className = "em-math-citation-file-superscript em-figure-citation-file-superscript";

            // TODO: Add figure-specific file superscript popover
            // This should show information about the source file
            if (parent) {
                fileSuperEl.addEventListener('mouseenter', (e: MouseEvent) => {
                    const ctrlKey = e.ctrlKey || e.metaKey;
                    if (isInteractive || ctrlKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // TODO: Show file info popover
                        // const popover = new FileSuperScriptPopover(...);
                    }
                });
            }
            containerDiv.appendChild(fileSuperEl);
        } else {
            // Regular citation without cross-file reference
            citationSpanEl.textContent = figureCitationFormat.replace('#', local);
            containerDiv.appendChild(citationSpanEl);
        }

        containers.push(containerDiv);

        // Add multi-citation delimiter if needed
        if (multiCitationDelimiterRender && formattedCiteFigureTags.length > 1 &&
            tag !== formattedCiteFigureTags[formattedCiteFigureTags.length - 1] // not last one
        ) {
            const multiDelimEl = document.createElement('span');
            multiDelimEl.className = 'em-math-citation-multi-delimiter em-figure-citation-multi-delimiter';
            multiDelimEl.textContent = multiCitationDelimiterRender;
            containers.push(multiDelimEl);
        }
    }

    // Append all containers to the main element
    for (const container of containers) {
        el.appendChild(container);
    }

    // TODO: Add event listener for figure preview popover
    // This should show the figure image when hovering (Ctrl+hover in live preview)
    // el.addEventListener('mouseenter', async (event) => {
    //     const ctrlKey = event.ctrlKey || event.metaKey;
    //     if (isInteractive || ctrlKey) {
    //         // Fetch figures from FigureCache
    //         // const figures = await plugin.figureServices.getFiguresByTags(citeFigureTags, sourcePath);
    //         // Show FigureCitationPopover with image preview
    //     }
    // });

    return el;
}

/**
 * TODO: Create FigureCitationPopover class
 *
 * This should be similar to CitationPopover but display:
 * - The image (rendered from imagePath or imageLink)
 * - Figure title
 * - Figure description
 * - Link to source file (for cross-file citations)
 *
 * Example structure:
 *
 * class FigureCitationPopover extends HoverPopover {
 *     constructor(
 *         plugin: EquationCitator,
 *         parent: HoverParent,
 *         targetEl: HTMLElement,
 *         figures: ImageMatch[],
 *         sourcePath: string,
 *         waitTime: number
 *     ) {
 *         // Initialize popover
 *     }
 *
 *     onload() {
 *         // Render image(s)
 *         // Render title and description
 *         // Add click handler to jump to figure
 *     }
 * }
 */

/**
 * TODO: Create FigureServices class
 *
 * Similar to EquationServices, this should provide:
 *
 * - getFiguresByTags(tags: string[], sourcePath: string): Promise<ImageMatch[]>
 *   - Parse tags to extract cross-file citations
 *   - Query FigureCache for each file
 *   - Return matched figures
 *
 * - resolveFigurePath(imagePath: string, sourcePath: string): string
 *   - Resolve relative image paths
 *   - Handle Obsidian vault paths
 *   - Return absolute path or URL
 */

/**
 * TODO: Integration points
 *
 * 1. In citation_render.tsx (Live Preview):
 *    - Detect citation prefix (e.g., "fig:", "table:")
 *    - Route to appropriate renderer:
 *      - "eq:" -> renderEquationCitation()
 *      - "fig:" -> renderFigureCitation()
 *      - "table:" -> renderCalloutCitation() (future)
 *
 * 2. In citation_render.tsx (Reading Mode):
 *    - Same prefix detection logic
 *    - Query appropriate cache
 *    - Render with appropriate function
 *
 * 3. Settings:
 *    - Add figureCitationFormat setting (default: "(fig:#)")
 *    - Add enableFigureCitation toggle
 *    - Add parseFiguresInQuotes toggle (if needed)
 *
 * 4. Auto-complete:
 *    - Extend AutoCompleteSuggest to handle "fig:" prefix
 *    - Show figure preview in suggestions
 *    - Display image thumbnail in dropdown
 */
