import { ItemView, WorkspaceLeaf, setIcon, setTooltip } from "obsidian";
import EquationCitator from "@/main";
import { EquationMatch } from "@/utils/parsers/equation_parser";

export const EQUATION_ARRANGE_PANEL_TYPE = "equation-arrange-panel";

type ViewMode = "list" | "rows";
type SortType = "tag" | "seq";

export class EquationArrangePanel extends ItemView {
    private viewMode: ViewMode = "list";
    private sortMode: SortType = "tag";
    private viewModeButton!: HTMLElement;
    private viewPanel!: HTMLElement;
    private sortButton!: HTMLElement;
    private collapseButton!: HTMLElement;
    private expandButton!: HTMLElement;
    private searchInput!: HTMLInputElement; 

    constructor(private plugin: EquationCitator, leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return EQUATION_ARRANGE_PANEL_TYPE;
    }

    getDisplayText(): string {
        return "Equations list";
    }

    getIcon(): string {
        return "square-pi";
    }

    updateViewMode(mode: ViewMode): void {
        this.viewMode = mode;
        setIcon(this.viewModeButton, mode === "rows"? "rows-4" : "list");
        setTooltip(this.viewModeButton, `${mode} view Mode`);
    }

    updateSortMode(mode: SortType): void {
        this.sortMode = mode;
        setIcon(this.sortButton, mode === "tag"? "tag" : "list-ordered");
        setTooltip(this.sortButton, `sort by ${mode}`);
    }
    
    async onOpen(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();
        
        const panelWrapper = containerEl.createDiv("ec-manage-panel-wrapper");
        
        const toolbar = panelWrapper.createDiv("ec-manage-panel-toolbar");
        
        this.viewModeButton = toolbar.createDiv("ec-view-mode-button clickable-icon");
        this.viewModeButton.addEventListener('click', ()=>{
            const newViewMode = this.viewMode === "rows"? "list" : "rows";
            this.updateViewMode(newViewMode);
            this.updateModeButtons();
            this.refreshView();
        });
            
        this.sortButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Sort equations" },
        });

        this.sortButton.addEventListener("click", () => {
            const sortMode = this.sortMode === "tag"? "seq" : "tag";
            this.updateSortMode(sortMode);
            this.refreshView();
        });
        
        this.expandButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Expand all" },
        });
        setIcon(this.expandButton, "chevrons-up-down");
        setTooltip(this.expandButton, "Expand all")
        
        this.collapseButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Collapse all" },
        });
        setIcon(this.collapseButton, "chevrons-down-up");
        setTooltip(this.collapseButton, "Collapse all");
        
        const equationListPanel = panelWrapper.createDiv("ec-equation-list-panel");
        this.viewPanel = equationListPanel;
        
        // // Dropdown (using native select)
        // const dropdownContainer = toolbar.createDiv("ec-dropdown-container");
        // const dropdown = dropdownContainer.createEl("select", { cls: "dropdown" });
        // dropdown.createEl("option", { value: "list", text: "List View" });
        // dropdown.createEl("option", { value: "outline", text: "Outline View" });
        // dropdown.value = this.viewMode;
        // dropdown.addEventListener("change", () => {
        //     this.viewMode = dropdown.value as ViewMode;
        //     this.updateModeButtons();
        //     this.refreshView();
        // });

        // // Mode buttons
        // const buttonContainer = toolbar.createDiv("ec-button-container");

        // this.sortButton = buttonContainer.createEl("button", {
        //     cls: "clickable-icon ec-mode-button ec-sort-button",
        //     attr: { "aria-label": "Sort equations" },
        // });
        // setIcon(this.sortButton, "list");
        // this.sortButton.addEventListener("click", () => this.handleSort());

        // this.collapseButton = buttonContainer.createEl("button", {
        //     cls: "clickable-icon ec-mode-button ec-collapse-button",
        //     attr: { "aria-label": "Collapse all" },
        // });
        // setIcon(this.collapseButton, "chevron-down");
        // this.collapseButton.addEventListener("click", () => this.handleCollapseAll());

        
        // setIcon(this.expandButton, "chevron-up");
        // this.expandButton.addEventListener("click", () => this.handleExpandAll());

        // // Main content panel
        // this.viewPanel = containerEl.createDiv("ec-view-panel");

        this.updateViewMode("list");   // default view mode is list 
        this.updateSortMode("tag");
        this.updateModeButtons();
        this.refreshView();
    }
    
    private updateModeButtons(): void {
        const listMode = this.viewMode === "list";

        this.sortButton.toggle(listMode);
        this.collapseButton.toggle(!listMode);
        this.expandButton.toggle(!listMode);
    }

    private handleSort(): void {
        console.log("Sorting equations...");
    }

    private handleCollapseAll(): void {
        console.log("Collapsing all...");
    }

    private handleExpandAll(): void {
        console.log("Expanding all...");
    }

    private refreshView(): void {
        this.viewPanel.empty();
        if (this.viewMode === "list") this.renderOutlineView();
        else this.renderRowsView();
    }

    private async getAllEquations(): Promise<EquationMatch[]> {
        const currectFile = this.app.workspace.getActiveFile(); // get current file 
        if (!currectFile) return []; 
        const equations = await this.plugin.equationCache.getEquationsForFile(currectFile.path); 
        return equations || [];
    }

    private renderRowsView(): void {
        this.viewPanel.createDiv({ text: "Rows view content", cls: "ec-list-view" });
    }

    private renderOutlineView(): void {
        this.viewPanel.createDiv({ text: "Outline view content", cls: "ec-outline-view" });
    }

    onunload(): void {}
}
