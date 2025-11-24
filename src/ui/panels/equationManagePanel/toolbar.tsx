import { EquationArrangePanel } from "./mainPanel";
import { setIcon, setTooltip } from "obsidian";



export function updateModeButtons(panel: EquationArrangePanel): void {
    const listMode = this.viewMode === "list";
    this.sortButton.toggle(listMode);

    this.collapseButton.toggle(!listMode);
    this.expandButton.toggle(!listMode);
    this.filterEmptyHeadingsButton.toggle(!listMode);
    this.enableRenderHeadingOnlyButton.toggle(!listMode);
}

export function renderToolbar(panel: EquationArrangePanel, panelWrapper: HTMLElement): void {
    const toolbar = panelWrapper.createDiv("ec-manage-panel-toolbar");

    // View mode button
    panel.viewModeButton = toolbar.createDiv("ec-view-mode-button clickable-icon");
    panel.viewModeButton.addEventListener('click', () => {
        const newViewMode = panel.viewMode === "outline" ? "list" : "outline";
        panel.updateViewMode(newViewMode);
        panel.updateModeButtons();
        void panel.refreshView();
    });

    // Lock file mode button
    panel.lockFileModeButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
    });
    setIcon(panel.lockFileModeButton, "lock");
    setTooltip(panel.lockFileModeButton, "Lock to current file");
    panel.lockFileModeButton.addEventListener("click", () => {
        panel.lockFileModeEnabled = !panel.lockFileModeEnabled;
        panel.updateFileLockMode(panel.lockFileModeEnabled);
    });
    panel.updateFileLockMode(panel.lockFileModeEnabled);

    panel.lockRefreshButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
    }); 
    setIcon(panel.lockRefreshButton, "refresh-cw"); 
    setTooltip(panel.lockRefreshButton, "Auto refresh view : on");
    panel.lockRefreshButton.addEventListener("click", () => {
        panel.lockFileModeEnabled = false;
        panel.updateRefreshLockMode(panel.lockFileModeEnabled);
        void panel.refreshView();
    });

    // Search button
    panel.searchButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Search equations" },
    });
    setIcon(panel.searchButton, "search");
    setTooltip(panel.searchButton, "Search equations");
    panel.searchButton.addEventListener("click", () => {
        void panel.toggleSearchMode(true);
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
        void panel.toggleSearchMode(false);
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
    panel.renderToolBarSubPanel(subPanelContent);
}

export function renderToolBarSubPanel(panel: EquationArrangePanel, subPanel: HTMLElement): void {
    // Show headings only button (only visible in outline mode)
    panel.enableRenderHeadingOnlyButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Show headings only" },
    });
    setIcon(panel.enableRenderHeadingOnlyButton, "list-tree");
    setTooltip(panel.enableRenderHeadingOnlyButton, "Show headings only");
    panel.enableRenderHeadingOnlyButton.addEventListener("click", () => {
        panel.enableRenderHeadingOnly = !panel.enableRenderHeadingOnly;
        panel.updateHeadingOnlyButton();
        void panel.refreshView();
    });
    panel.updateHeadingOnlyButton();
    panel.enableRenderHeadingOnlyButton.hide();

    panel.sortButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Sort equations" },
    });

    panel.sortButton.addEventListener("click", () => {
        const sortMode = panel.sortMode === "tag" ? "seq" : "tag";
        panel.updateSortMode(sortMode);
        void panel.refreshView();
    });

    panel.expandButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Expand all" },
    });
    setIcon(panel.expandButton, "chevrons-up-down");
    setTooltip(panel.expandButton, "Expand all");
    panel.expandButton.addEventListener("click", () => {
        void panel.handleExpandAll();
    });

    panel.collapseButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Collapse all" },
    });
    setIcon(panel.collapseButton, "chevrons-down-up");
    setTooltip(panel.collapseButton, "Collapse all");
    panel.collapseButton.addEventListener("click", () => {
        void panel.handleCollapseAll();
    });

    // hide tag button
    panel.toggleTagShowButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button ec-tag-hide-button",
        attr: { "aria-label": "Hide tag button" },
    });  // placeholder for tag button
    panel.toggleTagShowButton.addEventListener("click", () => {
        const mode = panel.showEquationTags ? false : true;
        panel.toggleTagShow(mode);
    });

    // Filter empty headings button (only visible in outline mode)
    panel.filterEmptyHeadingsButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": "Filter empty headings" },
    });
    panel.filterEmptyHeadingsButton.addEventListener("click", () => {
        panel.filterEmptyHeadings = !panel.filterEmptyHeadings;
        panel.updateFilterButton();
        void panel.refreshView();
    });
    panel.updateFilterButton(); // Set initial state
    panel.filterEmptyHeadingsButton.hide();
}