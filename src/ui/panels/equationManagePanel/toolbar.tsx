import EquationCitator from "@/main";
import { EquationArrangePanel } from "./mainPanel";
import { setIcon, setTooltip, Menu } from "obsidian";
import { EquationPanelOutlineViewRenderer } from "./outline_view_renderer";
import { t } from "@/i18n/getLocale";

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
    panel.filterEmptyHeadingsButton.toggle(!listMode);
    panel.enableRenderHeadingOnlyButton.toggle(!listMode);
}

function updatePanelViewMode(panel: EquationArrangePanel, mode: "outline" | "list"): void {
    panel.viewMode = mode;
    setIcon(panel.viewModeButton, mode === "outline" ? "list" : "rows-4");
    setTooltip(panel.viewModeButton, t("toolbar.viewMode.tooltip", { mode: mode === "outline" ? t("toolbar.viewMode.outline") : t("toolbar.viewMode.list") }));
}

function updateSortMode(panel: EquationArrangePanel, mode: "tag" | "seq"): void {
    panel.sortMode = mode;
    setIcon(panel.sortButton, mode === "tag" ? "tag" : "list-ordered");
    setTooltip(panel.sortButton, t("toolbar.sortMode.tooltip", { mode: mode === "tag" ? t("toolbar.sortMode.tag") : t("toolbar.sortMode.lineNumber") }));
}

function updateFiltersButton(panel: EquationArrangePanel): void {
    const anyFilterActive = panel.filterTagOnlyItems || panel.filterBoxedEquation;
    panel.filtersForEquationsButton.toggleClass("is-active", anyFilterActive);
    const tooltipText = t("toolbar.showFilters");
    setIcon(panel.filtersForEquationsButton, "filter");
    setTooltip(panel.filtersForEquationsButton, tooltipText);
}

function showFiltersMenu(panel: EquationArrangePanel, event: MouseEvent): void {
    const menu = new Menu();

    // Tag-only filter menu item
    menu.addItem((item) => {
        item.setTitle(t("toolbar.filterTaggedItems"))
            .setIcon("tag")
            .setChecked(panel.filterTagOnlyItems)
            .onClick(() => {
                panel.filterTagOnlyItems = !panel.filterTagOnlyItems;
                updateFiltersButton(panel);
                void panel.refreshView();
            });
    });

    // Boxed equation filter menu item
    menu.addItem((item) => {
        item.setTitle(t("toolbar.filterBoxedEquations"))
            .setIcon("box")
            .setChecked(panel.filterBoxedEquation)
            .onClick(() => {
                panel.filterBoxedEquation = !panel.filterBoxedEquation;
                updateFiltersButton(panel);
                void panel.refreshView();
            });
    });

    menu.showAtMouseEvent(event);
}

function updateRefreshLockMode(panel: EquationArrangePanel, enabled: boolean): void { 
    panel.lockRefreshEnabled = enabled;
    panel.lockRefreshButton.toggleClass("is-active", enabled);
    setIcon(panel.lockRefreshButton, enabled ? "refresh-cw-off" : "refresh-cw");
    
    // when unlock, clear cached data and refresh view
    if (!enabled) {
        panel.cachedItems = [];
        panel.cachedFilePath = "";
        void panel.refreshView();
    }
}

function updateHeadingsFilterButton(panel: EquationArrangePanel): void {
    const iconName = panel.filterEmptyHeadings ? "book-x" : "book-check";
    const tooltipText = panel.filterEmptyHeadings ? t("toolbar.headingsOnlyNonEmpty") : t("toolbar.headingsShowAll");
    panel.filterEmptyHeadingsButton.toggleClass("is-active", panel.filterEmptyHeadings);
    setIcon(panel.filterEmptyHeadingsButton, iconName);
    setTooltip(panel.filterEmptyHeadingsButton, tooltipText);
}

function updateHeadingOnlyButton(panel: EquationArrangePanel): void {
    panel.enableRenderHeadingOnlyButton.toggleClass("is-active", panel.enableRenderHeadingOnly);
    const tooltipText = panel.enableRenderHeadingOnly ? t("toolbar.showHeadingsOnlyOn") : t("toolbar.showHeadingsOnlyOff");
    setTooltip(panel.enableRenderHeadingOnlyButton, tooltipText);
}

function updatePreviewObjectType(panel: EquationArrangePanel, type: "equation" | "figure" | "callout"): void {
    panel.previewObjectType = type;
    
    // Set icon based on type
    const iconMap = {
        equation: "percent",
        figure: "image",
        callout: "message-square"
    };
    
    // Set tooltip based on type
    const labelMap = {
        equation: t("toolbar.preview.equations"),
        figure: t("toolbar.preview.figures"),
        callout: t("toolbar.preview.callouts")
    };
    
    setIcon(panel.previewObjectTypeButton, iconMap[type]);
    setTooltip(panel.previewObjectTypeButton, t("toolbar.preview", { label: labelMap[type] }));
}

function toggleTagShow(panel: EquationArrangePanel, mode: boolean): void {
    panel.showEquationTags = mode;
    setIcon(panel.toggleTagShowButton, mode ? "bookmark-check" : "bookmark-x");
    setTooltip(panel.toggleTagShowButton, mode ? t("toolbar.tagsShow") : t("toolbar.tagsHidden"));
    activeDocument.body.classList.toggle("ec-tag-show", mode);
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
    panel.previewObjectTypeButton.toggle(!enable);
    
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

async function handleCollapseAll(
    panel: EquationArrangePanel,
    renderer: EquationPanelOutlineViewRenderer,
): Promise<void> {
    const allHeadings = panel.viewPanel.querySelectorAll('.ec-heading-item');
    allHeadings.forEach((heading) => {
        const id = (heading as HTMLElement).dataset.id;
        if (id) {
            renderer.collapseHeadings.add(id);
        }
    });
    await panel.refreshView();
}

async function handleExpandAll(
    panel: EquationArrangePanel,
    renderer: EquationPanelOutlineViewRenderer,
): Promise<void> {
    renderer.collapseHeadings.clear();
    await panel.refreshView();
}

// ============================================================================
// Private Toolbar Rendering Functions
// ============================================================================

function renderToolBarSubPanel(
    panel: EquationArrangePanel, 
    subPanel: HTMLElement, renderer: 
    EquationPanelOutlineViewRenderer
): void {
    // Show headings only button (only visible in outline mode)
    panel.enableRenderHeadingOnlyButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.showHeadingsOnly") },
    });
    setIcon(panel.enableRenderHeadingOnlyButton, "list-tree");
    setTooltip(panel.enableRenderHeadingOnlyButton, t("toolbar.showHeadingsOnly"));
    panel.enableRenderHeadingOnlyButton.addEventListener("click", () => {
        panel.enableRenderHeadingOnly = !panel.enableRenderHeadingOnly;
        updateHeadingOnlyButton(panel);
        void panel.refreshView();
    });
    updateHeadingOnlyButton(panel);

    panel.sortButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.sortEquations") },
    });

    panel.sortButton.addEventListener("click", () => {
        const sortMode = panel.sortMode === "tag" ? "seq" : "tag";
        updateSortMode(panel, sortMode);
        void panel.refreshView();
    });

    panel.collapseButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.collapseAll") },
    });
    setIcon(panel.collapseButton, "chevrons-down-up");
    setTooltip(panel.collapseButton, t("toolbar.collapseAll"));
    panel.collapseButton.addEventListener("click", () => {
        if (renderer.collapseAllState === false) {
            void handleCollapseAll(panel, renderer);
            renderer.collapseAllState = true;
            setIcon(panel.collapseButton, "chevrons-up-down");
            setTooltip(panel.collapseButton, t("toolbar.expandAll"));
        }
        else {
            void handleExpandAll(panel, renderer);
            renderer.collapseAllState = false;
            setIcon(panel.collapseButton, "chevrons-down-up");
            setTooltip(panel.collapseButton, t("toolbar.collapseAll"));
        }
    });

    // hide tag button
    panel.toggleTagShowButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button ec-tag-hide-button",
        attr: { "aria-label": t("toolbar.hideTagButton") },
    });  // placeholder for tag button
    panel.toggleTagShowButton.addEventListener("click", () => {
        const mode = !panel.showEquationTags;
        toggleTagShow(panel, mode);
    });

    // Filter empty headings button (only visible in outline mode)
    panel.filterEmptyHeadingsButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.filterEmptyHeadings") },
    });
    panel.filterEmptyHeadingsButton.addEventListener("click", () => {
        panel.filterEmptyHeadings = !panel.filterEmptyHeadings;
        updateHeadingsFilterButton(panel);
        void panel.refreshView();
    });
    updateHeadingsFilterButton(panel); // Set initial state
    
    // Filter equations button (opens dropdown menu)
    panel.filtersForEquationsButton = subPanel.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.showFilters") },
    });
    setIcon(panel.filtersForEquationsButton, "filter");
    setTooltip(panel.filtersForEquationsButton, t("toolbar.showFilters"));
    panel.filtersForEquationsButton.addEventListener("click", (event) => {
        event.preventDefault();
        showFiltersMenu(panel, event);
    });
    updateFiltersButton(panel); // Set initial state
}

// ============================================================================
// Public API - Only these functions are exposed to main panel part
// ============================================================================

/**
 * Render the toolbar and sub-panel
 * @param panel - The equation arrange panel instance
 * @param panelWrapper - The wrapper element to attach the toolbar to
 * @param renderer - The outline view renderer instance
 */
export function renderToolbar(
    panel: EquationArrangePanel, 
    panelWrapper: HTMLElement, 
    renderer: EquationPanelOutlineViewRenderer
): void {
    const toolbar = panelWrapper.createDiv("ec-manage-panel-toolbar");

    // Preview object type button (FIRST button)
    panel.previewObjectTypeButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.previewObjectType") },
    });
    panel.previewObjectTypeButton.addEventListener("click", () => {
        const types: Array<"equation" | "figure" | "callout"> = ["equation", "figure", "callout"];
        const currentIndex = types.indexOf(panel.previewObjectType);
        const nextType = types[(currentIndex + 1) % types.length];
        updatePreviewObjectType(panel, nextType);
        void panel.refreshView();
    });

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
    setTooltip(panel.lockRefreshButton, t("toolbar.disableRefresh"));
    panel.lockRefreshButton.addEventListener("click", () => {
        panel.lockRefreshEnabled = !panel.lockRefreshEnabled;
        updateRefreshLockMode(panel, panel.lockRefreshEnabled);
    });

    // Search button
    panel.searchButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.searchEquations") },
    });
    setIcon(panel.searchButton, "search");
    setTooltip(panel.searchButton, t("toolbar.searchEquations"));
    panel.searchButton.addEventListener("click", () => {
        void toggleSearchMode(panel, true);
    });

    // Extend toolbar button (opens sub-panel)
    panel.extendToolBarButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button",
        attr: { "aria-label": t("toolbar.moreOptions") },
    });
    setIcon(panel.extendToolBarButton, "chevron-down");
    setTooltip(panel.extendToolBarButton, t("toolbar.moreOptions"));
    panel.extendToolBarButton.addEventListener("click", () => {
        const isExpanded = panel.extendToolBarButton.hasClass("is-active");
        panel.extendToolBarButton.toggleClass("is-active", !isExpanded);
        panel.subToolbarPanel.toggleClass("is-expanded", !isExpanded);
        setIcon(panel.extendToolBarButton, isExpanded ? "chevron-down" : "chevron-up");
    });

    // Quit search button (hidden by default)
    panel.quitSearchButton = toolbar.createEl("button", {
        cls: "clickable-icon ec-mode-button ec-quit-search-button",
        attr: { "aria-label": t("toolbar.exitSearch") },
    });
    setIcon(panel.quitSearchButton, "x");
    setTooltip(panel.quitSearchButton, t("toolbar.exitSearch"));
    panel.quitSearchButton.addEventListener("click", () => {
        void toggleSearchMode(panel, false);
    });
    panel.quitSearchButton.hide();

    // Search input (hidden by default)
    panel.searchInput = toolbar.createEl("input", {
        cls: "ec-search-input",
        attr: {
            type: "text",
            placeholder: t("toolbar.searchItemsPlaceholder")
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
    renderToolBarSubPanel(panel, subPanelContent, renderer);
}

/**
 * Set the default state for the toolbar (view mode, sort mode, tag visibility, etc.)
 * @param panel - The equation arrange panel instance
 * @param plugin - The plugin instance to get settings from
 */
export function setToolbarDefaultState(
    panel: EquationArrangePanel,
    plugin: EquationCitator,
): void {
    const {
        equationManagePanelDefaultViewType: defaultViewMode,
        equationManagePanelPreviewObjectType: previewObjectType,
        equationManagePanelEnableRenderHeadingsOnly: enableRenderHeadingsOnly,
        equationManagePanelFilterTagOnlyEquation: filterTagOnlyEquation,
        equationManagePanelFilterBoxedEquation: filterBoxedEquation,
    } = plugin.settings;
    // Set default view mode
    updatePanelViewMode(panel, defaultViewMode);
    
    // Set default preview object type
    updatePreviewObjectType(panel, previewObjectType);
    
    // Set default sort mode
    updateSortMode(panel, "seq");
    
    // Update mode buttons visibility
    updateModeButtons(panel);

    panel.filterTagOnlyItems = filterTagOnlyEquation;
    panel.filterBoxedEquation = filterBoxedEquation;
    updateFiltersButton(panel);
    
    panel.enableRenderHeadingOnly = enableRenderHeadingsOnly;
    updateHeadingOnlyButton(panel);
    // Set tag visibility
    toggleTagShow(panel, true);
}
