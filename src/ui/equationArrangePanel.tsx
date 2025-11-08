import { ItemView, WorkspaceLeaf, setIcon, setTooltip, MarkdownRenderer, Modal, App, MarkdownView } from "obsidian";
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
    private filterEmptyHeadingsButton: HTMLElement;

    private showEquationTags = false;
    private isSearchMode = false;
    private searchQuery = "";
    private filterEmptyHeadings = false; // Default to outline view (show all headings)
    private collapsedHeadings: Set<number> = new Set();
    private updateHandler: () => void;
    private currentEquationHash = "";

    private currentActiveFile = "";      // current active file path (used for fast refresh)
    private currentViewMode = "";    // current display mode (used for fast refresh)
    private currentCollapseHeadings: Set<number> = new Set();
    private currentSortMode = "";    // current sort mode (used for fast refresh)
    private currentFilterEmptyHeadings = false; // current filter state (used for fast refresh)
    private dropHandler: (evt: DragEvent) => void;

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

        // Filter empty headings button (only visible in outline mode)
        this.filterEmptyHeadingsButton = toolbar.createEl("button", {
            cls: "clickable-icon ec-mode-button",
            attr: { "aria-label": "Filter empty headings" },
        });
        this.filterEmptyHeadingsButton.addEventListener("click", () => {
            this.filterEmptyHeadings = !this.filterEmptyHeadings;
            this.updateFilterButton();
            this.refreshView();
        });
        this.updateFilterButton(); // Set initial state
        this.filterEmptyHeadingsButton.hide();

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

        // Register drop handler for editors
        this.setupDropHandler();
    }

    private setupDropHandler(): void {
        this.dropHandler = async (evt: DragEvent) => {
            // Try to get equation data from different MIME types
            let data = evt.dataTransfer?.getData('application/json');
            if (!data) {
                data = evt.dataTransfer?.getData('text/plain');
            }
            if (!data) {
                console.log('No data in drop event');
                return;
            }

            try {
                const equationData = JSON.parse(data);
                console.log('Drop event received with data:', equationData);

                // Only handle our equation drops (must have content field)
                if (!equationData.content) {
                    console.log('No content field, ignoring');
                    return;
                }

                // Check if dropping on editor
                const target = evt.target as HTMLElement;
                const editorContent = target.closest('.cm-content');
                if (!editorContent) {
                    console.log('Not dropping on editor');
                    return;
                }

                evt.preventDefault();
                evt.stopPropagation();

                console.log('Handling equation drop');
                await this.handleEquationDrop(equationData, evt);
            } catch (error) {
                console.error('Failed to parse equation data:', error);
            }
        };

        // Use capture phase to intercept before other handlers
        document.addEventListener('drop', this.dropHandler, true);
        document.addEventListener('dragover', (evt) => {
            // Check if we're dragging equation data
            const types = evt.dataTransfer?.types || [];
            if (types.includes('application/json')) {
                const target = evt.target as HTMLElement;
                if (target.closest('.cm-content') && evt.dataTransfer) {
                    evt.preventDefault();
                    evt.dataTransfer.dropEffect = 'copy';
                }
            }
        }, true);
    }

    private async handleEquationDrop(equationData: { tag: string; content: string; sourcePath: string }, evt: DragEvent): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            console.log('No active markdown view');
            return;
        }

        const editor = activeView.editor;
        const targetFile = activeView.file;
        if (!targetFile) {
            console.log('No target file');
            return;
        }

        let tag = equationData.tag;

        // If no tag, prompt user to add one
        if (!tag) {
            const userTag = await this.promptForTag();
            if (!userTag) return; // User cancelled
            tag = userTag;
            // TODO: Add tag to the source equation
        }

        const citationPrefix = this.plugin.settings.citationPrefix;
        const isTargetSameAsSource = targetFile.path === equationData.sourcePath;

        // Build the citation string
        let citation: string;
        if (!isTargetSameAsSource) {
            const footnoteResult = await this.ensureFootnoteExists(targetFile.path, equationData.sourcePath);
            if (footnoteResult) {
                // Cross-file citation with footnote
                const delimiter = this.plugin.settings.fileCiteDelimiter;
                citation = `$\\ref{${citationPrefix}${footnoteResult}${delimiter}${tag}}$`;
            } else {
                // Could not create footnote, fallback to local citation
                citation = `$\\ref{${citationPrefix}${tag}}$`;
            }
        } else {
            // Same file citation
            citation = `$\\ref{${citationPrefix}${tag}}$`;
        }

        // Insert citation at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(citation, cursor);

        // Move cursor after the citation
        const newCursor = {
            line: cursor.line,
            ch: cursor.ch + citation.length
        };
        editor.setCursor(newCursor);

        console.log('Citation inserted:', citation);
    }

    private async promptForTag(): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = new TagInputModal(this.app, (tag) => {
                resolve(tag);
            });
            modal.open();
        });
    }

    private async ensureFootnoteExists(targetFilePath: string, sourceFilePath: string): Promise<string | null> {
        // Get existing footnotes in target file
        const existingFootnotes = await this.plugin.footnoteCache.getFootNotesFromFile(targetFilePath);

        // Check if footnote for this source file already exists
        const existingFootnote = existingFootnotes?.find(fn => fn.path === sourceFilePath);
        if (existingFootnote) {
            return existingFootnote.num;
        }

        // Need to create a new footnote
        const sourceFile = this.app.vault.getAbstractFileByPath(sourceFilePath);
        if (!sourceFile) return null;

        // Find next available footnote number
        const maxNum = existingFootnotes?.reduce((max, fn) => {
            const num = parseInt(fn.num);
            return isNaN(num) ? max : Math.max(max, num);
        }, 0) || 0;
        const newNum = (maxNum + 1).toString();

        // Append footnote to target file
        const targetFileContent = await this.app.vault.adapter.read(targetFilePath);
        const footnoteText = `[^${newNum}]: [[${sourceFilePath}]]`;
        const newContent = targetFileContent + '\n' + footnoteText;
        await this.app.vault.adapter.write(targetFilePath, newContent);

        // Refresh cache
        await this.plugin.footnoteCache.updateFileFootnotes(targetFilePath);

        return newNum;
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
        this.filterEmptyHeadingsButton.toggle(!enable);

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
        this.filterEmptyHeadingsButton.toggle(!listMode);
    }

    private updateFilterButton(): void {
        const iconName = this.filterEmptyHeadings ? "filter" : "filter-x";
        const tooltipText = this.filterEmptyHeadings ? "Hide empty headings" : "Show all headings";
        setIcon(this.filterEmptyHeadingsButton, iconName);
        setTooltip(this.filterEmptyHeadingsButton, tooltipText);
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
            this.filterEmptyHeadings === this.currentFilterEmptyHeadings &&
            setsEqual
        );
        if (viewStateEqual) return;

        // no need to empty view every time, clean it only when the hash changes
        this.currentEquationHash = equationsHash;
        this.currentViewMode = this.viewMode;
        this.currentCollapseHeadings = new Set(this.collapsedHeadings);
        this.currentSortMode = this.sortMode;
        this.currentFilterEmptyHeadings = this.filterEmptyHeadings;

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

        // Filter groups if filter is enabled
        const filteredGroups = this.filterEmptyHeadings
            ? groups.filter(group => group.equations.length > 0)
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
            : `ec-heading-item ec-heading-level-${group.absoluteLevel}`;

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
            cls: `ec-heading-text ec-heading-text-${group.absoluteLevel}`,
            text: headingText
        });

        // Make heading text clickable if it's a real heading (not no-heading group)
        if (group.heading) {
            headingTextSpan.addClass('ec-clickable');
            // Click handler for heading text - jump to heading location
            headingTextSpan.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                if (group.heading) {
                    this.jumpToHeading(group.heading);
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
        if (isCollapsed) {
            contentContainer.hide(); // Hide content initially before expanding
        }
        else {
            contentContainer.show(); // Show content initially
        }

        // Get DIRECT subheading indices only (not all nested levels)
        const directSubheadingIndices = this.getDirectSubheadingIndices(allGroups, currentIndex);
        
        // First, render ONLY direct subheadings (they will recursively render their own children)
        for (const subIndex of directSubheadingIndices) {
            await this.renderHeadingGroup(
                contentContainer,
                allGroups,
                subIndex,
                allEquations,
                allHeadings
            );
        }
        // Then, render direct equations (not in subheadings)

        if (hasDirectEquations) {
            const directEquationsContainer = contentContainer.createDiv("ec-heading-equations");
            if (isCollapsed) {
                directEquationsContainer.hide();
            }
            else {
                directEquationsContainer.show();
            }
            for (const eq of group.equations) {
                await this.renderEquationItem(directEquationsContainer, eq);
            }
        }

        // Click handler for chevron - collapse/expand
        if (hasContent && collapseIcon) {
            collapseIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling 
                const isCurrentlyCollapsed = this.collapsedHeadings.has(headingKey);

                if (isCurrentlyCollapsed) {
                    this.collapsedHeadings.delete(headingKey);
                    setIcon(collapseIcon, "chevron-down");
                    contentContainer.show();
                } else {
                    this.collapsedHeadings.add(headingKey);
                    setIcon(collapseIcon, "chevron-right");
                    contentContainer.hide();
                }
            });
        }

        return;
    }

    private jumpToHeading(heading: Heading): void {
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return;

        // Open the file and jump to the heading line
        const leaf = this.app.workspace.getLeaf(false);
        if (leaf) {
            leaf.openFile(currentFile, {
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
        eqDiv.addEventListener('dblclick', () => {
            this.jumpToEquation(equation);
        });

        // Drag start event
        eqDiv.addEventListener('dragstart', (event) => {
            if (!event.dataTransfer) return;

            // Change cursor to grabbing hand
            document.body.style.cursor = 'grabbing';
            eqDiv.style.opacity = '0.5';

            // Store equation data
            const equationData = {
                tag: equation.tag || '',
                content: equation.content,
                sourcePath: currentFile?.path || ''
            };

            const dataString = JSON.stringify(equationData);
            event.dataTransfer.setData('application/json', dataString);
            event.dataTransfer.setData('text/plain', dataString); // Fallback
            event.dataTransfer.effectAllowed = 'copy';

            console.log('Drag started with data:', equationData);
        });

        // Drag end event
        eqDiv.addEventListener('dragend', () => {
            document.body.style.cursor = '';
            eqDiv.style.opacity = '1';
        });
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

        // Remove drop handler
        if (this.dropHandler) {
            document.removeEventListener('drop', this.dropHandler, true);
        }
    }
}

// Modal for tag input
class TagInputModal extends Modal {
    private onSubmit: (tag: string | null) => void;
    private inputEl: HTMLInputElement;

    constructor(app: App, onSubmit: (tag: string | null) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: 'Enter equation tag' });
        contentEl.createEl('p', {
            text: 'This equation does not have a tag. Please enter a tag to cite it:',
            cls: 'ec-modal-description'
        });

        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'e.g., eq:1.2.3',
            cls: 'ec-tag-input-modal'
        });

        const buttonContainer = contentEl.createDiv({ cls: 'ec-modal-buttons' });

        const submitBtn = buttonContainer.createEl('button', { text: 'Submit', cls: 'mod-cta' });
        submitBtn.addEventListener('click', () => {
            const tag = this.inputEl.value.trim();
            if (tag) {
                this.onSubmit(tag);
                this.close();
            }
        });

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => {
            this.onSubmit(null);
            this.close();
        });

        // Focus input
        this.inputEl.focus();

        // Submit on Enter
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const tag = this.inputEl.value.trim();
                if (tag) {
                    this.onSubmit(tag);
                    this.close();
                }
            } else if (e.key === 'Escape') {
                this.onSubmit(null);
                this.close();
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
