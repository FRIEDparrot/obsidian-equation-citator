import { ItemView, WorkspaceLeaf, MarkdownView, TFile, loadMathJax } from "obsidian";
import EquationCitator from "@/main";
import { EquationMatch } from "@/utils/parsers/equation_parser";
import { hashEquations } from "@/utils/misc/hash_utils";
import { parseHeadingsInMarkdown } from "@/utils/parsers/heading_parser";
import Debugger from "@/debug/debugger";

import { scrollToEquationByTag } from "@/utils/workspace/equation_navigation";
import { isMarkdownFilePath } from "@/utils/misc/fileProcessor";
import { forceMathRefresh } from "@/utils/misc/mathjax_utils";

import { ViewMode, SortType } from "./types";
import {
    renderToolbar,
    setToolbarDefaultState
} from "./toolbar";
import { EquationPanelDragDropHandler } from "./drag_drop_handler";
import { EquationPanelOutlineViewRenderer } from "./outline_view_renderer";

export const EQUATION_MANAGE_PANEL_TYPE = "equation-arrange-panel";

export class EquationArrangePanel extends ItemView {
    // #region Shared Toolbar configuration variables
    // Public UI Element objects for share between several modules
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
    
    public lockRefreshEnabled = false;
    public enableRenderHeadingOnly = false; // in outline mode, only render headings without equations 
    // #endregion

    private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private fileCheckInterval: ReturnType<typeof setTimeout> | null = null;

    // last state stored for avoid frequent refresh
    public currentEquationHash = "";
    private currentActiveFile = "";      // current active file path (used for fast refresh)
    private currentViewMode = "";    // current display mode (used for fast refresh)
        
    private currentSortMode = "";    // current sort mode (used for fast refresh)
    private currentFilterEmptyHeadings = false; // current filter state (used for fast refresh)
    private outlineViewRenderer: EquationPanelOutlineViewRenderer;

    // Cached data for lock refresh mode (public for toolbar access)
    public cachedEquations: EquationMatch[] = [];
    public cachedFilePath: string = "";

    // Event handlers
    private readonly updateHandler: () => void;
    
    private dragDropHandler?: EquationPanelDragDropHandler;

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
        // Clean up existing handler if it exists (in case onOpen is called multiple times)
        if (this.dragDropHandler) {
            this.dragDropHandler.unload();
            this.dragDropHandler = undefined;
        }
        this.dragDropHandler = new EquationPanelDragDropHandler(
            this.plugin, this
        )
        this.outlineViewRenderer = new EquationPanelOutlineViewRenderer(
            this.plugin, this
        )
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
        if (this.dragDropHandler !== undefined) {
            this.dragDropHandler.unload();
            this.dragDropHandler = undefined;
        }
    }

    /**
     * Get the current active file path, respecting lock mode
     * @returns The file path if available, null otherwise
     */
    public getCurrentActiveFile(): string | null {
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

    public renderEmptyPanelView(): void {
        if (this.viewPanel) {
            this.viewPanel.createDiv({
                text: this.searchQuery ? "No equation match your search" : "No equation found in current file",
                cls: "ec-empty-message"
            });
        }
        this.currentEquationHash = hashEquations([]);
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
            // if there are no headings, fall back to list view
            if (headings.length === 0) {
                await this.handleListViewRefresh(equations, viewStateEqual);
                return;
            }
            await this.outlineViewRenderer.handleOutlineViewRefresh(equations, headings, viewStateEqual);
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

    public async renderEquationItem(container: HTMLElement, equation: EquationMatch): Promise<void> {
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
