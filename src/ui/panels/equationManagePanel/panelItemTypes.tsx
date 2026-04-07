import { EquationMatch } from "@/utils/parsers/equation_parser";
import { ImageMatch } from "@/utils/parsers/image_parser";
import { CalloutMatch } from "@/utils/parsers/callout_parser";
import { Heading } from "@/utils/parsers/heading_parser";

export type ViewMode = "outline" | "list";
export type SortType = "tag" | "seq";


/**
 * Unified interface for panel items (equations, figures, callouts)
 * This allows the panel to handle all three types generically
 * 
 * NOTE: We use ImageMatch and CalloutMatch (not RenderedFigure/RenderedCallout)
 * because we're displaying items from the current file, not cross-file citations
 */
export type PanelItem = 
    | { type: "equation"; data: EquationMatch }
    | { type: "figure"; data: ImageMatch }
    | { type: "callout"; data: CalloutMatch };


/**
 * Group of panel items under a heading (or no heading if null)
 * absoluteLevel is the heading level in the document (1 for H1, 2 for H2, etc.)
 * relativeLevel is the level relative to the nearest heading (0 for items directly under a heading, 1 for items under a subheading, etc.)
 */
export interface PanelItemGroup {
    heading: Heading | null;  // null for no heading 
    items: PanelItem[];
    absoluteLevel: number;
    relativeLevel: number;
}


/**
 * Get the tag from a panel item (may be undefined)
 */
export function getItemTag(item: PanelItem): string | undefined {
    return item.data.tag;
}

/**
 * Get the line number for sorting/comparison
 * - Equations: lineStart
 * - Figures: line
 * - Callouts: lineStart
 */
export function getItemLine(item: PanelItem): number {
    switch (item.type) {
        case "equation":
            return item.data.lineStart;
        case "figure":
            return item.data.line;
        case "callout":
            return item.data.lineStart;
    }
}

/**
 * Get the line range (start and end)
 */
export function getItemLineRange(item: PanelItem): { lineStart: number; lineEnd: number } {
    switch (item.type) {
        case "equation":
            return { lineStart: item.data.lineStart, lineEnd: item.data.lineEnd };
        case "figure":
            return { lineStart: item.data.line, lineEnd: item.data.line };
        case "callout":
            return { lineStart: item.data.lineStart, lineEnd: item.data.lineEnd };
    }
}

/**
 * Check if item is in a quote block
 * Note: Callouts ARE quote blocks themselves, so they return false for inQuote
 */
export function isItemInQuote(item: PanelItem): boolean {
    if (item.type === "callout") {
        return false; // Callouts ARE quote blocks, not in quotes
    }
    return item.data.inQuote;
}

/**
 * Get content for search/filtering
 */
export function getItemSearchableContent(item: PanelItem): string {
    switch (item.type) {
        case "equation":
            return item.data.content + (item.data.tag || "");
        case "figure":
            return (item.data.title || "") + (item.data.desc || "") + (item.data.tag || "");
        case "callout":
            return item.data.content + (item.data.tag || "") + (item.data.title || "");
    }
}
