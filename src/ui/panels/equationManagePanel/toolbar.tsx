import EquationCitator from "@/main";
import { EquationArrangePanel } from "./mainPanel";
import { setIcon, setTooltip } from "obsidian";

// ============================================================================
// Private Toolbar Update Functions
// ============================================================================

/**
 * Update the mode buttons on the sub-toolbar based on current view mode
 * @param panel 
 */
function updateModeButtons(panel: EquationArrangePanel): void {
    const listMode = panel.viewMode === "list";
    panel.sortButton.toggle(listMode);

    panel.collapseButton.toggle(!listMode);
    panel.expandButton.toggle(!listMode);
    panel.filterEmptyHeadingsButton.toggle(!listMode);
    panel.enableRenderHeadingOnlyButton.toggle(!listMode);
}

function updatePanelViewMode(panel: EquationArrangePanel, mode: "outline" | "list"): void {
    panel.viewMode = mode;
    setIcon(panel.viewModeButton, mode === "outline" ? "list" : "rows-4");
    setTooltip(panel.viewModeButton, `View mode: ${mode === "outline" ? "outline" : "list"}`);
}

function updateSortMode(panel: EquationArrangePanel, mode: "tag" | "seq"): void {
    panel.sortMode = mode;
    setIcon(panel.sortButton, mode === "tag" ? "tag" : "list-ordered");
    setTooltip(panel.sortButton, `Sort mode : ${mode == "tag" ? "tag" : "line number"}`);
}

function updateTagOnlyButton(panel: EquationArrangePanel): void {
    const iconName = panel.filterTagOnlyEquation ? "filter" : "filter-x";
    panel.filterTagOnlyEquationButton.toggleClass("is-active", panel.filterTagOnlyEquation);
    const tooltipText = panel.filterTagOnlyEquation ? "Only show equations with tag" : "Show all equations";
    setIcon(panel.filterTagOnlyEquationButton, iconName);
    setTooltip(panel.filterTagOnlyEquationButton, tooltipText);
}

function updateRefreshLockMode(panel: EquationArrangePanel, enabled: boolean): void { 
    panel.lockRefreshEnabled = enabled;
    panel.lockRefreshButton.toggleClass("is-active", enabled);
    setIcon(panel.lockRefreshButton, enabled ? "refresh-cw-off" : "refresh-cw");
    
    // when unlock, clear cached data and refresh view
    if (!enabled) {
        panel.cachedEquations = [];
        panel.cachedFilePath = "";
        void panel.refreshView();
    }
}

function updateHeadingsFilterButton(panel: EquationArrangePanel): void {
    const iconName = panel.filterEmptyHeadings ? "book-x" : "book-check";
    const tooltipText = panel.filterEmptyHeadings ? "Headings: Only show not empty" : "Headings: Show all";
    panel.filterEmptyHeadingsButton.toggleClass("is-active", panel.filterEmptyHeadings);
    setIcon(panel.filterEmptyHeadingsButton, iconName);
    setTooltip(panel.filterEmptyHeadingsButton, tooltipText);
}

function updateHeadingOnlyButton(panel: EquationArrangePanel): void {
    panel.enableRenderHeadingOnlyButton.toggleClass("is-active", panel.enableRenderHeadingOnly);
    const tooltipText = panel.enableRenderHeadingOnly ? "Show headings only: On" : "Show headings only: Off";
    setTooltip(panel.enableRenderHeadingOnlyButton, tooltipText);
}

function toggleTagShow(panel: EquationArrangePanel, mode: boolean): void {
    panel.showEquationTags = mode;
    setIcon(panel.toggleTagShowButton, mode ? "bookmark-check" : "bookmark-x");
    setTooltip(panel.toggleTagShowButton, mode ? "tags: show" : "tags: hidden");
    document.body.classList.toggle("ec-tag-show", mode);
}

async function toggleSearchMode(panel: EquationArrangePanel, enable: boolean): Promise<void> {
    panel.isSearchMode = enable;

    panel.searchInput.toggle(enable);
    panel.quitSearchButton.toggle(enable);

    // hide other buttons when search mode is enabled
    panel.searchButton.toggle(!enable);
    panel.viewModeButton.toggle(!enable);
    panel.lockRefreshButton.toggle(!enable);
    panel.extendToolBarButton.toggle(!enable);
    
    // Hide sub-panel when in search mode
    if (enable) {
        panel.subToolbarPanel.removeClass("is-expanded");
        panel.extendToolBarButton.removeClass("is-active");
        setIcon(panel.extendToolBarButton, "chevron-down");
    }
    panel.subToolbarPanel.toggle(!enable);

    if (enable) {
        panel.searchInput.focus();
    } else {
        // Clear search input and query when exiting search mode
        panel.searchInput.value = "";
        panel.searchQuery = "";
        // Refresh view to show all equations
        await panel.refreshView();
        updateModeButtons(panel);
    }
}

async function handleCollapseAll(panel: EquationArrangePanel): Promise<void> {
    const allHeadings = panel.viewPanel.querySelectorAll('.ec-heading-item');
    allHeadings.forEach((heading) => {
        const lineNum = parseInt(heading.getAttribute('data-line') || '0');
        panel.collapsedHeadings.add(lineNum);
    });
    await panel.refreshView();
}

async function handleExpandAll(panel: EquationArrangePanel): Promise<void> {
    panel.collapsedHeadings.clear();
    await panel.refreshView();
}

// ============================================================================
// Private Toolbar Rendering Functions
// ============================================================================

function renderToolBarSubPanel(panel: EquationArrangePanel, subPanel: HTMLElement): void {
    // Show headings only button (only visible in outline mode)
    panel.enableRenderHeadingOnlyButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Show headings only" },
    });
    setIcon(panel.enableRenderHeadingOnlyButton, "list-tree");
    setTooltip(panel.enableRenderHeadingOnlyButton, "Show headings only");
    panel.enableRenderHeadingOnlyButton.addEventListener("click", () => {
        panel.enableRenderHeadingOnly = !panel.enableRenderHeadingOnly;
        updateHeadingOnlyButton(panel);
        void panel.refreshView();
    });
    updateHeadingOnlyButton(panel);

    panel.sortButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Sort equations" },
    });

    panel.sortButton.addEventListener("click", () => {
        const sortMode = panel.sortMode === "tag" ? "seq" : "tag";
        updateSortMode(panel, sortMode);
        void panel.refreshView();
    });

    panel.expandButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Expand all" },
    });
    setIcon(panel.expandButton, "chevrons-up-down");
    setTooltip(panel.expandButton, "Expand all");
    panel.expandButton.addEventListener("click", () => {
        void handleExpandAll(panel);
    });

    panel.collapseButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Collapse all" },
    });
    setIcon(panel.collapseButton, "chevrons-down-up");
    setTooltip(panel.collapseButton, "Collapse all");
    panel.collapseButton.addEventListener("click", () => {
        void handleCollapseAll(panel);
    });

    // hide tag button
    panel.toggleTagShowButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button ec-tag-hide-button",
        attr: { "aria-label": "Hide tag button" },
    });  // placeholder for tag button
    panel.toggleTagShowButton.addEventListener("click", () => {
        const mode = panel.showEquationTags ? false : true;
        toggleTagShow(panel, mode);
    });

    // Filter empty headings button (only visible in outline mode)
    panel.filterEmptyHeadingsButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Filter empty headings" },
    });
    panel.filterEmptyHeadingsButton.addEventListener("click", () => {
        panel.filterEmptyHeadings = !panel.filterEmptyHeadings;
        updateHeadingsFilterButton(panel);
        void panel.refreshView();
    });
    updateHeadingsFilterButton(panel); // Set initial state
    
    // Filter tag only equations button
    panel.filterTagOnlyEquationButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Show equations with tag only" },
    });
    setIcon(panel.filterTagOnlyEquationButton, "tag");
    setTooltip(panel.filterTagOnlyEquationButton, "Only show equations with tag");
    panel.filterTagOnlyEquationButton.addEventListener("click", () => {
        panel.filterTagOnlyEquation = !panel.filterTagOnlyEquation;
        updateTagOnlyButton(panel); 
        void panel.refreshView();
    });
    updateTagOnlyButton(panel); // Set initial state
}

// ============================================================================
// Public API - Only these functions are exposed to main panel part
// ============================================================================

/**
 * Render the toolbar and sub-panel
 * @param panel - The equation arrange panel instance
 * @param panelWrapper - The wrapper element to attach the toolbar to
 */
export function renderToolbar(panel: EquationArrangePanel, panelWrapper: HTMLElement): void {
    const toolbar = panelWrapper.createDiv("ec-manage-panel-toolbar");

    // View mode button
    panel.viewModeButton = toolbar.createDiv("ec-view-mode-button clickable-icon");
    panel.viewModeButton.addEventListener('click', () => {
        const newViewMode = panel.viewMode === "outline" ? "list" : "outline";
        updatePanelViewMode(panel, newViewMode);
        updateModeButtons(panel);
        void panel.refreshView();
    });

    panel.lockRefreshButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
    }); 
    setIcon(panel.lockRefreshButton, "refresh-cw"); 
    setTooltip(panel.lockRefreshButton, "Disable refresh");
    panel.lockRefreshButton.addEventListener("click", () => {
        panel.lockRefreshEnabled = !panel.lockRefreshEnabled;
        updateRefreshLockMode(panel, panel.lockRefreshEnabled);
    });

    // Search button
    panel.searchButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Search equations" },
    });
    setIcon(panel.searchButton, "search");
    setTooltip(panel.searchButton, "Search equations");
    panel.searchButton.addEventListener("click", () => {
        void toggleSearchMode(panel, true);
    });

    // Extend toolbar button (opens sub-panel)
    panel.extendToolBarButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "More options" },
    });
    setIcon(panel.extendToolBarButton, "chevron-down");
    setTooltip(panel.extendToolBarButton, "More options");
    panel.extendToolBarButton.addEventListener("click", () => {
        const isExpanded = panel.extendToolBarButton.hasClass("is-active");
        panel.extendToolBarButton.toggleClass("is-active", !isExpanded);
        panel.subToolbarPanel.toggleClass("is-expanded", !isExpanded);
        setIcon(panel.extendToolBarButton, !isExpanded ? "chevron-up" : "chevron-down");
    });

    // Quit search button (hidden by default)
    panel.quitSearchButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button ec-quit-search-button",
        attr: { "aria-label": "Exit search" },
    });
    setIcon(panel.quitSearchButton, "x");
    setTooltip(panel.quitSearchButton, "Exit search");
    panel.quitSearchButton.addEventListener("click", () => {
        void toggleSearchMode(panel, false);
    });
    panel.quitSearchButton.hide();

    // Search input (hidden by default)
    panel.searchInput = toolbar.createEl("input", {
        cls: "ec-search-input",
        attr: {
            type: "text",
            placeholder: "Search equations..."
        },
    });
    panel.searchInput.addEventListener("input", () => {
        panel.searchQuery = panel.searchInput.value;
        panel.scheduleRefreshView();
    });
    panel.searchInput.hide();

    // Create sub-panel for additional options
    panel.subToolbarPanel = panelWrapper.createDiv("ec-toolbar-sub-panel");
    const subPanelContent = panel.subToolbarPanel.createDiv();
    renderToolBarSubPanel(panel, subPanelContent);
}

/**
 * Set the default state for the toolbar (view mode, sort mode, tag visibility, etc.)
 * @param panel - The equation arrange panel instance
 * @param defaultViewMode - The default view mode to set
 */
export function setToolbarDefaultState(
    panel: EquationArrangePanel,
    plugin: EquationCitator,
): void {
    const {
        equationManagePanelDefaultViewType: defaultViewMode,
        equationManagePanelEnableRenderHeadingsOnly: enableRenderHeadingsOnly,
        equationManagePanelFilterTagOnlyEquation: filterTagOnlyEquation,
    } = plugin.settings;
    // Set default view mode
    updatePanelViewMode(panel, defaultViewMode);
    
    // Set default sort mode
    updateSortMode(panel, "seq");
    
    // Update mode buttons visibility
    updateModeButtons(panel);

    panel.filterTagOnlyEquation = filterTagOnlyEquation;
    updateTagOnlyButton(panel);
    
    panel.enableRenderHeadingOnly = enableRenderHeadingsOnly;
    updateHeadingOnlyButton(panel);
    // Set tag visibility
    toggleTagShow(panel, true);
}
