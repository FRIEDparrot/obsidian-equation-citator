import { HoverParent } from "obsidian";
import EquationCitator from "@/main";
import { DISABLED_DELIMITER } from "@/utils/string_processing/string_utils";
import {
    combineContinuousCitationTags,
    splitFileCitation,
} from "@/utils/core/citation_utils";
import { CalloutCitationPopover } from "@/views/popovers/callout_citation_popover";
import Debugger from "@/debug/debugger";

/**
 * Render function for callout citations
 *
 * This implementation follows the same pattern as renderFigureCitation()
 * but adapted for callouts/quotes.
 *
 * Usage:
 * - User writes: $\ref{table:1.1}$ or $\ref{thm:2.3}$ in markdown
 * - Parser detects configured prefix (e.g., "table:", "thm:", "def:")
 * - Routes to this function
 * - Displays as: Table. 1.1 or Theorem 2.3 (based on format setting)
 *
 * IMPORTANT: All tags in a single citation must be of the same type/prefix
 * - Valid: $\ref{table:1.1, 1.2}$ (both are tables, "1.2" is short for "table:1.2")
 * - Invalid: $\ref{table:1.1, thm:2.3}$ (mixed types not allowed)
 *
 * @param plugin - The main plugin instance
 * @param sourcePath - Path to the current file
 * @param parent - Hover parent for popover support
 * @param prefix - The callout prefix (e.g., "table:", "thm:", "def:")
 * @param citeCalloutTags - Array of callout tags to cite (e.g., ["1.1", "1.2"])
 * @param isInteractive - Whether to show preview without Ctrl key (for reading mode)
 * @returns HTMLElement containing the rendered citation
 */
export function renderCalloutCitation(
    plugin: EquationCitator,
    sourcePath: string,
    parent: HoverParent | null,
    prefix: string,
    citeCalloutTags: string[],
    isInteractive = false
): HTMLElement {
    const {
        enableContinuousCitation,
        enableCrossFileCitation,
        fileCiteDelimiter,
        continuousRangeSymbol,
        continuousDelimiters,
        multiCitationDelimiterRender,
        calloutCitationPrefixes: quoteCitationPrefixes,
    } = plugin.settings;

    // Find the format for this prefix
    const prefixConfig = quoteCitationPrefixes.find(p => p.prefix === prefix);
    const calloutFormat = prefixConfig?.format || `${prefix}#`;

    const el = document.createElement('span');
    const fileDelimiter = enableCrossFileCitation ?
        fileCiteDelimiter || '^' :
        DISABLED_DELIMITER;

    // Combine continuous citations if enabled (e.g., 1.1, 1.2, 1.3 -> 1.1~3)
    const formattedCiteCalloutTags = enableContinuousCitation ?
        combineContinuousCitationTags(
            citeCalloutTags,
            continuousRangeSymbol,
            continuousDelimiters.split(' ').filter(d => d.trim()),
            fileDelimiter,
        )
        : citeCalloutTags;

    // Handle empty citation case
    if (!formattedCiteCalloutTags.length) {
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container');
        containerDiv.addClass('em-callout-citation-container'); // Add callout-specific class
        const emptyCitationSpanEl = document.createElement('span');
        emptyCitationSpanEl.className = 'em-math-citation em-callout-citation';
        emptyCitationSpanEl.textContent = calloutFormat.replace('#', '');
        containerDiv.appendChild(emptyCitationSpanEl);
        el.appendChild(containerDiv);
        return el;
    }

    const containers: HTMLElement[] = [];

    // Render each callout citation
    for (const tag of formattedCiteCalloutTags) {
        const containerDiv = document.createElement('div');
        containerDiv.addClass('em-math-citation-container');
        containerDiv.addClass('em-callout-citation-container'); // Add callout-specific class

        const { local, crossFile } = splitFileCitation(tag, fileDelimiter);
        const citationSpanEl = document.createElement('span');
        citationSpanEl.className = 'em-math-citation em-callout-citation';

        if (crossFile) {
            // Create citation with superscript bracket for cross-file references
            const localCitation = calloutFormat.replace('#', local);
            citationSpanEl.textContent = localCitation;
            containerDiv.appendChild(citationSpanEl);

            // Create superscript bracket
            const fileSuperEl = document.createElement('sup');
            fileSuperEl.textContent = `[${crossFile}]`;
            fileSuperEl.className = "em-math-citation-file-superscript em-callout-citation-file-superscript";

            // Add file superscript popover
            if (parent) {
                fileSuperEl.addEventListener('mouseenter', (e: MouseEvent) => {
                    const ctrlKey = e.ctrlKey || e.metaKey;
                    if (isInteractive || ctrlKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // TODO: Show file info popover (can reuse FileSuperScriptPopover)
                    }
                });
            }
            containerDiv.appendChild(fileSuperEl);
        } else {
            // Regular citation without cross-file reference
            citationSpanEl.textContent = calloutFormat.replace('#', local);
            containerDiv.appendChild(citationSpanEl);
        }

        containers.push(containerDiv);

        // Add multi-citation delimiter if needed
        if (multiCitationDelimiterRender && formattedCiteCalloutTags.length > 1 &&
            tag !== formattedCiteCalloutTags.at(-1) // not last one
        ) {
            const multiDelimEl = document.createElement('span');
            multiDelimEl.className = 'em-math-citation-multi-delimiter em-callout-citation-multi-delimiter';
            multiDelimEl.textContent = multiCitationDelimiterRender;
            containers.push(multiDelimEl);
        }
    }

    // Append all containers to the main element
    for (const container of containers) {
        el.appendChild(container);
    }

    // Add event listener for callout preview popover
    // Show the callout content when hovering (Ctrl+hover in live preview, always in reading mode)
    if (parent) {
        el.addEventListener('mouseenter', (event: MouseEvent) => {
            void (async () => {
                const ctrlKey = event.ctrlKey || event.metaKey;
                if (isInteractive || ctrlKey) {
                    event.preventDefault();
                    event.stopPropagation();

                    // Fetch callout data from services
                    const renderedCallouts = await plugin.calloutServices.getCalloutsByTags(
                        citeCalloutTags,  // Use original tags, not formatted ones
                        prefix,
                        sourcePath
                    );

                    if (renderedCallouts.length === 0) {
                        Debugger.log("No callouts found for citation");
                        return;
                    }

                    // Create and show popover
                    new CalloutCitationPopover(
                        plugin,
                        parent,
                        el,
                        prefix,
                        renderedCallouts,
                        sourcePath,
                        300  // wait time in ms
                    );
                }
            })();  // ignore promise
        });
    }
    return el;
}
