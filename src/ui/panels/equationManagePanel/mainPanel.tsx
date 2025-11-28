import { ItemView, WorkspaceLeaf, setIcon, MarkdownRenderer, Notice, MarkdownView, TFile } from "obsidian";
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
    public lockFileModeButton: HTMLElement;
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
    
    // State variables  
    public viewMode: ViewMode = "list";
    public sortMode: SortType = "seq";
    public showEquationTags = false;
    public isSearchMode = false;
    public searchQuery = "";
    public filterEmptyHeadings = false; // Default to outline view (show all headings)
    public collapsedHeadings: Set<number> = new Set();
    public lockFileModeEnabled = false;
    public lockRefreshEnabled = false;
    public enableRenderHeadingOnly = false; // in outline mode, only render headings without equations 

    
    private lastDragTargetView: MarkdownView | null = null;
    private refreshDebounceTimer: number | null = null;
    private searchDebounceTimer: number | null = null;
    private fileCheckInterval: number | null = null;

    // last state stored for avoid frequent refresh
    private currentEquationHash = "";
    private currentActiveFile = "";      // current active file path (used for fast refresh)
    private currentViewMode = "";    // current display mode (used for fast refresh)
    private currentCollapseHeadings: Set<number> = new Set();
    private currentSortMode = "";    // current sort mode (used for fast refresh)
    private currentFilterEmptyHeadings = false; // current filter state (used for fast refresh)
    private currentHeadings: Heading[] = [];

    // Event handlers
    private updateHandler: () => void;
    private dropHandler: (evt: DragEvent) => void;
    private dragoverHandler: (evt: DragEvent) => void;
    private dragendHandler: () => void;

    constructor(private plugin: EquationCitator, leaf: WorkspaceLeaf) {
        super(leaf);

        this.currentActiveFile = "";  // enforce refresh when the panel is opened

        // Debounced handler for file modifications
        this.updateHandler = () => {
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
            this.refreshDebounceTimer = window.setTimeout(
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
        setToolbarDefaultState(this, this.plugin.settings.equationManagePanelDefaultViewType);

        

        // Register event listeners for dynamic updates
        this.registerEvent(
            // File modification: debounced refresh (5s delay) 
            this.app.vault.on('modify', this.updateHandler)
        );

        // Poll to check if active file changed (using current setting value)
        this.fileCheckInterval = window.setInterval(() => {
            const currentFile = this.app.workspace.getActiveFile();
            const currentPath = currentFile?.path || "";
            // Only refresh if file changed
            if (!this.lockFileModeEnabled && currentPath !== this.currentActiveFile) {
                this.currentActiveFile = currentPath;

                void this.refreshView();
                // Cancel pending debounced refresh since we're switching files
                if (this.refreshDebounceTimer !== null) {
                    clearTimeout(this.refreshDebounceTimer);
                    this.refreshDebounceTimer = null;
                }
            }
        }, this.plugin.settings.equationManagePanelfileCheckInterval);
        // Initialize current active file
        const initialFile = this.app.workspace.getActiveFile();
        this.currentActiveFile = initialFile?.path || "";
        
        // Register drop handler for equation drag-drop
        this.registerDropEquationHandler();
        // remove refreshView Here to avoid unsuccessful refresh 
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

            if (evt.dataTransfer && types.includes('ec-equations/drop-citaions')) {
                // show different type of cursor according to if its editor 
                const targetView = getMarkdownViewFromEvent(this.plugin.app.workspace, evt);
                if (this.lastDragTargetView && targetView !== this.lastDragTargetView) {
                    clearDragCursor(this.lastDragTargetView);  // clear previous drag cursor
                }
                this.lastDragTargetView = targetView;
                if (!targetView || !targetView.editor) {
                    evt.dataTransfer.dropEffect = 'none';
                } else {
                    evt.preventDefault();
                    evt.dataTransfer.dropEffect = 'copy';
                    // Move the actual editor cursor to the drag position
                    drawCursorAtDragPosition(evt, targetView);
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
            const data = evt.dataTransfer?.getData('ec-equations/drop-citaions');
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
            if (!success) {
                new Notice('Failed to add tag to equation. Make sure the source file is open.');
                return;
            }
            await this.refreshView();  // refresh view after renaming 
        }

        // Check if this is a cross-file citation
        const isTargetSameAsSource = targetFile.path === equationData.sourcePath;
        const citationPrefix = this.plugin.settings.citationPrefix;
        let citation: string;

        if (!isTargetSameAsSource) {
            // Cross-file citation: need to create or find footnote
            const footnoteNum = await checkFootnoteExists(
                this.plugin,
                targetFile.path,
                equationData.sourcePath,
                true  // Create footnote if it doesn't exist
            );

            if (!footnoteNum) {
                new Notice('Failed to create footnote for cross-file citation');
                return;
            }

            // Build cross-file citation: $\ref{citationPrefix}{footnoteNum}^{tag}}$
            citation = `$\\ref{${citationPrefix}${footnoteNum}^{${tag}}}$`;
        } else {
            // Same-file citation: $\ref{citationPrefix}{tag}$
            citation = `$\\ref{${citationPrefix}${tag}}$`;
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
        if (this.lockFileModeEnabled) {
            // In lock mode, use cached file path
            return this.currentActiveFile || null;
        } else {
            // In normal mode, get current active file
            const activeFile = this.app.workspace.getActiveFile();
            return activeFile?.path || null;
        }
    }

    private async getEquationsToRender(filePath: string): Promise<EquationMatch[]> {
        // Fetch equations for the given file path
        const equations = await this.plugin.equationCache.getEquationsForFile(filePath);
        if (!equations || equations.length === 0) {
            return [];
        }
        // Filter equations based on search query
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
        this.searchDebounceTimer = window.setTimeout(() => {
            void this.refreshView();
            this.searchDebounceTimer = null;
        }, timeout); // adjust delay as needed
    }

    /**
     * refresh the equations render view
     */
    public async refreshView(): Promise<void> {
        if (this.lockRefreshEnabled) {
            return;  // force not refresh when in lock refresh mode 
        }
        // Get the active file path (respecting lock mode)
        const activeFilePath = this.getCurrentActiveFile();
        
        // Update currentActiveFile state if not in lock mode
        if (!this.lockFileModeEnabled && activeFilePath) {
            this.currentActiveFile = activeFilePath;
        }

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
        
        // In outline mode, always render headings even if no equations
        if (this.viewMode === "outline") {
            // Parse headings from the current file (respects lock mode)
            const fileContent = await this.app.vault.cachedRead(currentFile);
            const headings = parseHeadingsInMarkdown(fileContent);
            
            // If headings-only mode is enabled, render without equations
            const displayEquations = this.enableRenderHeadingOnly ? [] : (equations || []);
            
            const equationsHash = hashEquations(displayEquations);
            const setsEqual = (
                this.currentCollapseHeadings.size === this.collapsedHeadings.size &&
                [...this.currentCollapseHeadings].every(x => this.collapsedHeadings.has(x))
            );
            const headingsEqual = (
                headings.length === this.currentHeadings.length &&
                headings.every((h, i) => h.level === this.currentHeadings[i].level && h.text === this.currentHeadings[i].text)
            );
            const viewStateEqual = (
                equationsHash === this.currentEquationHash &&
                this.viewMode === this.currentViewMode &&
                this.sortMode === this.currentSortMode &&
                this.filterEmptyHeadings === this.currentFilterEmptyHeadings &&
                setsEqual
            );

            // Update state
            this.currentEquationHash = equationsHash;
            this.currentViewMode = this.viewMode;
            this.currentCollapseHeadings = new Set(this.collapsedHeadings);
            this.currentSortMode = this.sortMode;
            this.currentFilterEmptyHeadings = this.filterEmptyHeadings;
            this.currentHeadings = headings;

            if (viewStateEqual && headingsEqual) {
                Debugger.log("View state equal, no need to refresh");
                return;
            }

            this.viewPanel?.empty();
            await this.renderOutlineView(displayEquations, headings);
            return;
        }
        
        // List mode: Handle no equations case
        if (!equations || equations.length === 0) {
            if (this.viewPanel) {
                this.viewPanel.empty();
                this.viewPanel.createDiv({
                    text: this.searchQuery ? "No equation match your search" : "No equation found in current file",
                    cls: "ec-empty-message"
                });
            }
            this.currentEquationHash = hashEquations([]);
            return;
        }
        
        const equationsHash = hashEquations(equations);
        const setsEqual = (
            this.currentCollapseHeadings.size === this.collapsedHeadings.size &&
            [...this.currentCollapseHeadings].every(x => this.collapsedHeadings.has(x))
        );
        const viewStateEqual = (
            equationsHash === this.currentEquationHash &&
            this.viewMode === this.currentViewMode &&
            this.sortMode === this.currentSortMode &&
            this.filterEmptyHeadings === this.currentFilterEmptyHeadings &&
            setsEqual
        );

        // Update state
        this.currentEquationHash = equationsHash;
        this.currentViewMode = this.viewMode;
        this.currentCollapseHeadings = new Set(this.collapsedHeadings);
        this.currentSortMode = this.sortMode;
        this.currentFilterEmptyHeadings = this.filterEmptyHeadings;

        if (viewStateEqual) {
            Debugger.log("View state equal, no need to refresh");
            return;
        }

        this.viewPanel?.empty();
        await this.renderRowsView(equations);
    }

    private filterEquations(equations: EquationMatch[]): EquationMatch[] {
        if (!this.searchQuery || this.searchQuery.trim().length === 0) return equations;

        const query = this.searchQuery.toLowerCase();
        return equations.filter(eq => {
            // Search in content (without $$ delimiters)
            const searchContent = eq.content.toLowerCase();
            if (searchContent.includes(query)) return true;

            // Search in tag if exists
            if (eq.tag && eq.tag.toLowerCase().includes(query)) return true;

            return false;
        });
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
        const eqs_sorted = equations.sort((a, b) => a.lineStart - b.lineStart);

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

    private async renderHeadingGroup(
        container: HTMLElement,
        allGroups: EquationGroup[],
        currentIndex: number,
        allEquations: EquationMatch[],
        allHeadings: Heading[]
    ): Promise<void> {
        const group = allGroups[currentIndex];
        // Determine if this heading should have a chevron (has equations or subheadings)
        const hasDirectEquations = group.equations.length > 0;
        const hasSubheadings = this.hasSubheadings(allGroups, currentIndex);
        const hasContent = hasDirectEquations || hasSubheadings;

        // Calculate total equation count (including subheadings) for display
        const headingIndexInAll = group.heading ? allHeadings.findIndex(h => h.line === group.heading?.line) : -1;
        const totalEquationCount = headingIndexInAll >= 0
            ? this.getTotalEquationsForHeading(allEquations, allHeadings, headingIndexInAll)
            : group.equations.length;

        // Use a special key for non-heading groups
        const headingKey = group.heading ? group.heading.line : -1;
        const isNoHeadingGroup = group.heading === null;

        // Check if collapsed (no-heading group can be collapsed too)
        const isCollapsed = this.collapsedHeadings.has(headingKey);

        // Use special class for no-heading group
        const headingClasses = isNoHeadingGroup
            ? "ec-heading-item ec-no-heading-group"
            : `ec-heading-item ec-heading-level-${group.relativeLevel}`;

        const headingDiv = container.createDiv({
            cls: headingClasses,
            attr: { 'data-line': headingKey.toString() }   // Store the line number as data attribute 
        });

        // click to jump to heading location 
        const headingHeader = headingDiv.createDiv("ec-heading-header ec-clickable");

        // Collapse/expand icon - only show if has content
        let collapseIcon: HTMLElement | null = null;
        if (hasContent) {
            collapseIcon = headingHeader.createSpan(`ec-collapse-icon ec-heading-collapse-icon-${group.absoluteLevel}`);
            setIcon(collapseIcon, isCollapsed ? "chevron-right" : "chevron-down");
        } else {
            // Add empty space to align text properly
            headingHeader.createSpan({ cls: "ec-collapse-icon-placeholder" });
        }

        // Heading text
        const headingText = group.heading ? group.heading.text : "Equations without heading";
        const headingTextSpan = headingHeader.createSpan({
            cls: `ec-heading-text ec-heading-text-${group.absoluteLevel}`,  // here we use absolute level
            text: headingText
        });

        // Make heading text clickable if it's a real heading (not no-heading group)
        if (group.heading) {
            headingTextSpan.addClass('ec-clickable');
            // Click handler for heading text - jump to heading location
            headingTextSpan.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                if (group.heading) {
                    void this.jumpToHeading(group.heading);
                }
            });
        }

        // Equation count badge - show total count (including subheadings)
        if (totalEquationCount > 0) {
            headingHeader.createSpan({
                cls: "ec-equation-count",
                text: totalEquationCount.toString()
            });
        }

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

        // Click handler for chevron - collapse/expand
        if (hasContent && collapseIcon) {
            const iconElement = collapseIcon;
            collapseIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const isCurrentlyCollapsed = this.collapsedHeadings.has(headingKey);

                if (isCurrentlyCollapsed) {
                    this.collapsedHeadings.delete(headingKey);
                    setIcon(iconElement, "chevron-down");
                    contentContainer.show();
                } else {
                    this.collapsedHeadings.add(headingKey);
                    setIcon(iconElement, "chevron-right");
                    contentContainer.hide();
                }
            });
        }
        return;
    }

    private async jumpToHeading(heading: Heading): Promise<void> {
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return;

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
        eqDiv.setAttribute('data-equation-tag', equation.tag || '');
        eqDiv.setAttribute('data-equation-content', equation.content);

        // Tag section (if exists)
        if (equation.tag) {
            const tagDiv = eqDiv.createDiv({ cls: "ec-equation-tag ec-tag-show" });
            tagDiv.createSpan({ text: equation.tag, cls: "ec-tag-text" });
        }

        // Equation content
        const contentDiv = eqDiv.createDiv("ec-equation-content");

        // Render the equation using MathJax or Obsidian's renderer
        const mathDiv = contentDiv.createDiv("ec-equation-math");

        // Use Obsidian's markdown renderer to render the equation
        const equationMd = `$$\n${equation.content}\n$$`;
        const currentFile = this.app.workspace.getActiveFile();
        await MarkdownRenderer.render(
            this.plugin.app,
            equationMd,
            mathDiv,
            currentFile?.path || "",
            this
        );

        // Add click handler to jump to equation in the editor
        // Ctrl/Cmd + double click always creates new panel on right
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
            event.dataTransfer.setData('ec-equations/drop-citaions', dataString);
            event.dataTransfer.effectAllowed = 'copy';
        });

        // Drag end event
        eqDiv.addEventListener('dragend', () => {
            document.body.classList.remove('ec-equation-dragging');
            eqDiv.classList.remove('ec-is-dragging');
        });
    }

    private async jumpToEquation(equation: EquationMatch): Promise<void> {
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return;

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

