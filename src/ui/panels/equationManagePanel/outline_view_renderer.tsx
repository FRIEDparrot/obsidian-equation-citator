import { Heading, relativeHeadingLevel } from "@/utils/parsers/heading_parser";
import { EquationMatch } from "@/utils/parsers/equation_parser";
import EquationCitator from "@/main";
import { hashEquations } from "@/utils/misc/hash_utils";
import { EquationArrangePanel } from "./mainPanel";
import { App, setIcon, TFile } from "obsidian";
import Debugger from "@/debug/debugger";

import { EquationGroup } from "./types";

const NO_HEADING_LEVEL = 7; // Use level 7 to prevent any heading as subheading

interface CollapseHeadingMetadata {
    id: string;                  // composite id: "level|headingText|occurrenceNumber"
    lineNumber: number;          // line number of the heading (or -1 for no heading group)
    isCollapsed: boolean;        // true if this heading is currently collapsed
}

interface HeadingMetadata extends CollapseHeadingMetadata {
    heading: Heading | null;     // store the current heading informatin
    hasDirectEquations: boolean;
    hasSubheadings: boolean;
    hasContent: boolean;         // either has direct equations or subheadings
    totalEquationCount: number;  // equation count under this heading including subheadings 
    isNoHeadingGroup: boolean;   // true if this group is for equations without headings
}

/**
 * Since the outline view is much more complex than list view, 
 *     we encapsulate its rendering logic into a separate class 
 *     for better code organization.
 */

export class EquationPanelOutlineViewRenderer {
    private currentHeadings: Heading[] = [];

    // Stores composite keys: "headingKey|occurrenceNumber"
    public collapsedHeadings: Set<string> = new Set();
    private currentCollapseHeadingId: Set<string> = new Set();

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
        equations: EquationMatch[],
        headings: Heading[],
        viewStateEqual: boolean
    ): Promise<void> {
        // If headings-only mode is enabled, render without equations
        const displayEquations = this.panel.enableRenderHeadingOnly ? [] : (equations || []);

        const equationsHash = hashEquations(displayEquations);
        const equationsEqual = (equationsHash === this.panel.currentEquationHash);
        const collapseEqual = (
            this.currentCollapseHeadingId.size === this.collapsedHeadings.size &&
            [...this.currentCollapseHeadingId].every(x => this.collapsedHeadings.has(x))
        );
        const headingsEqual = (
            headings.length === this.currentHeadings.length &&
            headings.every((h, i) => h.level === this.currentHeadings[i].level && h.text === this.currentHeadings[i].text)
        );
        // viewState + equation + headings + collapsed state all equal 
        if (viewStateEqual && equationsEqual && headingsEqual && collapseEqual) {
            Debugger.log("View state equal, no need to refresh");
            return;
        }

        // Update state
        this.panel.currentEquationHash = equationsHash;
        this.currentCollapseHeadingId = new Set(this.collapsedHeadings);
        this.currentHeadings = headings;
        this.currentHeadingOccurrences.clear(); // Clear occurrence tracking for new render

        this.panel.viewPanel?.empty();
        if (headings.length === 0 && displayEquations.length === 0) {
            this.panel.renderEmptyPanelView();
            return;
        }
        await this.renderOutlineView(displayEquations, headings);
    }

    private async renderOutlineView(
        equations: EquationMatch[],
        headings: Heading[],
    ): Promise<void> {
        // Group equations by headings
        const groups = this.groupEquationsByHeadings(equations, headings);

        // Filter groups if filter is enabled - need to check total equations including subheadings
        const filteredGroups = this.panel.filterEmptyHeadings
            ? groups.filter((group, index) => {
                // Include if has direct equations
                if (group.equations.length > 0) return true;

                // Include if has equations in subheadings
                if (group.heading) {
                    const headingIndexInAll = headings.findIndex(h => h.line === group.heading?.line);
                    if (headingIndexInAll >= 0) {
                        const totalCount = this.getTotalEquationsForHeading(equations, headings, headingIndexInAll);
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
                await this.renderHeadingGroup(outlineContainer, filteredGroups, i, equations, headings);
            }
        }
    }

    private groupEquationsByHeadings(equations: EquationMatch[], headings: Heading[]): EquationGroup[] {
        const groups: EquationGroup[] = [];
        const eqs_sorted = equations.toSorted((a, b) => a.lineStart - b.lineStart);

        // Group non-heading equations first (if any exist before first heading)
        const nonHeadingEquations = headings.length > 0
            ? eqs_sorted.filter(eq => eq.lineStart < headings[0].line)
            : eqs_sorted; // If no headings at all, all equations are non-heading

        if (nonHeadingEquations.length > 0) {
            const group: EquationGroup = {
                heading: null,
                equations: nonHeadingEquations,
                absoluteLevel: NO_HEADING_LEVEL,
                relativeLevel: NO_HEADING_LEVEL
            };
            groups.push(group);
        }

        // Process ALL headings, not just those with equations
        for (let i = 0; i < headings.length; i++) {
            const heading = headings[i];

            // Get only direct equations (not in subheadings) for rendering
            const directEquations = this.getDirectEquationsForHeading(eqs_sorted, headings, i);

            // Add all headings, regardless of whether they have equations
            const relLevel = relativeHeadingLevel(headings, i);
            groups.push({
                heading,
                equations: directEquations, // Only store direct equations for rendering
                absoluteLevel: heading.level,
                relativeLevel: relLevel
            });
        }

        return groups;
    }

    private hasParentHeading(groups: EquationGroup[], currentIndex: number): boolean {
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
            const isCurrentlyCollapsed = this.collapsedHeadings.has(id);

            if (isCurrentlyCollapsed) {
                this.collapsedHeadings.delete(id);
                this.currentCollapseHeadingId.delete(id);
                setIcon(collapseIcon, "chevron-down");
                contentContainer.show();
            } else {
                this.collapsedHeadings.add(id);
                this.currentCollapseHeadingId.add(id);
                setIcon(collapseIcon, "chevron-right");
                contentContainer.hide();
            }
        });
    }

    private async jumpToHeading(heading: Heading): Promise<void> {
        const filePath = this.panel.getCurrentActiveFile();   // get current active file of panel
        const currentFile = filePath ? this.app.vault.getAbstractFileByPath(filePath) : null;
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

    private hasSubheadings(groups: EquationGroup[], currentIndex: number): boolean {
        // Check if this heading has any direct subheadings
        return this.getDirectSubheadingIndices(groups, currentIndex).length > 0;
    }

    private getDirectSubheadingIndices(groups: EquationGroup[], currentIndex: number): number[] {
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

    private getHeadingMetadata(
        allGroups: EquationGroup[],
        currentIndex: number,
        allEquations: EquationMatch[],
        allHeadings: Heading[]
    ): HeadingMetadata {
        const group = allGroups[currentIndex];
        const hasDirectEquations = group.equations.length > 0;
        const hasSubheadings = this.hasSubheadings(allGroups, currentIndex);
        const hasContent = hasDirectEquations || hasSubheadings;

        const headingIndexInAll = group.heading ? allHeadings.findIndex(h => h.line === group.heading?.line) : -1;
        const totalEquationCount = headingIndexInAll >= 0
            ? this.getTotalEquationsForHeading(allEquations, allHeadings, headingIndexInAll)
            : group.equations.length;

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
        const isCollapsed = this.currentCollapseHeadingId.has(id);

        return {
            id,
            lineNumber,
            isCollapsed,
            heading: groupHeading,
            hasDirectEquations,
            hasSubheadings,
            hasContent,
            totalEquationCount,
            isNoHeadingGroup,
        }
    }

    private async renderHeadingGroup(
        container: HTMLElement,
        allGroups: EquationGroup[],
        currentIndex: number,
        allEquations: EquationMatch[],
        allHeadings: Heading[]
    ): Promise<void> {
        const metadata = this.getHeadingMetadata(allGroups, currentIndex, allEquations, allHeadings);
        const { hasDirectEquations, hasContent, id, isCollapsed } = metadata;
        
        const group = allGroups[currentIndex];
        const headingDiv = this.createHeadingDiv(container, group, metadata);
        const { collapseIcon } = this.createHeadingHeader(headingDiv, group, metadata);

        // Create a content container that will hold subheadings and equations
        const contentContainer = headingDiv.createDiv("ec-heading-content");

        // Hide content container BEFORE rendering if collapsed (better UX - no flash)
        if (isCollapsed) {
            contentContainer.hide();
        }

        // Get DIRECT subheading indices only (not all nested levels)
        const directSubheadingIndices = this.getDirectSubheadingIndices(allGroups, currentIndex);

        // First, render direct equations (not in subheadings)
        if (hasDirectEquations) {
            const directEquationsContainer = contentContainer.createDiv("ec-heading-equations");
            for (const eq of group.equations) {
                await this.panel.renderEquationItem(directEquationsContainer, eq);
            }
        }

        // Then, render ONLY direct subheadings (they will recursively render their own children)
        for (const subIndex of directSubheadingIndices) {
            await this.renderHeadingGroup(
                contentContainer,
                allGroups,
                subIndex,
                allEquations,
                allHeadings
            );
        }

        this.attachCollapseHandler(hasContent, collapseIcon, id, contentContainer);
    }

    private createHeadingDiv(container: HTMLElement, group: EquationGroup, metadata: HeadingMetadata): HTMLElement {
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

    private createHeadingHeader(headingDiv: HTMLElement, group: EquationGroup, metadata: HeadingMetadata): {
        headingHeader: HTMLElement;
        collapseIcon: HTMLElement | null;
    } {
        const headingHeader = headingDiv.createDiv("ec-heading-header ec-clickable");
        const collapseIcon = this.createCollapseIcon(headingHeader, group, metadata);
        this.createHeadingText(headingHeader, group);
        this.createEquationCountBadge(headingHeader, metadata.totalEquationCount);

        return { headingHeader, collapseIcon };
    }

    private createCollapseIcon(headingHeader: HTMLElement, group: EquationGroup, metadata: HeadingMetadata): HTMLElement | null {
        if (metadata.hasContent) {
            const collapseIcon = headingHeader.createSpan(`ec-collapse-icon ec-heading-collapse-icon-${group.absoluteLevel}`);
            setIcon(collapseIcon, metadata.isCollapsed ? "chevron-right" : "chevron-down");
            return collapseIcon;
        }
        headingHeader.createSpan({ cls: "ec-collapse-icon-placeholder" });
        return null;
    }

    private createHeadingText(headingHeader: HTMLElement, group: EquationGroup): void {
        const headingText = group.heading ? group.heading.text : "Equations without heading";
        const headingTextSpan = headingHeader.createSpan({
            cls: `ec-heading-text ec-heading-text-${group.absoluteLevel}`,
            text: headingText
        });

        if (group.heading) {
            headingTextSpan.addClass('ec-clickable');
            headingTextSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                if (group.heading) {
                    void this.jumpToHeading(group.heading);
                }
            });
        }
    }

    private createEquationCountBadge(headingHeader: HTMLElement, totalEquationCount: number): void {
        if (totalEquationCount > 0) {
            headingHeader.createSpan({
                cls: "ec-equation-count",
                text: totalEquationCount.toString()
            });
        }
    }

    private getTotalEquationsForHeading(equations: EquationMatch[], headings: Heading[], currentIndex: number): number {
        // Get total count of equations in this heading including all subheadings
        const endLine = this.getEndLineForHeading(headings, currentIndex);
        const heading = headings[currentIndex];

        const totalEquations = equations.filter(eq =>
            eq.lineStart > heading.line && eq.lineStart < endLine
        );
        return totalEquations.length;
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

    private getDirectEquationsForHeading(equations: EquationMatch[], headings: Heading[], currentIndex: number): EquationMatch[] {
        // Get only the equations directly under this heading (not in any subheading)
        const heading = headings[currentIndex];
        const nextHeadingLine = currentIndex < headings.length - 1 ? headings[currentIndex + 1].line : Infinity;

        // Find equations between this heading and the next heading
        const directEquations = equations.filter(eq =>
            eq.lineStart > heading.line && eq.lineStart < nextHeadingLine
        );

        return directEquations;
    }
}