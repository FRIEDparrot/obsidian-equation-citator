import { Heading, relativeHeadingLevel } from "@/utils/parsers/heading_parser";
import { PanelItem, getItemLine, PanelItemGroup} from "./panelItemTypes";
import EquationCitator from "@/main";
import { hashPanelItems } from "@/utils/misc/hash_utils";
import { EquationArrangePanel } from "./mainPanel";
import { App, setIcon, TFile, normalizePath } from "obsidian";
import Debugger from "@/debug/debugger";

const NO_HEADING_LEVEL = 7; // Use level 7 to prevent any heading as subheading

interface CollapseHeadingMetadata {
    id: string;                  // composite id: "level|headingText|occurrenceNumber"
    lineNumber: number;          // line number of the heading (or -1 for no heading group)
    isCollapsed: boolean;        // true if this heading is currently collapsed
}

interface HeadingMetadata extends CollapseHeadingMetadata {
    heading: Heading | null;     // store the current heading informatin
    hasDirectItems: boolean;
    hasSubheadings: boolean;
    hasContent: boolean;         // either has direct items or subheadings
    totalItemCount: number;      // item count under this heading including subheadings 
    isNoHeadingGroup: boolean;   // true if this group is for items without headings
}

/**
 * Since the outline view is much more complex than list view, 
 *     we encapsulate its rendering logic into a separate class 
 *     for better code organization.
 */
export class EquationPanelOutlineViewRenderer {
    private currentHeadings: Heading[] = [];

    // Stores composite keys: "headingKey|occurrenceNumber"
    private readonly parsedCollapsedHeadings: Set<string> = new Set();
    public collapseHeadings: Set<string> = new Set();

    public collapseAllState: boolean = false; // Track whether all headings are currently collapsed or expanded
    private currentCollapseAllState: boolean = false; // Track the current state of "Collapse All" for proper toggling

    // Record the occurrence counts of each heading key during rendering
    private readonly currentHeadingOccurrences: Map<string, number> = new Map();
    
    private readonly app: App;
    constructor(
        private readonly plugin: EquationCitator,
        private readonly panel: EquationArrangePanel,
    ) {
        this.app = plugin.app;
    }

    public async handleOutlineViewRefresh(
        items: PanelItem[],
        headings: Heading[],
        viewStateEqual: boolean
    ): Promise<void> {
        // If headings-only mode is enabled, render without items
        const displayItems = this.panel.enableRenderHeadingOnly ? [] : (items || []);

        const itemsHash = hashPanelItems(displayItems); // Re-use hash function for now
        const itemsEqual = (items.length !==0) && (itemsHash === this.panel.currentEquationHash);
        const headingsEqual = (
            headings.length === this.currentHeadings.length &&
            headings.every((h, i) => h.level === this.currentHeadings[i].level && h.text === this.currentHeadings[i].text)
        );
        const collapseAllStateEqual = (this.collapseAllState === this.currentCollapseAllState);
        
        // Check if heading lines are still correct
        const headingLinesEqual = (
            headings.length === this.currentHeadings.length &&
            headings.every((h, i) => h.line === this.currentHeadings[i].line)
        );
        
        // viewState + items + headings state all equal 
        if (viewStateEqual && itemsEqual && headingsEqual && collapseAllStateEqual) {
            // If lines don't match, update data-line attributes without full re-render
            if (headingLinesEqual) {
                Debugger.log("View state equal, no need to refresh outline view");
            } else {
                Debugger.log("Headings equal but lines changed, updating data-line attributes");
                this.updateHeadingLines(headings);
                this.currentHeadings = headings;
            }
            return;
        }

        // Update state
        this.panel.currentEquationHash = itemsHash;
        this.currentHeadings = headings;
        this.currentHeadingOccurrences.clear(); // Clear occurrence tracking for new render
        this.currentCollapseAllState = this.collapseAllState;

        this.panel.viewPanel?.empty();
        this.parsedCollapsedHeadings.clear(); // Clear collapsed state (determine by `collapseHeadings` state)
        if (headings.length === 0 && displayItems.length === 0) {
            this.panel.renderEmptyPanelView();
            return;
        }
        await this.renderOutlineView(displayItems, headings);
        this.collapseHeadings = new Set(this.parsedCollapsedHeadings);
    }

    /**
     * Update the data-line attributes of heading elements when lines have changed
     * but heading structure (level, text) remains the same.
     * This avoids a full re-render when only line numbers shift (e.g., text edits above headings).
     */
    private updateHeadingLines(headings: Heading[]): void {
        if (!this.panel.viewPanel) return;

        // Build occurrence map to generate correct data-id for each heading
        const occurrenceMap: Map<string, number> = new Map();
        
        headings.forEach((heading, index) => {
            const key = `${heading.level}|${heading.text}`;
            const occurrence = occurrenceMap.get(key) || 0;
            occurrenceMap.set(key, occurrence + 1);
            
            const dataId = `${key}|${occurrence}`;
            const headingElement = this.panel.viewPanel?.querySelector(
                `.ec-heading-item[data-id="${CSS.escape(dataId)}"]`
            ) as HTMLElement;
            
            if (headingElement) {
                headingElement.dataset['line'] = heading.line.toString();
            }
        });
    }

    private async renderOutlineView(
        items: PanelItem[],
        headings: Heading[],
    ): Promise<void> {
        // Group items by headings
        const groups = this.groupItemsByHeadings(items, headings);

        // Filter groups if filter is enabled - need to check total items including subheadings
        const filteredGroups = this.panel.filterEmptyHeadings
            ? groups.filter((group, index) => {
                // Include if has direct items
                if (group.items.length > 0) return true;

                // Include if has items in subheadings
                if (group.heading) {
                    const headingIndexInAll = headings.findIndex(h => h.line === group.heading?.line);
                    if (headingIndexInAll >= 0) {
                        const totalCount = this.getTotalItemsForHeading(items, headings, headingIndexInAll);
                        return totalCount > 0;
                    }
                }
                return false;
            })
            : groups;

        const outlineContainer = this.panel.viewPanel.createDiv("ec-outline-view");

        // Render only top-level headings; subheadings will be rendered recursively
        for (let i = 0; i < filteredGroups.length; i++) {
            // Check if this is a top-level heading (no parent with lower relative level before it)
            const isTopLevel = i === 0 || !this.hasParentHeading(filteredGroups, i);

            if (isTopLevel || filteredGroups[i].heading === null) {
                await this.renderHeadingGroup(outlineContainer, filteredGroups, i, items, headings);
            }
        }
    }

    private groupItemsByHeadings(items: PanelItem[], headings: Heading[]): PanelItemGroup[] {
        const groups: PanelItemGroup[] = [];
        const items_sorted = items.toSorted((a, b) => getItemLine(a) - getItemLine(b));

        // Group non-heading items first (if any exist before first heading)
        const nonHeadingItems = headings.length > 0
            ? items_sorted.filter(item => getItemLine(item) < headings[0].line)
            : items_sorted; // If no headings at all, all items are non-heading

        if (nonHeadingItems.length > 0) {
            const group: PanelItemGroup = {
                heading: null,
                items: nonHeadingItems,
                absoluteLevel: NO_HEADING_LEVEL,
                relativeLevel: NO_HEADING_LEVEL
            };
            groups.push(group);
        }

        // Process ALL headings, not just those with items
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];

            // Get only direct items (not in subheadings) for rendering
            const directItems = this.getDirectItemsForHeading(items_sorted, headings, i);

            // Add all headings, regardless of whether they have items
            const relLevel = relativeHeadingLevel(headings, i);
            groups.push({
                heading,
                items: directItems, // Only store direct items for rendering
                absoluteLevel: heading.level,
                relativeLevel: relLevel
            });
        }

        return groups;
    }

    private hasParentHeading(groups: PanelItemGroup[], currentIndex: number): boolean {
        // Check if this heading has a parent (a heading with lower relative level before it)
        const currentGroup = groups[currentIndex];
        const currentLevel = currentGroup.relativeLevel;

        for (let i = currentIndex - 1; i >= 0; i--) {
            const prevGroup = groups[i];
            if (prevGroup.relativeLevel < currentLevel) {
                return true; // Found a parent
            }
        }

        return false;
    }

    private attachCollapseHandler(
        hasContent: boolean, 
        collapseIcon: HTMLElement | null, 
        id: string, 
        contentContainer: HTMLElement
    ): void {
        if (!hasContent || !collapseIcon) return;

        collapseIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCurrentlyCollapsed = this.collapseHeadings.has(id);

            if (isCurrentlyCollapsed) {
                this.collapseHeadings.delete(id);
                setIcon(collapseIcon, "chevron-down");
                contentContainer.show();
            } else {
                this.collapseHeadings.add(id);
                setIcon(collapseIcon, "chevron-right");
                contentContainer.hide();
            }
        });
    }

    private async jumpToHeading(heading: Heading): Promise<void> {
        const filePath = this.panel.getCurrentActiveFile();   // get current active file of panel
        const normalizedPath = filePath ? normalizePath(filePath) : null;
        const currentFile = normalizedPath ? this.app.vault.getAbstractFileByPath(normalizedPath) : null;
        if (!filePath || !currentFile || !(currentFile instanceof TFile)) return;

        // Open the file and jump to the heading line
        const leaf = this.app.workspace.getLeaf(false);
        if (leaf) {
            await leaf.openFile(currentFile, {
                eState: {
                    line: heading.line,
                    cursor: { from: { line: heading.line, ch: 0 } }
                }
            });
        }
    }

    private hasSubheadings(groups: PanelItemGroup[], currentIndex: number): boolean {
        // Check if this heading has any direct subheadings
        return this.getDirectSubheadingIndices(groups, currentIndex).length > 0;
    }

    private getDirectSubheadingIndices(groups: PanelItemGroup[], currentIndex: number): number[] {
        // Get only DIRECT children subheading indices (not grandchildren)
        const subheadingIndices: number[] = [];
        if (currentIndex >= groups.length - 1) return subheadingIndices;

        const currentGroup = groups[currentIndex];
        const currentLevel = currentGroup.relativeLevel;

        // Collect only direct subheadings (exactly one level higher)
        for (let i = currentIndex + 1; i < groups.length; i++) {
            const nextGroup = groups[i];

            if (nextGroup.relativeLevel <= currentLevel) {
                break; // Found a sibling or parent heading, stop
            }

            // Only include direct children (one level deeper)
            if (nextGroup.relativeLevel === currentLevel + 1) {
                subheadingIndices.push(i);
            }
        }

        return subheadingIndices;
    }

    /**
     * In this function, it build a headingKey using : 
     * - level | text | occurrence number (to differentiate between multiple same headings in the file)
     */
    private getHeadingMetadata(
        allGroups: PanelItemGroup[],
        currentIndex: number,
        allItems: PanelItem[],
        allHeadings: Heading[]
    ): HeadingMetadata {
        const group = allGroups[currentIndex];
        const hasDirectItems = group.items.length > 0;
        const hasSubheadings = this.hasSubheadings(allGroups, currentIndex);
        const hasContent = hasDirectItems || hasSubheadings;

        const headingIndexInAll = group.heading ? allHeadings.findIndex(h => h.line === group.heading?.line) : -1;
        const totalItemCount = headingIndexInAll >= 0
            ? this.getTotalItemsForHeading(allItems, allHeadings, headingIndexInAll)
            : group.items.length;

        const lineNumber = group.heading ? group.heading.line : -1;
        const isNoHeadingGroup = group.heading === null;
        // bulild a not-null group heading 
        const groupHeading = group.heading ?? { level: NO_HEADING_LEVEL, text: "no-heading", line: -1 };
        const headingKey = `${groupHeading.level}|${groupHeading.text}`;

        // Track occurrence number for this headingKey
        const occurrenceNumber = this.currentHeadingOccurrences.get(headingKey) ?? 0;
        this.currentHeadingOccurrences.set(headingKey, occurrenceNumber + 1);

        // Create composite key for collapse tracking
        const id = `${headingKey}|${occurrenceNumber}`;
        const isCollapsed = this.collapseHeadings.has(id);

        return {
            id,
            lineNumber,
            isCollapsed,
            heading: groupHeading,
            hasDirectItems,
            hasSubheadings,
            hasContent,
            totalItemCount,
            isNoHeadingGroup,
        }
    }

    private async renderHeadingGroup(
        container: HTMLElement,
        allGroups: PanelItemGroup[],
        currentIndex: number,
        allItems: PanelItem[],
        allHeadings: Heading[]
    ): Promise<void> {
        const metadata = this.getHeadingMetadata(allGroups, currentIndex, allItems, allHeadings);
        const { hasDirectItems, hasContent, id, isCollapsed } = metadata;
        
        const group = allGroups[currentIndex];
        const headingDiv = this.createHeadingDiv(container, group, metadata);
        const { collapseIcon } = this.createHeadingHeader(headingDiv, group, metadata);

        // Create a content container that will hold subheadings and items
        const contentContainer = headingDiv.createDiv("ec-heading-content");

        // Hide content container BEFORE rendering if collapsed (better UX - no flash)
        if (isCollapsed) {
            this.parsedCollapsedHeadings.add(id); // Ensure state is consistent on initial render
            contentContainer.hide();
        }
        else {
            this.parsedCollapsedHeadings.delete(id);
            contentContainer.show();
        }

        // Get DIRECT subheading indices only (not all nested levels)
        const directSubheadingIndices = this.getDirectSubheadingIndices(allGroups, currentIndex);

        // First, render direct items (not in subheadings)
        if (hasDirectItems) {
            const directItemsContainer = contentContainer.createDiv("ec-heading-equations");
            for (const item of group.items) {
                // Render based on item type
                if (item.type === "equation") {
                    await this.panel.renderEquationItem(directItemsContainer, item.data);
                } else if (item.type === "figure") {
                    await this.panel.renderFigureItem(directItemsContainer, item.data);
                } else if (item.type === "callout") {
                    await this.panel.renderCalloutItem(directItemsContainer, item.data);
                }
            }
        }

        // Then, render ONLY direct subheadings (they will recursively render their own children)
        for (const subIndex of directSubheadingIndices) {
            await this.renderHeadingGroup(
                contentContainer,
                allGroups,
                subIndex,
                allItems,
                allHeadings
            );
        }

        this.attachCollapseHandler(hasContent, collapseIcon, id, contentContainer);
    }

    private createHeadingDiv(container: HTMLElement, group: PanelItemGroup, metadata: HeadingMetadata): HTMLElement {
        const headingClasses = metadata.isNoHeadingGroup
            ? "ec-heading-item ec-no-heading-group"
            : `ec-heading-item ec-heading-level-${group.relativeLevel}`;

        return container.createDiv({
            cls: headingClasses,
            attr: { 
                'data-id': metadata.id,
                'data-line': metadata.lineNumber.toString() 
            }
        });
    }

    private createHeadingHeader(headingDiv: HTMLElement, group: PanelItemGroup, metadata: HeadingMetadata): {
        headingHeader: HTMLElement;
        collapseIcon: HTMLElement | null;
    } {
        const headingHeader = headingDiv.createDiv("ec-heading-header ec-clickable");
        const collapseIcon = this.createCollapseIcon(headingHeader, group, metadata);
        this.createHeadingText(headingHeader, group);
        this.createEquationCountBadge(headingHeader, metadata.totalItemCount);

        return { headingHeader, collapseIcon };
    }

    private createCollapseIcon(headingHeader: HTMLElement, group: PanelItemGroup, metadata: HeadingMetadata): HTMLElement | null {
        if (metadata.hasContent) {
            const collapseIcon = headingHeader.createSpan(`ec-collapse-icon ec-heading-collapse-icon-${group.absoluteLevel}`);
            setIcon(collapseIcon, metadata.isCollapsed ? "chevron-right" : "chevron-down");
            return collapseIcon;
        }
        headingHeader.createSpan({ cls: "ec-collapse-icon-placeholder" });
        return null;
    }

    private createHeadingText(headingHeader: HTMLElement, group: PanelItemGroup): void {
        const headingText = group.heading ? group.heading.text : "Items without headings";
        const headingTextSpan = headingHeader.createSpan({
            cls: `ec-heading-text ec-heading-text-${group.absoluteLevel}`,
            text: headingText
        });

        if (group.heading) {
            headingTextSpan.addClass('ec-clickable');
            headingTextSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                if (group.heading) {
                    // Walk up to the heading item div that carries data-line,
                    // so we always get the current line even after the early-return refresh.
                    const headingItemDiv = headingTextSpan.closest('.ec-heading-item') as HTMLElement;
                    const currentLine = headingItemDiv
                        ? Number.parseInt(headingItemDiv.dataset['line'] ?? '-1', 10)
                        : group.heading.line; // fallback to stale value if DOM lookup fails

                    void this.jumpToHeading({ ...group.heading, line: currentLine });
                }
            });
        }
    }

    private createEquationCountBadge(headingHeader: HTMLElement, totalItemCount: number): void {
        if (totalItemCount > 0) {
            headingHeader.createSpan({
                cls: "ec-equation-count",
                text: totalItemCount.toString()
            });
        }
    }

    private getTotalItemsForHeading(items: PanelItem[], headings: Heading[], currentIndex: number): number {
        // Get total count of items in this heading including all subheadings
        const endLine = this.getEndLineForHeading(headings, currentIndex);
        const heading = headings[currentIndex];

        const totalItems = items.filter(item =>
            getItemLine(item) > heading.line && getItemLine(item) < endLine
        );
        return totalItems.length;
    }

    private getEndLineForHeading(headings: Heading[], currentIndex: number): number {
        // Find the end line for this heading, which is the line before the next sibling or parent heading
        const currentHeading = headings[currentIndex];
        const currentLevel = currentHeading.level;

        // Look for the next heading that is at the same level or higher (sibling or parent)
        for (let i = currentIndex + 1; i < headings.length; i++) {
            if (headings[i].level <= currentLevel) {
                return headings[i].line;
            }
        }

        // No sibling or parent found, this heading extends to the end of the file
        return Infinity;
    }

    private getDirectItemsForHeading(items: PanelItem[], headings: Heading[], currentIndex: number): PanelItem[] {
        // Get only the items directly under this heading (not in any subheading)
        const heading = headings[currentIndex];
        const nextHeadingLine = currentIndex < headings.length - 1 ? headings[currentIndex + 1].line : Infinity;

        // Find items between this heading and the next heading
        const directItems = items.filter(item =>
            getItemLine(item) > heading.line && getItemLine(item) < nextHeadingLine
        );

        return directItems;
    }
}