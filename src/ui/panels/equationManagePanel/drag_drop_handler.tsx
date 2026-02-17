import { App, MarkdownView, Platform } from "obsidian";
import TagInputModal from "@/ui/modals/tagInputModal";
import EquationCitator from "@/main";
import { drawCursorAtDragPosition, clearDragCursor, getEditorDropLocation } from "@/utils/workspace/drag_drop_event";
import { getMarkdownViewFromEvent } from "@/utils/workspace/get_evt_view";
import { insertTextWithCursorOffset } from "@/utils/workspace/insertTextOnCursor";
import { checkFootnoteExists } from "@/utils/core/footnote_utils";
import Debugger from "@/debug/debugger";

import { EquationArrangePanel } from "./mainPanel";

export class EquationPanelDragDropHandler {
    private dropHandler: (evt: DragEvent) => void;
    private dragoverHandler: (evt: DragEvent) => void;
    private dragendHandler: (evt: DragEvent) => void;
    private lastDragTargetView: MarkdownView | null = null;
    private readonly app: App;
    constructor(
        private readonly plugin: EquationCitator,
        private readonly panel: EquationArrangePanel
    ) {
        this.registerDropEquationHandler();
        this.app = this.plugin.app;
    }

    unload() {
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
        if (Platform.isMobile) {
            Debugger.log("Mobile platform, skipping drag-and-drop handlers");
            return;
        }
        // Dragover handler - show visual cursor and allow drop
        this.dragoverHandler = (evt: DragEvent) => {
            // Check if we're dragging equation data
            const types = evt.dataTransfer?.types || [];

            if (evt.dataTransfer && types.includes('ec-equations/drop-citations')) {
                // show different type of cursor according to if its editor 
                const targetView = getMarkdownViewFromEvent(this.app.workspace, evt);
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
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
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
            await this.panel.refreshView();  // refresh view after renaming 
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
} 
