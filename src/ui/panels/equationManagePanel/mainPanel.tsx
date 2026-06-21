import { ItemView, WorkspaceLeaf, MarkdownView, TFile, loadMathJax, normalizePath, Platform, Menu, MarkdownRenderer, renderMath, finishRenderMath } from "obsidian";
import EquationCitator from "@/main";
import { EquationMatch } from "@/utils/parsers/equation_parser";
import { ImageMatch } from "@/utils/parsers/image_parser";
import { CalloutMatch } from "@/utils/parsers/callout_parser";
import { hashPanelItems } from "@/utils/misc/hash_utils";
import { parseHeadingsInMarkdown } from "@/utils/parsers/heading_parser";
import Debugger from "@/debug/debugger";

import { scrollToEquationByTag } from "@/utils/workspace/equation_navigation";
import { isMarkdownFilePath } from "@/utils/misc/fileProcessor";
import { copyEquationToClipboard } from "@/utils/misc/equation_copy";

import {
    renderToolbar,
    setToolbarDefaultState
} from "./toolbar";
import { EquationPanelDragDropHandler } from "./drag_drop_handler";
import { EquationPanelOutlineViewRenderer } from "./outline_view_renderer";
import { boxedEquationFilter } from "./box_filters";
import { PanelItem, getItemLine, getItemTag, getItemSearchableContent, ViewMode, SortType } from "./panelItemTypes";

export const EQUATION_MANAGE_PANEL_TYPE = "equation-arrange-panel";

export class EquationArrangePanel extends ItemView {
    // #region Shared Toolbar configuration variables
    // Public UI Element objects for share between several modules
    public viewModeButton!: HTMLElement;
    public viewPanel!: HTMLElement;
    public lockRefreshButton!: HTMLElement;
    public searchButton!: HTMLElement;
    public searchInput!: HTMLInputElement;
    public quitSearchButton!: HTMLElement;
    public enableRenderHeadingOnlyButton!: HTMLElement;
    public extendToolBarButton!: HTMLElement;
    public subToolbarPanel!: HTMLElement;
    public sortButton!: HTMLElement;
    public collapseButton!: HTMLElement;
    public toggleTagShowButton!: HTMLElement;
    public filterEmptyHeadingsButton!: HTMLElement;
    public filtersForEquationsButton!: HTMLElement;
    public previewObjectTypeButton!: HTMLElement;

    // State variables  
    public viewMode: ViewMode = "list";
    public sortMode: SortType = "seq";
    public previewObjectType: "equation" | "figure" | "callout" = "equation";
    public showEquationTags = false;
    public isSearchMode = false;
    public searchQuery = "";
    public filterEmptyHeadings = false; // Default to outline view (show all headings)
    public filterTagOnlyItems = false;
    public filterBoxedEquation = false;
    public lockRefreshEnabled = false;  // lock : file path and cached items 
    public enableRenderHeadingOnly = false; // in outline mode, only render headings without equations 
    // #endregion

    private refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private fileCheckInterval: ReturnType<typeof setTimeout> | null = null;

    // last state stored for avoid frequent refresh
    public currentEquationHash = "";
    private currentActiveFile = "";      // current active file path (used for fast refresh)
    private lastActiveFile = "";         // last active file path (used for fast refresh)
    private currentViewMode = "";        // current display mode (used for fast refresh)

    private currentSortMode = "";    // current sort mode (used for fast refresh)
    private currentFilterEmptyHeadings = false; // current filter state (used for fast refresh)
    private outlineViewRenderer!: EquationPanelOutlineViewRenderer;

    // Cached data for lock refresh mode (public for toolbar access)
    public cachedItems: PanelItem[] = [];
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
        this.outlineViewRenderer = new EquationPanelOutlineViewRenderer(
            this.plugin, this
        );
        const panelWrapper = containerEl.createDiv("ec-manage-panel-wrapper");

        // Render toolbar and sub-panel
        renderToolbar(this, panelWrapper, this.outlineViewRenderer);

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

        // Register drop handler for equation drag-drop (desktop only)
        // Clean up existing handler if it exists (in case onOpen is called multiple times)
        if (!Platform.isMobile) {
            if (this.dragDropHandler) {
                this.dragDropHandler.unload();
                this.dragDropHandler = undefined;
            }
            this.dragDropHandler = new EquationPanelDragDropHandler(
                this.plugin, this
            );
        }

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

    private async getItemsToRender(filePath: string): Promise<PanelItem[]> {
        let items: PanelItem[];

        if (this.lockRefreshEnabled) {
            // Use cached items when lock is enabled
            items = this.cachedItems;
        } else {
            // Fetch items based on preview object type
            switch (this.previewObjectType) {
                case "equation": {
                    const equations = await this.plugin.equationCache.getEquationsForFile(filePath) || [];
                    items = equations.map(eq => ({ type: "equation" as const, data: eq }));
                    break;
                }
                case "figure": {
                    const figures = await this.plugin.imageCache.getImagesForFile(filePath) || [];
                    items = figures.map(fig => ({ type: "figure" as const, data: fig }));
                    break;
                }
                case "callout": {
                    const callouts = await this.plugin.calloutCache.getCalloutsForFile(filePath) || [];
                    items = callouts.map(callout => ({ type: "callout" as const, data: callout }));
                    break;
                }
            }

            // Update cache when not locked
            this.cachedItems = items;
            this.cachedFilePath = filePath;
        }

        if (items.length === 0) {
            return [];
        }

        // Filter items based on search query (always applied)
        const filteredItems = this.filterItems(items);
        return filteredItems;
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
            const objectTypeLabels = {
                equation: "equation",
                figure: "figure",
                callout: "callout"
            };
            const objectLabel = objectTypeLabels[this.previewObjectType];
            const message = this.searchQuery
                ? `No ${objectLabel} match your search`
                : `No ${objectLabel} found in current file`;

            this.viewPanel.createDiv({
                text: message,
                cls: "ec-empty-message"
            });
        }
        this.currentEquationHash = hashPanelItems([]);
    }

    public async handleListViewRefresh(
        items: PanelItem[],
        viewStateEqual: boolean,
    ): Promise<void> {
        // List mode: Handle no items case
        const itemsHash = hashPanelItems(items);
        const itemsEqual = (items.length !==0) && (itemsHash === this.currentEquationHash);

        if (viewStateEqual && itemsEqual) {
            Debugger.log("View state equal, no need to refresh list view");
            return;
        }
        // Update state
        this.currentEquationHash = itemsHash;
        this.viewPanel?.empty();
        if (items.length === 0) {
            this.renderEmptyPanelView();
            return;
        }
        await this.renderRowsView(items);
    }

    /**
     * refresh the equations render view
     */
    public async refreshView(): Promise<void> {
        // Get the active file path (respecting lock mode)
        const activeFilePath = this.getCurrentActiveFile() || "";
        const fileSwitched = (this.lastActiveFile !== this.currentActiveFile);
        
        this.currentActiveFile = activeFilePath;   // used for record current state 
        this.lastActiveFile = activeFilePath;

        // Handle no active file case
        if (!activeFilePath) {
            if (this.viewPanel) {
                this.viewPanel.empty();
                this.viewPanel.createDiv({ text: "No active file", cls: "ec-empty-message" });
            }
            this.currentEquationHash = hashPanelItems([]);
            return;
        }

        // Check if file exists in vault
        const normalizedPath = normalizePath(activeFilePath);
        const currentFile = this.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(currentFile instanceof TFile)) {
            if (this.viewPanel) {
                this.viewPanel.empty();
                this.viewPanel.createDiv({ text: "File not found", cls: "ec-empty-message" });
            }
            this.currentEquationHash = hashPanelItems([]);
            return;
        }

        // Fetch and filter equations for the current file
        const itemsToRender = await this.getItemsToRender(normalizedPath);

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
                await this.handleListViewRefresh(itemsToRender, viewStateEqual);
                return;
            }
            // when switching to a new file, restore fold state (issue #163) 
            if (fileSwitched && this.outlineViewRenderer.collapseAllState === true) {
                const occurrenceMap: Map<string, number> = new Map();
                headings.forEach((heading, index) => {
                    // see outline_view_renderer, function updateHeadingLines
                    const key = `${heading.level}|${heading.text}`;
                    const occurrence = occurrenceMap.get(key) || 0;
                    occurrenceMap.set(key, occurrence + 1);
                    const dataId = `${key}|${occurrence}`;
                    this.outlineViewRenderer.collapseHeadings.add(dataId);
                })
            }
            await this.outlineViewRenderer.handleOutlineViewRefresh(itemsToRender, headings, viewStateEqual);
        }
        else {
            await this.handleListViewRefresh(itemsToRender, viewStateEqual);
        }
    }

    private filterItems(items: PanelItem[]): PanelItem[] {
        const {
            enableTypstMode,
            skipFirstlineInBoxedFilter,
            typstBoxSymbol,
        } = this.plugin.settings;

        // Apply tag filter (for equations and figures - callouts are always tagged)
        const tagFilter = (item: PanelItem) => {
            return !this.filterTagOnlyItems || (item.data.tag && item.data.tag.trim().length > 0);
        };

        // Apply boxed filter (only for equations)
        const boxedFilter = (item: PanelItem) => {
            if (item.type !== "equation") return true; // Only filter equations
            return !this.filterBoxedEquation ||
                boxedEquationFilter(item.data, enableTypstMode, skipFirstlineInBoxedFilter, typstBoxSymbol);
        };

        if (!this.searchQuery || this.searchQuery.trim().length === 0) {
            return items.filter(tagFilter).filter(boxedFilter);
        }

        const query = this.searchQuery.toLowerCase();
        return items.filter(item => {
            // Check tag and boxed filters first
            if (!tagFilter(item) || !boxedFilter(item)) return false;

            // Search in item content
            const searchContent = getItemSearchableContent(item).toLowerCase();
            return searchContent.includes(query);
        });
    }

    private sortItems(items: PanelItem[]): PanelItem[] {
        if (this.sortMode === "tag") {
            // Sort by tag (items with tags first, then by tag alphabetically)
            return [...items].sort((a, b) => {
                const tagA = getItemTag(a);
                const tagB = getItemTag(b);

                if (!tagA && !tagB) return getItemLine(a) - getItemLine(b);
                if (!tagA) return 1;
                if (!tagB) return -1;
                return tagA.localeCompare(tagB);
            });
        } else {
            // Sort by sequence (line number)
            return [...items].sort((a, b) => getItemLine(a) - getItemLine(b));
        }
    }

    private async renderRowsView(items: PanelItem[]): Promise<void> {
        const filteredItems = this.filterItems(items);
        // Sort items
        const sortedItems = this.sortItems(filteredItems);
        const listContainer = this.viewPanel.createDiv("ec-list-view");

        for (const item of sortedItems) {
            if (item.type === "equation") {
                await this.renderEquationItem(listContainer, item.data);
            } else if (item.type === "figure") {
                await this.renderFigureItem(listContainer, item.data);
            } else if (item.type === "callout") {
                await this.renderCalloutItem(listContainer, item.data);
            }
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
        
        if (this.plugin.settings.useFastMathRenderer) {
            // Fast method: Direct conversion 
            mathDiv.replaceChildren(window.MathJax!.tex2chtml(equation.content, { display: true }));
        } else {
            // Reliable method: Use typesetPromise for proper rendering
            const  rendered = renderMath(equation.content, true);
            mathDiv.replaceChildren(rendered);
            await finishRenderMath();
        }

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
                        activeWindow.setTimeout(() => {
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
            // Skip drag on mobile devices
            if (Platform.isMobile) {
                event.preventDefault();
                return;
            }

            // Change cursor to grabbing hand
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
            if (event.dataTransfer) {
                event.dataTransfer.setData('ec-equations/drop-citations', dataString);
                event.dataTransfer.effectAllowed = 'copy';
            }
        });

        // Drag end event
        eqDiv.addEventListener('dragend', () => {
            eqDiv.classList.remove('ec-is-dragging');
        });

        // Right-click context menu for copy
        eqDiv.addEventListener('contextmenu', (event: MouseEvent) => {
            event.preventDefault();
            const menu = new Menu();

            menu.addItem((item) => {
                item.setTitle("Copy");
                item.setIcon("copy");
                item.onClick(() => {
                    this.handleEquationCopy(equation);
                });
            });

            menu.showAtMouseEvent(event);
        });
    }

    public async renderFigureItem(container: HTMLElement, figure: ImageMatch): Promise<void> {
        const figDiv = container.createDiv("ec-figure-item");
        const currentFile = this.app.workspace.getActiveFile();

        // Make figure draggable
        figDiv.draggable = true;
        figDiv.dataset.figureTag = figure.tag || '';
        figDiv.dataset.figureLine = figure.line.toString();

        // Tag section (if exists)
        if (figure.tag) {
            const tagDiv = figDiv.createDiv({ cls: "ec-figure-tag ec-tag-show" });
            tagDiv.createSpan({ text: figure.tag, cls: "ec-tag-text" });
        }

        // Create figure content div
        const contentDiv = figDiv.createDiv("ec-figure-content");

        // Render the figure using MarkdownRenderer (use raw markdown)
        await MarkdownRenderer.render(this.app, figure.raw, contentDiv, currentFile?.path || '', this);

        // Disable native drag on images to allow parent drag
        contentDiv.querySelectorAll('img').forEach(img => {
            img.draggable = false;
        });

        // Add double-click handler to jump to figure in the editor
        figDiv.addEventListener('dblclick', (event: MouseEvent) => {
            const ctrlKey = event.ctrlKey || event.metaKey;
            if (ctrlKey && figure.tag && currentFile) {
                // Create a new split panel on the right
                const newLeaf = this.app.workspace.getLeaf("split");
                if (newLeaf) {
                    this.app.workspace.setActiveLeaf(newLeaf, { focus: true });
                    this.app.workspace.openLinkText("", currentFile.path, false).then().catch(console.error);

                    // Scroll to the figure after layout is ready
                    this.app.workspace.onLayoutReady(() => {
                        activeWindow.setTimeout(() => {
                            this.jumpToLine(figure.line).then().catch(console.error);
                        }, 50);
                    });
                }
            } else {
                // Normal double click - jump in current view
                this.jumpToLine(figure.line).then().catch(console.error);
            }
        });

        
        figDiv.addEventListener('dragstart', (event: DragEvent) => {
            // Skip drag on mobile devices
            if (Platform.isMobile) {
                event.preventDefault();
                return;
            }

            // Change cursor to grabbing hand
            figDiv.classList.add('ec-is-dragging');
            
            // Store figure data
            const figureData = {
                tag: figure.tag || '',
                type: 'figure',
                sourcePath: currentFile?.path || '',
                line: figure.line
            };
            const dataString = JSON.stringify(figureData);
            if (event.dataTransfer) {
                event.dataTransfer.setData('ec-equations/drop-citations', dataString);
                event.dataTransfer.effectAllowed = 'copy';
            }
        });

        // Drag end event
        figDiv.addEventListener('dragend', () => {
            figDiv.classList.remove('ec-is-dragging');
        });
    }

    public async renderCalloutItem(container: HTMLElement, callout: CalloutMatch): Promise<void> {
        const calloutDiv = container.createDiv("ec-callout-item");
        const { calloutCitationPrefixes } = this.plugin.settings;

        // Make callout draggable
        calloutDiv.draggable = true;
        calloutDiv.dataset.calloutTag = callout.tag || '';
        calloutDiv.dataset.calloutLineStart = callout.lineStart.toString();

        // Tag section (if exists)
        if (callout.tag) {
            const tagDiv = calloutDiv.createDiv({ cls: "ec-callout-tag ec-tag-show" });
            const fmt = calloutCitationPrefixes.find(t => t.prefix === callout.prefix)?.format || '';
            const label = fmt.replace('#', callout.tag);
            tagDiv.createSpan({ text: label, cls: "ec-tag-text" });
        }

        // Create callout content div
        const contentDiv = calloutDiv.createDiv("ec-callout-content");
        const currentFile = this.app.workspace.getActiveFile();

        // Render the callout using MarkdownRenderer (use raw content with quote marks)
        await MarkdownRenderer.render(this.app, callout.raw, contentDiv, currentFile?.path || '', this);

        // Add double-click handler to jump to callout in the editor
        calloutDiv.addEventListener('dblclick', (event: MouseEvent) => {
            const ctrlKey = event.ctrlKey || event.metaKey;
            if (ctrlKey && callout.tag && currentFile) {
                // Create a new split panel on the right
                const newLeaf = this.app.workspace.getLeaf("split");
                if (newLeaf) {
                    this.app.workspace.setActiveLeaf(newLeaf, { focus: true });
                    this.app.workspace.openLinkText("", currentFile.path, false).then().catch(console.error);

                    // Scroll to the callout after layout is ready
                    this.app.workspace.onLayoutReady(() => {
                        activeWindow.setTimeout(() => {
                            this.jumpToLine(callout.lineStart).then().catch(console.error);
                        }, 50);
                    });
                }
            } else {
                // Normal double click - jump in current view
                this.jumpToLine(callout.lineStart).then().catch(console.error);
            }
        });

        // Drag start event
        calloutDiv.addEventListener('dragstart', (event: DragEvent) => {
            // Skip drag on mobile devices
            if (Platform.isMobile) {
                event.preventDefault();
                return;
            }

            // Change cursor to grabbing hand
            calloutDiv.classList.add('ec-is-dragging');
            
            // Store callout data
            const calloutData = {
                tag: callout.tag || '',
                type: 'callout',
                prefix: callout.prefix || '',
                sourcePath: currentFile?.path || '',
                lineStart: callout.lineStart
            };
            const dataString = JSON.stringify(calloutData);
            if (event.dataTransfer) {
                event.dataTransfer.setData('ec-equations/drop-citations', dataString);
                event.dataTransfer.effectAllowed = 'copy';
            }
        });

        // Drag end event
        calloutDiv.addEventListener('dragend', () => {
            calloutDiv.classList.remove('ec-is-dragging');
        });
    }

    private async jumpToLine(lineNumber: number): Promise<void> {
        const filePath = this.getCurrentActiveFile();
        const normalizedPath = filePath ? normalizePath(filePath) : null;
        const currentFile = normalizedPath ? this.app.vault.getAbstractFileByPath(normalizedPath) : null;
        if (!filePath || !currentFile || !(currentFile instanceof TFile)) return;

        // Open the file and jump to the line
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(currentFile);

        const view = leaf.view;
        if (view instanceof MarkdownView) {
            const editor = view.editor;
            editor.setCursor({ line: lineNumber, ch: 0 });
            editor.scrollIntoView({ from: { line: lineNumber, ch: 0 }, to: { line: lineNumber, ch: 0 } }, true);
        }
    }

    public async renderMarkdownInContainer(container: HTMLElement, markdown: string, sourcePath: string): Promise<void> {
        await MarkdownRenderer.render(this.plugin.app, markdown, container, sourcePath, this);
    }

    private async jumpToEquation(equation: EquationMatch): Promise<void> {
        const filePath = this.getCurrentActiveFile();
        const normalizedPath = filePath ? normalizePath(filePath) : null;
        const currentFile = normalizedPath ? this.app.vault.getAbstractFileByPath(normalizedPath) : null;
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

    /**
     * Copy equation to clipboard based on the copy type setting
     * @param equation - The equation to copy
     */
    private handleEquationCopy(equation: EquationMatch): void {
        const copyType = this.plugin.settings.equationWidgetRightClickCopyType;
        copyEquationToClipboard(equation.contentWithTag, equation.content, copyType);
    }
}
