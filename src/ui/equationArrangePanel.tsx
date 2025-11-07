import { ItemView, WorkspaceLeaf, setIcon, setTooltip, MarkdownRenderer } from "obsidian";
import EquationCitator from "@/main";
import { EquationMatch } from "@/utils/parsers/equation_parser";
import { hashEquations } from "@/utils/misc/hash_utils";
import { parseHeadingsInMarkdown, Heading, relativeHeadingLevel } from "@/utils/parsers/heading_parser";

export const EQUATION_ARRANGE_PANEL_TYPE = "equation-arrange-panel";

type ViewMode = "outline" | "list";
type SortType = "tag" | "seq";

interface EquationGroup {
    heading: Heading | null;  // null for no heading 
    equations: EquationMatch[];
    absoluteLevel: number;
    relativeLevel: number;
}

export class EquationArrangePanel extends ItemView {
    private viewMode: ViewMode = "outline";
    private sortMode: SortType = "tag";
    private viewModeButton!: HTMLElement;
    private viewPanel!: HTMLElement;
    private sortButton!: HTMLElement;
    private collapseButton!: HTMLElement;
    private expandButton!: HTMLElement;
    private searchButton!: HTMLElement;
    private searchInput!: HTMLInputElement;
    private quitSearchButton!: HTMLElement;
    private toggleTagShowButton: HTMLElement;

    private showEquationTags = false;
    private isSearchMode = false;
    private searchQuery = "";
    private collapsedHeadings: Set<number> = new Set();
    private updateHandler: () => void;
    private currentEquationHash = "";

    private currentActiveFile = "";      // current active file path (used for fast refresh)
    private currentViewMode = "";    // current display mode (used for fast refresh)
    private currentCollapseHeadings: Set<number> = new Set();
    private currentSortMode = "";    // current sort mode (used for fast refresh)

    constructor(private plugin: EquationCitator, leaf: WorkspaceLeaf) {
        super(leaf);
        this.updateHandler = () => {
            this.refreshView();
        };
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
        setIcon(this.viewModeButton, mode === "outline" ? "list" : "rows-4");
        setTooltip(this.viewModeButton, `${mode === "outline" ? "outline" : "list"} view Mode`);
    }

    updateSortMode(mode: SortType): void {
        this.sortMode = mode;
        setIcon(this.sortButton, mode === "tag" ? "tag" : "list-ordered");
        setTooltip(this.sortButton, `sort by ${mode == "tag" ? "tag" : "line number"}`);
    }

    async onOpen(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();

        const panelWrapper = containerEl.createDiv("ec-manage-panel-wrapper");
        const toolbar = panelWrapper.createDiv("ec-manage-panel-toolbar");

        this.viewModeButton = toolbar.createDiv("ec-view-mode-button clickable-icon");
        this.viewModeButton.addEventListener('click', () => {
            const newViewMode = this.viewMode === "outline" ? "list" : "outline";
            this.updateViewMode(newViewMode);
            this.updateModeButtons();
            this.refreshView();
        });

        this.sortButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Sort equations" },
        });

        this.sortButton.addEventListener("click", () => {
            const sortMode = this.sortMode === "tag" ? "seq" : "tag";
            this.updateSortMode(sortMode);
            this.refreshView();
        });

        this.expandButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Expand all" },
        });
        setIcon(this.expandButton, "chevrons-up-down");
        setTooltip(this.expandButton, "Expand all");
        this.expandButton.addEventListener("click", () => {
            this.handleExpandAll();
        });

        this.collapseButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Collapse all" },
        });
        setIcon(this.collapseButton, "chevrons-down-up");
        setTooltip(this.collapseButton, "Collapse all");
        this.collapseButton.addEventListener("click", () => {
            this.handleCollapseAll();
        });

        // hide tag button 
        this.toggleTagShowButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button ec-tag-hide-button",
            attr: { "aria-label": "Hide tag button" },
        });  // placeholder for tag button 
        this.toggleTagShowButton.addEventListener("click", () => {
            const mode = this.showEquationTags ? false : true;
            this.toggleTagShow(mode);
            this.refreshView();
        });

        this.viewPanel = panelWrapper.createDiv("ec-equation-list-panel");

        // Search button
        this.searchButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Search equations" },
        });
        setIcon(this.searchButton, "search");
        setTooltip(this.searchButton, "Search equations");
        this.searchButton.addEventListener("click", () => {
            this.toggleSearchMode(true);
        });

        // Quit search button (hidden by default)
        this.quitSearchButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button ec-quit-search-button",
            attr: { "aria-label": "Exit search" },
        });
        setIcon(this.quitSearchButton, "x");
        setTooltip(this.quitSearchButton, "Exit search");

        this.quitSearchButton.addEventListener("click", () => {
            this.toggleSearchMode(false);
        });
        this.quitSearchButton.hide();

        // Search input (hidden by default)
        this.searchInput = toolbar.createEl("input", {
            cls: "ec-search-input",
            attr: {
                type: "text",
                placeholder: "Search equations..."
            },
        });
        this.searchInput.addEventListener("input", () => {
            this.searchQuery = this.searchInput.value;
            this.refreshView();
        });
        this.searchInput.hide();

        ///////////////////////////////   Render view   ////////// 

        this.updateViewMode("outline");   // default view mode is list
        this.updateSortMode("tag");
        this.updateModeButtons();      // update mode buttons after that
        this.toggleTagShow(true);
        this.refreshView();

        // Register event listeners for dynamic updates
        this.registerEvent(
            this.app.vault.on('modify', this.updateHandler)
        );
    }

    private toggleSearchMode(enable: boolean): void {
        this.isSearchMode = enable;

        this.searchInput.toggle(enable);
        this.quitSearchButton.toggle(enable);

        // hide other buttons when search mode is enabled 
        this.searchButton.toggle(!enable);
        this.viewModeButton.toggle(!enable);
        this.sortButton.toggle(!enable);
        this.expandButton.toggle(!enable);
        this.collapseButton.toggle(!enable);
        this.toggleTagShowButton.toggle(!enable);

        if (enable) {
            this.searchInput.focus();
        } else {
            // Hide search UI
            this.refreshView();
            this.updateModeButtons();
        }
    }

    private toggleTagShow(mode: boolean) {
        this.showEquationTags = mode;
        setIcon(this.toggleTagShowButton, mode ? "bookmark-check" : "bookmark-x");
        setTooltip(this.toggleTagShowButton, mode ? "tag: show" : "tag: hidden");
        document.body.classList.toggle("ec-tag-show", mode);
    }

    private updateModeButtons(): void {
        const listMode = this.viewMode === "list";
        this.sortButton.toggle(listMode);

        this.collapseButton.toggle(!listMode);
        this.expandButton.toggle(!listMode);
    }

    private handleCollapseAll(): void {
        const allHeadings = this.viewPanel.querySelectorAll('.ec-heading-item');
        allHeadings.forEach((heading) => {
            const lineNum = parseInt(heading.getAttribute('data-line') || '0');
            this.collapsedHeadings.add(lineNum);
        });
        this.refreshView();
    }

    private handleExpandAll(): void {
        this.collapsedHeadings.clear();
        this.refreshView();
    }

    private async getEquationsToRender(): Promise<EquationMatch[]> {
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) {
            this.viewPanel.empty();
            this.viewPanel.createDiv({ text: "No active file", cls: "ec-empty-message" });
            return [];
        }
        const equations = await this.getAllEquations()
        const filteredEquations = this.filterEquations(equations);
        if (filteredEquations.length === 0) {
            this.viewPanel.empty();
            this.viewPanel.createDiv({
                text: this.searchQuery ? "No equation match your search" : "No equation found in current file",
                cls: "ec-empty-message"
            });
            return [];
        }
        return filteredEquations;
    }

    /**
     * refresh the equations render view
     */
    private async refreshView(): Promise<void> {
        const equations = await this.getEquationsToRender();
        if (!equations || equations.length === 0) return;

        const equationsHash = hashEquations(equations);

        const setsEqual = (
            this.currentCollapseHeadings.size === this.collapsedHeadings.size &&
            [...this.currentCollapseHeadings].every(x => this.collapsedHeadings.has(x))
        );
        const viewStateEqual = (
            equationsHash === this.currentEquationHash &&
            this.viewMode === this.currentViewMode &&
            this.sortMode === this.currentSortMode &&
            setsEqual
        );
        if (viewStateEqual) return;

        // no need to empty view every time, clean it only when the hash changes
        this.currentEquationHash = equationsHash;
        this.currentViewMode = this.viewMode;
        this.currentCollapseHeadings = new Set(this.collapsedHeadings);
        this.currentSortMode = this.sortMode;

        this.viewPanel.empty();

        if (this.viewMode === "outline") {
            await this.renderOutlineView(equations);
        } else {
            await this.renderRowsView(equations);
        }
    }

    private async getAllEquations(): Promise<EquationMatch[]> {
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return [];
        const equations = await this.plugin.equationCache.getEquationsForFile(currentFile.path);
        return equations || [];
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

    private async renderOutlineView(equations: EquationMatch[]): Promise<void> {
        // parse headings in the file 
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return;
        const fileContent = await this.app.vault.cachedRead(currentFile);
        const headings = parseHeadingsInMarkdown(fileContent);
        
        if (headings.length === 0) {
            // No headings, render as flat list
            await this.renderRowsView(equations);
            return;
        }
        // Group equations by headings
        const groups = this.groupEquationsByHeadings(equations, headings);
        
        const outlineContainer = this.viewPanel.createDiv("ec-outline-view");

        for (const group of groups) {
            await this.renderHeadingGroup(outlineContainer, group);
        }
    }

    private groupEquationsByHeadings(equations: EquationMatch[], headings: Heading[]): EquationGroup[] {
        const groups: EquationGroup[] = [];
        const eqs_sorted = equations.sort((a, b) => a.lineStart - b.lineStart); 
        
        // Group non-heading equations first 
        const nonHeadingEquations = eqs_sorted.filter(eq => eq.lineStart < headings[0].line); 
        if (nonHeadingEquations.length > 0) {
            const group: EquationGroup = {
                heading: null,
                equations: nonHeadingEquations,
                absoluteLevel: 0,
                relativeLevel: 0
            };
            groups.push(group);
        }
        
        for (let i = 0; i < headings.length; i++) {
            // const heading = headings[i];
            // const nextHeadingLine = i < headings.length - 1 ? headings[i + 1].line : Infinity;
            
            // // Find equations that belong to this heading
            // const headingEquations = equations.filter(eq =>
            //     eq.lineStart >= heading.line && eq.lineStart < nextHeadingLine
            // );
            
            // if (headingEquations.length > 0) {
            //     const relLevel = relativeHeadingLevel(headings, i);
            //     groups.push({
            //         heading,
            //         equations: headingEquations,
            //         absoluteLevel: heading.level,
            //         relativeLevel: relLevel
            //     });
            // } 
        }

        return groups;
    }

    private async renderHeadingGroup(
        container: HTMLElement,
        group: EquationGroup
    ): Promise<void> {
        const isCollapsed = this.collapsedHeadings.has(group.heading.line);
        const headingDiv = container.createDiv({
            cls: `ec-heading-item ec-heading-level-${group.relativeLevel}`,
            attr: { 'data-line': group.heading.line.toString() }
        });
        const headingHeader = headingDiv.createDiv("ec-heading-header");
        
        // Collapse/expand icon
        const collapseIcon = headingHeader.createSpan(`ec-collapse-icon ec-heading-collapse-icon-${group.relativeLevel}`);
        setIcon(collapseIcon, isCollapsed ? "chevron-right" : "chevron-down");

        // Heading text
        headingHeader.createSpan({
            cls: `ec-heading-text ec-heading-text-${group.relativeLevel}`,
            text: group.heading.text
        });

        // Equation count badge
        headingHeader.createSpan({
            cls: "ec-equation-count",
            text: group.equations.length.toString()
        });

        // function to render equations for this group
        const renderGroupEquations = async () => {
            const headingLine = group.heading.line;
            const headingDiv = headingHeader.parentElement as HTMLElement;
            const equationsContainer = headingDiv.querySelector('.ec-heading-equations') as HTMLElement | null;
            const isCollapsed = this.collapsedHeadings.has(headingLine);

            if (isCollapsed) {
                this.collapsedHeadings.add(headingLine);
                setIcon(collapseIcon, "chevron-right");
                if (equationsContainer) {
                    equationsContainer.toggle(false); // hide
                }
            }
            else { // Render equations if not collapsed
                this.collapsedHeadings.delete(headingLine);
                setIcon(collapseIcon, "chevron-down");
                if (!equationsContainer) {
                    const newContainer = headingDiv.createDiv("ec-heading-equations");
                    for (const eq of group.equations) {
                        this.renderEquationItem(newContainer, eq);
                    }
                } else {
                    equationsContainer.toggle(true); // show again
                }
            }
        }
        // Render equations if not collapsed
        renderGroupEquations();

        // Click handler for collapse/expand
        headingHeader.addEventListener('click', () => {
            const headingLine = group.heading.line;
            const isCollapsed = this.collapsedHeadings.has(headingLine);
            if (isCollapsed) {
                this.collapsedHeadings.delete(headingLine);
            } else {
                this.collapsedHeadings.add(headingLine);
            }
            renderGroupEquations();
        });
    }

    private async renderEquationItem(container: HTMLElement, equation: EquationMatch): Promise<void> {
        const eqDiv = container.createDiv("ec-equation-item");

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
        eqDiv.addEventListener('dblclick', () => {
            this.jumpToEquation(equation);
        });

        // eqDiv.addEventListener('drag', (event) => {
        //     event.dataTransfer.setData('text/plain', equation.content);
        // })
    }

    private jumpToEquation(equation: EquationMatch): void {
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return;

        // Open the file and jump to the line
        const leaf = this.app.workspace.getLeaf(false);
        if (leaf) {
            leaf.openFile(currentFile, {
                eState: {
                    line: equation.lineStart,
                    cursor: { from: { line: equation.lineStart, ch: 0 } }
                }
            });
        }
    }

    onunload(): void {
        // Clean up event listeners
        this.app.workspace.off('active-leaf-change', this.updateHandler);
        this.app.vault.off('modify', this.updateHandler);
    }
}
