import { ItemView, WorkspaceLeaf, setIcon, MarkdownView, TFile, loadMathJax } from "obsidian";
import EquationCitator from "@/main";
import { EquationMatch } from "@/utils/parsers/equation_parser";
import { hashEquations } from "@/utils/misc/hash_utils";
import { parseHeadingsInMarkdown, Heading, relativeHeadingLevel } from "@/utils/parsers/heading_parser";
import { getMarkdownViewFromEvent } from "@/utils/workspace/get_evt_view";
import { drawCursorAtDragPosition, clearDragCursor, getEditorDropLocation } from "@/utils/workspace/drag_drop_event";
import Debugger from "@/debug/debugger";
import { insertTextWithCursorOffset } from "@/utils/workspace/insertTextOnCursor";
import TagInputModal from "@/ui/modals/tagInputModal";
import { checkFootnoteExists } from "@/utils/core/footnote_utils";
import { scrollToEquationByTag } from "@/utils/workspace/equation_navigation";
import {
    renderToolbar,
    setToolbarDefaultState
} from "./toolbar";
import { isMarkdownFilePath } from "@/utils/misc/fileProcessor";
import { forceMathRefresh } from "@/utils/misc/mathjax_utils";

export const EQUATION_MANAGE_PANEL_TYPE = "equation-arrange-panel";

type ViewMode = "outline" | "list";
type SortType = "tag" | "seq";

interface EquationGroup {
    heading: Heading | null;  // null for no heading 
    equations: EquationMatch[];
    absoluteLevel: number;
    relativeLevel: number;
}

export class EquationArrangePanel extends ItemView {
    // UI Element objects  
    public viewModeButton!: HTMLElement;
    public viewPanel!: HTMLElement;
    public lockRefreshButton: HTMLElement;
    public searchButton!: HTMLElement;
    public searchInput!: HTMLInputElement;
    public quitSearchButton!: HTMLElement;
    public enableRenderHeadingOnlyButton: HTMLElement;
    public extendToolBarButton: HTMLElement;
    public subToolbarPanel!: HTMLElement;
    public sortButton!: HTMLElement;
    public collapseButton!: HTMLElement;
    public expandButton!: HTMLElement;
    public toggleTagShowButton: HTMLElement;
    public filterEmptyHeadingsButton: HTMLElement;
    public filterTagOnlyEquationButton: HTMLElement;

    // State variables  
    public viewMode: ViewMode = "list";
    public sortMode: SortType = "seq";
    public showEquationTags = false;
    public isSearchMode = false;
    public searchQuery = "";
    public filterEmptyHeadings = false; // Default to outline view (show all headings)
    public filterTagOnlyEquation = false;
    public collapsedHeadings: Set<number> = new Set();
    public lockRefreshEnabled = false;
    public enableRenderHeadingOnly = false; // in outline mode, only render headings without equations 

    private lastDragTargetView: MarkdownView | null = null;
    private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private fileCheckInterval: ReturnType<typeof setTimeout> | null = null;

    // last state stored for avoid frequent refresh
    private currentEquationHash = "";
    private currentActiveFile = "";      // current active file path (used for fast refresh)
    private currentViewMode = "";    // current display mode (used for fast refresh)
    private currentCollapseHeadings: Set<number> = new Set();
    private currentSortMode = "";    // current sort mode (used for fast refresh)
    private currentFilterEmptyHeadings = false; // current filter state (used for fast refresh)
    private currentHeadings: Heading[] = [];

    // Cached data for lock refresh mode (public for toolbar access)
    public cachedEquations: EquationMatch[] = [];
    public cachedFilePath: string = "";

    // Event handlers
    private readonly updateHandler: () => void;
    private dropHandler: (evt: DragEvent) => void;
    private dragoverHandler: (evt: DragEvent) => void;
    private dragendHandler: () => void;

    constructor(private readonly plugin: EquationCitator, leaf: WorkspaceLeaf) {
        super(leaf);

        this.currentActiveFile = "";  // enforce refresh when the panel is opened

        // Debounced handler for file modifications
        this.updateHandler = () => {
            if (this.lockRefreshEnabled) return; // Skip automatic update when locked

            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) return;

            // Only schedule refresh if the active file is a markdown file
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) return;

            // Clear existing timer
            if (this.refreshDebounceTimer !== null) {
                clearTimeout(this.refreshDebounceTimer);
            }

            // Schedule refresh using current setting value
            this.refreshDebounceTimer = globalThis.setTimeout(
                () => {
                    void this.refreshView();
                    this.refreshDebounceTimer = null;
                }, this.plugin.settings.equationManagePanelLazyUpdateTime
            );
        };
    }

    getViewType(): string {
        return EQUATION_MANAGE_PANEL_TYPE;
    }

    getDisplayText(): string {
        return "Equations arrange panel";
    }

    getIcon(): string {
        return "square-pi";
    }

    async onOpen(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();
        const panelWrapper = containerEl.createDiv("ec-manage-panel-wrapper");

        // Render toolbar and sub-panel
        renderToolbar(this, panelWrapper);

        // Create view panel for equations
        this.viewPanel = panelWrapper.createDiv("ec-equation-list-panel");

        // Set default toolbar state
        setToolbarDefaultState(this, this.plugin);

        // Register event listeners for dynamic updates
        this.registerEvent(
            // File modification: debounced refresh (5s delay) 
            this.app.vault.on('modify', this.updateHandler)
        );

        // Poll to check if active file changed (using current setting value)
        this.fileCheckInterval = globalThis.setInterval(() => {
            if (this.lockRefreshEnabled) return; // Skip check when locked

            const currentFile = this.app.workspace.getActiveFile();
            const currentPath = currentFile?.path || "";
            // Only refresh if file changed
            if (currentPath !== this.currentActiveFile) {
                this.currentActiveFile = currentPath;

                void this.refreshView();
                // Cancel pending debounced refresh since we're switching files
                if (this.refreshDebounceTimer !== null) {
                    clearTimeout(this.refreshDebounceTimer);
                    this.refreshDebounceTimer = null;
                }
            }
        }, this.plugin.settings.equationManagePanelFileCheckInterval);
        // Initialize current active file
        const initialFile = this.app.workspace.getActiveFile();
        this.currentActiveFile = initialFile?.path || "";

        // Register drop handler for equation drag-drop
        this.registerDropEquationHandler();
        await this.refreshView();
    }

    onunload(): void {
        // Clean up debounce timers
        if (this.refreshDebounceTimer !== null) {
            clearTimeout(this.refreshDebounceTimer);
            this.refreshDebounceTimer = null;
        }
        if (this.searchDebounceTimer !== null) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
        }

        // Clean up file check interval
        if (this.fileCheckInterval !== null) {
            clearInterval(this.fileCheckInterval);
            this.fileCheckInterval = null;
        }

        // Clean up event listeners (registerEvent automatically handles cleanup)
        // but we still need to remove manual listeners

        // Remove drop handlers
        if (this.dropHandler) {
            document.removeEventListener('drop', this.dropHandler, true);
        }
        if (this.dragoverHandler) {
            document.removeEventListener('dragover', this.dragoverHandler, true);
        }
        if (this.dragendHandler) {
            document.removeEventListener('dragend', this.dragendHandler, true);
        }
    }

    private registerDropEquationHandler(): void {
        // Dragover handler - show visual cursor and allow drop
        this.dragoverHandler = (evt: DragEvent) => {
            // Check if we're dragging equation data
            const types = evt.dataTransfer?.types || [];

            if (evt.dataTransfer && types.includes('ec-equations/drop-citations')) {
                // show different type of cursor according to if its editor 
                const targetView = getMarkdownViewFromEvent(this.plugin.app.workspace, evt);
                if (this.lastDragTargetView && targetView !== this.lastDragTargetView) {
                    clearDragCursor(this.lastDragTargetView);  // clear previous drag cursor
                }
                this.lastDragTargetView = targetView;
                if (targetView?.editor) {
                    evt.preventDefault();
                    evt.dataTransfer.dropEffect = 'copy';
                    // Move the actual editor cursor to the drag position
                    drawCursorAtDragPosition(evt, targetView);
                } else {
                    evt.dataTransfer.dropEffect = 'none';
                }
            }
        };

        // Drop handler
        this.dropHandler = (evt: DragEvent) => {
            // Get the target view to insert citation
            const targetView = getMarkdownViewFromEvent(this.plugin.app.workspace, evt);
            if (!targetView) return;
            // Clear the drag cursor after drop
            clearDragCursor(targetView);

            // Try to get equation data
            const data = evt.dataTransfer?.getData('ec-equations/drop-citations');
            if (!data) return;   // no data to drop

            evt.preventDefault();
            evt.stopPropagation();

            const equationData = JSON.parse(data);
            // Also move the editor cursor for visual feedback
            // Only handle our equation drops (must have content field)
            if (!equationData.content) {
                return;
            }

            void this.handleEquationDrop(equationData, evt);
        };

        // Dragend handler - clean up cursor
        this.dragendHandler = () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                clearDragCursor(activeView);
            }
        };
        // Register all handlers with capture phase to intercept before other handlers
        document.addEventListener('drop', this.dropHandler, true);
        document.addEventListener('dragover', this.dragoverHandler, true);
        document.addEventListener('dragend', this.dragendHandler, true);
    }

    private async handleEquationDrop(
        equationData: {
            tag: string;
            content: string;
            sourcePath: string;
            lineStart: number;
            lineEnd: number;
        },
        evt: DragEvent
    ): Promise<void> {
        const targetView = getMarkdownViewFromEvent(this.plugin.app.workspace, evt);
        if (!targetView) return;

        const editor = targetView.editor;
        const targetFile = targetView.file;
        if (!targetFile || !editor) {
            return;
        }

        let tag = equationData.tag;
        // If no tag, prompt for tag and add it to the equation
        if (!tag) {
            const newTag = await this.promptForTag();
            if (!newTag) return;

            tag = newTag;

            // Add tag to equation using the service
            const success = this.plugin.equationServices.addTagToEquation(
                equationData.sourcePath,
                equationData.lineStart,
                equationData.lineEnd,
                tag
            );
            if (!success) return;
            await this.refreshView();  // refresh view after renaming 
        }

        // Check if this is a cross-file citation
        const isTargetSameAsSource = targetFile.path === equationData.sourcePath;
        const citationPrefix = this.plugin.settings.citationPrefix;
        let citation: string;

        if (isTargetSameAsSource) {
            // Same-file citation: $\ref{citationPrefix}{tag}$
            citation = String.raw`$\ref{${citationPrefix}${tag}}$`;
        } else {
            // Cross-file citation: need to create or find footnote
            const footnoteNum = await checkFootnoteExists(
                this.plugin,
                targetFile.path,
                equationData.sourcePath,
                true  // Create footnote if it doesn't exist
            );

            if (!footnoteNum) return;
            // Build cross-file citation: $\ref{citationPrefix}{footnoteNum}^{tag}}$
            citation = String.raw`$\ref{${citationPrefix}${footnoteNum}^{${tag}}}$`;
        }

        let dropPosition = getEditorDropLocation(editor, evt);

        if (dropPosition === null) {
            // fallback to current cursor
            dropPosition = editor.getCursor();
            Debugger.log('No drop position found, fall back to current cursor position');
        }

        editor.setCursor(dropPosition);
        insertTextWithCursorOffset(editor, citation, citation.length);
        // Focus the editor to ensure it's active
        await targetView.leaf.setViewState({
            ...targetView.leaf.getViewState(),
            active: true
        });
    }

    private async promptForTag(): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new TagInputModal(this.app, (tag) => {
                resolve(tag);
            });
            modal.open();
        });
    }


    /**
     * Get the current active file path, respecting lock mode
     * @returns The file path if available, null otherwise
     */
    private getCurrentActiveFile(): string | null {
        if (this.lockRefreshEnabled) {
            // lock refresh returns cached file path
            return this.cachedFilePath || null;
        } else {
            // In normal mode, get current active file
            const activeFile = this.app.workspace.getActiveFile();
            const path = activeFile?.path;
            if (!path || !isMarkdownFilePath(path)) return null;
            return path;
        }
    }

    private async getEquationsToRender(filePath: string): Promise<EquationMatch[]> {
        let equations: EquationMatch[];

        if (this.lockRefreshEnabled) {
            // Use cached equations when lock is enabled
            equations = this.cachedEquations;
        } else {
            // Fetch equations for the given file path
            const fetchedEquations = await this.plugin.equationCache.getEquationsForFile(filePath);
            equations = fetchedEquations || [];

            // Update cache when not locked
            this.cachedEquations = equations;
            this.cachedFilePath = filePath;
        }

        if (equations.length === 0) {
            return [];
        }

        // Filter equations based on search query (always applied)
        const filteredEquations = this.filterEquations(equations);
        return filteredEquations;
    }

    /**
     * schedule refresh the equations render view with debounce (for search input)
     */
    public scheduleRefreshView(timeout = 500) {
        if (this.searchDebounceTimer !== null) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
        }
        this.searchDebounceTimer = globalThis.setTimeout(() => {
            void this.refreshView();
            this.searchDebounceTimer = null;
        }, timeout); // adjust delay as needed
    }

    private renderEmptyPanelView(): void {
        if (this.viewPanel) {
            this.viewPanel.createDiv({
                text: this.searchQuery ? "No equation match your search" : "No equation found in current file",
                cls: "ec-empty-message"
            });
        }
        this.currentEquationHash = hashEquations([]);
    }

    public async handleOutlineViewRefresh(
        equations: EquationMatch[],
        headings: Heading[],
        viewStateEqual: boolean
    ): Promise<void> {
        // If headings-only mode is enabled, render without equations
        const displayEquations = this.enableRenderHeadingOnly ? [] : (equations || []);

        const equationsHash = hashEquations(displayEquations);
        const equationsEqual = (equationsHash === this.currentEquationHash);
        const collapseEqual = (
            this.currentCollapseHeadings.size === this.collapsedHeadings.size &&
            [...this.currentCollapseHeadings].every(x => this.collapsedHeadings.has(x))
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
        this.currentEquationHash = equationsHash;
        this.currentCollapseHeadings = new Set(this.collapsedHeadings);
        this.currentHeadings = headings;

        this.viewPanel?.empty();
        if (headings.length === 0 && displayEquations.length === 0) {
            this.renderEmptyPanelView();
            return;
        }
        await this.renderOutlineView(displayEquations, headings);
    }
    
    public async handleListViewRefresh(
        equations: EquationMatch[],
        viewStateEqual: boolean,
    ): Promise<void> {
        // List mode: Handle no equations case
        const equationsHash = hashEquations(equations);
        const equationsEqual = (equationsHash === this.currentEquationHash);

        if (viewStateEqual && equationsEqual) {
            Debugger.log("View state equal, no need to refresh");
            return;
        }
        // Update state
        this.currentEquationHash = equationsHash;
        this.viewPanel?.empty();
        if (equations.length === 0) {
            this.renderEmptyPanelView();
            return;
        }
        await this.renderRowsView(equations);
    }

    /**
     * refresh the equations render view
     */
    public async refreshView(): Promise<void> {
        // Get the active file path (respecting lock mode)
        const activeFilePath = this.getCurrentActiveFile() || "";
        this.currentActiveFile = activeFilePath;   // used for record current state 

        // Handle no active file case
        if (!activeFilePath) {
            if (this.viewPanel) {
                this.viewPanel.empty();
                this.viewPanel.createDiv({ text: "No active file", cls: "ec-empty-message" });
            }
            this.currentEquationHash = hashEquations([]);
            return;
        }

        // Check if file exists in vault
        const currentFile = this.app.vault.getAbstractFileByPath(activeFilePath);
        if (!(currentFile instanceof TFile)) {
            if (this.viewPanel) {
                this.viewPanel.empty();
                this.viewPanel.createDiv({ text: "File not found", cls: "ec-empty-message" });
            }
            this.currentEquationHash = hashEquations([]);
            return;
        }

        // Fetch and filter equations for the current file
        const equations = await this.getEquationsToRender(activeFilePath);

        // viewState => tool bar state
        const viewStateEqual = (
            this.viewMode === this.currentViewMode &&
            this.sortMode === this.currentSortMode &&
            this.filterEmptyHeadings === this.currentFilterEmptyHeadings
        );
        // re-assign view State  
        this.currentViewMode = this.viewMode;
        this.currentSortMode = this.sortMode;
        this.currentFilterEmptyHeadings = this.filterEmptyHeadings;

        // In outline mode, always render headings even if no equations
        if (this.viewMode === "outline") {
            // Parse headings from the current file (respects lock mode)
            const fileContent = await this.app.vault.cachedRead(currentFile);
            const headings = parseHeadingsInMarkdown(fileContent);
            await this.handleOutlineViewRefresh(equations, headings, viewStateEqual);
        }
        else {
            await this.handleListViewRefresh(equations, viewStateEqual);
        }
    }

    private filterEquations(equations: EquationMatch[]): EquationMatch[] {
        const tagFilter = (eq: EquationMatch) => !this.filterTagOnlyEquation || (eq.tag && eq.tag.trim().length > 0);

        if (!this.searchQuery || this.searchQuery.trim().length === 0) {
            return equations.filter(tagFilter);
        }

        const query = this.searchQuery.toLowerCase();
        return equations.filter(eq => {
            // Search in content (without $$ delimiters)
            const searchContent = eq.content.toLowerCase();
            if (searchContent.includes(query)) return true;
            // Search in tag if exists
            if (eq.tag?.toLowerCase().includes(query)) return true;
            return false;
        }).filter(tagFilter);
    }

    private sortEquations(equations: EquationMatch[]): EquationMatch[] {
        if (this.sortMode === "tag") {
            // Sort by tag (equations with tags first, then by tag alphabetically)
            return [...equations].sort((a, b) => {
                if (!a.tag && !b.tag) return a.lineStart - b.lineStart;
                if (!a.tag) return 1;
                if (!b.tag) return -1;
                return a.tag.localeCompare(b.tag);
            });
        } else {
            // Sort by sequence (line number)
            return [...equations].sort((a, b) => a.lineStart - b.lineStart);
        }
    }

    private async renderRowsView(equations: EquationMatch[]): Promise<void> {
        const filteredEquations = this.filterEquations(equations);
        // Sort equations
        const sortedEquations = this.sortEquations(filteredEquations);
        const listContainer = this.viewPanel.createDiv("ec-list-view");

        for (const eq of sortedEquations) {
            await this.renderEquationItem(listContainer, eq);
        }
    }

    private async renderOutlineView(
        equations: EquationMatch[],
        headings: Heading[],
    ): Promise<void> {
        if (headings.length === 0) {
            // No headings, render as flat list
            await this.renderRowsView(equations);
            return;
        }
        // Group equations by headings
        const groups = this.groupEquationsByHeadings(equations, headings);

        // Filter groups if filter is enabled - need to check total equations including subheadings
        const filteredGroups = this.filterEmptyHeadings
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

        const outlineContainer = this.viewPanel.createDiv("ec-outline-view");

        // Render only top-level headings; subheadings will be rendered recursively
        for (let i = 0; i < filteredGroups.length; i++) {
            // Check if this is a top-level heading (no parent with lower relative level before it)
            const isTopLevel = i === 0 || !this.hasParentHeading(filteredGroups, i);

            if (isTopLevel || filteredGroups[i].heading === null) {
                await this.renderHeadingGroup(outlineContainer, filteredGroups, i, equations, headings);
            }
        }
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

    private getTotalEquationsForHeading(equations: EquationMatch[], headings: Heading[], currentIndex: number): number {
        // Get total count of equations in this heading including all subheadings
        const endLine = this.getEndLineForHeading(headings, currentIndex);
        const heading = headings[currentIndex];

        const totalEquations = equations.filter(eq =>
            eq.lineStart > heading.line && eq.lineStart < endLine
        );
        return totalEquations.length;
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
                absoluteLevel: 7, // Use level 7 to prevent any heading as subheading
                relativeLevel: 7
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
        group: EquationGroup,
        allGroups: EquationGroup[],
        currentIndex: number,
        allEquations: EquationMatch[],
        allHeadings: Heading[]
    ) {
        const hasDirectEquations = group.equations.length > 0;
        const hasSubheadings = this.hasSubheadings(allGroups, currentIndex);
        const hasContent = hasDirectEquations || hasSubheadings;

        const headingIndexInAll = group.heading ? allHeadings.findIndex(h => h.line === group.heading?.line) : -1;
        const totalEquationCount = headingIndexInAll >= 0
            ? this.getTotalEquationsForHeading(allEquations, allHeadings, headingIndexInAll)
            : group.equations.length;

        const headingKey = group.heading ? group.heading.line : -1;
        const isNoHeadingGroup = group.heading === null;
        const isCollapsed = this.collapsedHeadings.has(headingKey);

        return {
            hasDirectEquations,
            hasSubheadings,
            hasContent,
            totalEquationCount,
            headingKey,
            isNoHeadingGroup,
            isCollapsed
        };
    }

    private async renderHeadingGroup(
        container: HTMLElement,
        allGroups: EquationGroup[],
        currentIndex: number,
        allEquations: EquationMatch[],
        allHeadings: Heading[]
    ): Promise<void> {
        const group = allGroups[currentIndex];
        const metadata = this.getHeadingMetadata(group, allGroups, currentIndex, allEquations, allHeadings);
        const { hasDirectEquations, hasContent, headingKey, isCollapsed } = metadata;

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
                await this.renderEquationItem(directEquationsContainer, eq);
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

        this.attachCollapseHandler(hasContent, collapseIcon, headingKey, contentContainer);
    }

    private createHeadingDiv(container: HTMLElement, group: EquationGroup, metadata: ReturnType<typeof this.getHeadingMetadata>): HTMLElement {
        const headingClasses = metadata.isNoHeadingGroup
            ? "ec-heading-item ec-no-heading-group"
            : `ec-heading-item ec-heading-level-${group.relativeLevel}`;

        return container.createDiv({
            cls: headingClasses,
            attr: { 'data-line': metadata.headingKey.toString() }
        });
    }

    private createHeadingHeader(headingDiv: HTMLElement, group: EquationGroup, metadata: ReturnType<typeof this.getHeadingMetadata>) {
        const headingHeader = headingDiv.createDiv("ec-heading-header ec-clickable");
        const collapseIcon = this.createCollapseIcon(headingHeader, group, metadata);
        this.createHeadingText(headingHeader, group);
        this.createEquationCountBadge(headingHeader, metadata.totalEquationCount);

        return { headingHeader, collapseIcon };
    }

    private createCollapseIcon(headingHeader: HTMLElement, group: EquationGroup, metadata: ReturnType<typeof this.getHeadingMetadata>): HTMLElement | null {
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

    private attachCollapseHandler(hasContent: boolean, collapseIcon: HTMLElement | null, headingKey: number, contentContainer: HTMLElement): void {
        if (!hasContent || !collapseIcon) return;

        collapseIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCurrentlyCollapsed = this.collapsedHeadings.has(headingKey);

            if (isCurrentlyCollapsed) {
                this.collapsedHeadings.delete(headingKey);
                this.currentCollapseHeadings.delete(headingKey);
                setIcon(collapseIcon, "chevron-down");
                contentContainer.show();
            } else {
                this.collapsedHeadings.add(headingKey);
                this.currentCollapseHeadings.add(headingKey);
                setIcon(collapseIcon, "chevron-right");
                contentContainer.hide();
            }
        });
    }

    private async jumpToHeading(heading: Heading): Promise<void> {
        const filePath = this.getCurrentActiveFile();
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

    private async renderEquationItem(container: HTMLElement, equation: EquationMatch): Promise<void> {
        const eqDiv = container.createDiv("ec-equation-item");

        // Make equation draggable
        eqDiv.draggable = true;
        eqDiv.dataset.equationTag = equation.tag || '';
        eqDiv.dataset.equationContent = equation.content;

        // Tag section (if exists)
        if (equation.tag) {
            const tagDiv = eqDiv.createDiv({ cls: "ec-equation-tag ec-tag-show" });
            tagDiv.createSpan({ text: equation.tag, cls: "ec-tag-text" });
        }

        // Create equation content div
        const contentDiv = eqDiv.createDiv("ec-equation-content");
        const mathDiv = contentDiv.createDiv("ec-equation-math");

        // Render the equation
        if (!window.MathJax) await loadMathJax();
        mathDiv.replaceChildren(window.MathJax!.tex2chtml(equation.content, { display: true }));
        await forceMathRefresh(mathDiv);

        // Add click handler to jump to equation in the editor
        // Ctrl/Cmd + double click always creates new panel on right
        const currentFile = this.app.workspace.getActiveFile();
        eqDiv.addEventListener('dblclick', (event: MouseEvent) => {
            const ctrlKey = event.ctrlKey || event.metaKey;
            if (ctrlKey && equation.tag && currentFile) {
                // Always create a new split panel on the right
                const newLeaf = this.app.workspace.getLeaf("split");
                if (newLeaf) {
                    this.app.workspace.setActiveLeaf(newLeaf, { focus: true });
                    this.app.workspace.openLinkText("", currentFile.path, false).then().catch(console.error);

                    // Scroll to the equation after layout is ready
                    this.app.workspace.onLayoutReady(() => {
                        setTimeout(() => {
                            if (equation.tag) {
                                void scrollToEquationByTag(this.plugin, equation.tag, currentFile.path);
                            }
                        }, 50);
                    });
                }
            } else {
                // Normal double click - jump in current view
                this.jumpToEquation(equation).then().catch(console.error);
            }
        });

        // Drag start event
        eqDiv.addEventListener('dragstart', (event: DragEvent) => {
            if (!event.dataTransfer) return;

            // Change cursor to grabbing hand
            document.body.classList.add('ec-equation-dragging');
            eqDiv.classList.add('ec-is-dragging');
            // Store equation data including line range for tag insertion
            const equationData = {
                tag: equation.tag || '',
                content: equation.content,
                sourcePath: currentFile?.path || '',
                lineStart: equation.lineStart,
                lineEnd: equation.lineEnd
            };
            const dataString = JSON.stringify(equationData);
            event.dataTransfer.setData('ec-equations/drop-citations', dataString);
            event.dataTransfer.effectAllowed = 'copy';
        });

        // Drag end event
        eqDiv.addEventListener('dragend', () => {
            document.body.classList.remove('ec-equation-dragging');
            eqDiv.classList.remove('ec-is-dragging');
        });
    }

    private async jumpToEquation(equation: EquationMatch): Promise<void> {
        const filePath = this.getCurrentActiveFile();
        const currentFile = filePath ? this.app.vault.getAbstractFileByPath(filePath) : null;
        if (!filePath || !currentFile || !(currentFile instanceof TFile)) return;

        // Open the file and jump to the line
        const leaf = this.app.workspace.getLeaf(false);
        if (leaf) {
            await leaf.openFile(currentFile, {
                eState: {
                    line: equation.lineStart,
                    cursor: { from: { line: equation.lineStart, ch: 0 } }
                }
            });
        }
    }
}
