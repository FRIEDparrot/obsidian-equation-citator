import EquationCitator from "@/main"
import { Menu, App, Editor, MarkdownView, MenuItem } from "obsidian"
import { EditorSelectionInfo } from "@/views/widgets/citation_render";
import { EditorState } from "@codemirror/state";
import Debugger from "@/debug/debugger";
import { TagRenameModal } from "@/ui/modals/tagRenameModal";

export function registerRightClickHandler(plugin: EquationCitator) {
    const app: App = plugin.app;
    plugin.registerEvent(
        //  right click menu for tag rename 
        app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView): void => {
            if (handleEquationTagRename(plugin, menu, editor, view)) return;
            if (handleFigureTagRename(plugin, menu, editor, view)) return;
        })
    )
}

/**
 * Handle right-click menu for equation tag rename
 * Checks if the selected text is a valid equation tag, and if so, adds a "Rename equation tag" option to the context menu.
 * When the option is clicked, it opens a modal to input the new tag name, and upon submission, replaces the old tag in the selected text with the new tag.
 * @plugin - The main plugin instance, used to access settings and services.
 * @menu - The context menu to which the rename option will be added.
 * @editor - The editor instance where the right-click occurred, used to get the selected text and replace it with the new tag.
 * @view - The markdown view associated with the editor, not used directly in this function but can be useful for future enhancements.
 * @returns {boolean} True if a menu item was added, false otherwise.
 */
function handleEquationTagRename(plugin: EquationCitator, menu: Menu, editor: Editor, view: MarkdownView): boolean {
    if (!(view instanceof MarkdownView)) return false;
    let tagInfo: EditorSelectionInfo;
    const state: EditorState = editor.cm.state;
    tagInfo = state.field(plugin.tagSelectedField);  // get the selected tag  
    if (!tagInfo.range || !tagInfo.tagSelected) return false;
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
        item.setTitle("Rename equation tag")
        item.setIcon("pencil")
        item.onClick(() => {
            if (!tagInfo.tagContent) {
                Debugger.log("No tag content to rename");
                return;
            }
            const filePath = plugin.app.workspace.getActiveFile()?.path;
            if (!filePath) {
                Debugger.log("No active file to rename tag");
                return;
            }
            const modal = new TagRenameModal(plugin, tagInfo.tagContent, filePath);
            modal.setEditor(editor);
            modal.onSubmit = (newName: string) => {
                const newTag = plugin.settings.enableTypstMode ? `#label("${newName}")` : String.raw`\tag{${newName}}`;
                const fromPos = editor.getCursor("from");
                const toPos = editor.getCursor("to");
                editor.replaceRange(
                    newTag,
                    fromPos,
                    toPos,
                )
            }
            modal.open();
        })
    })
    return true;
}

/**
 * Handle right-click menu for figure tag rename
 * Checks if the selected text is a valid figure tag, and if so, adds a "Rename tag for figure" option to the context menu.
 * When the option is clicked, it opens a modal to input the new tag name, and upon submission, replaces the old tag in the selected text with the new tag.
 * @plugin - The main plugin instance, used to access settings and services.
 * @menu - The context menu to which the rename option will be added.
 * @editor - The editor instance where the right-click occurred, used to get the selected text and replace it with the new tag.
 * @view - The markdown view associated with the editor, not used directly in this function but can be useful for future enhancements.
 * @returns {boolean} True if a menu item was added, false otherwise.
 */
function handleFigureTagRename(plugin: EquationCitator, menu: Menu, editor: Editor, view: MarkdownView): boolean {
    if (!(view instanceof MarkdownView)) return false;
    const selectedText = editor.getSelection();
    if (!selectedText) return false;
    const imagePrefix = plugin.settings.figCitationPrefix || "fig:";
    const isValidFigure = plugin.figureTagService.isValidFigureWithTag(selectedText, imagePrefix);
    if (!isValidFigure) return false;
    menu.addSeparator();
    menu.addItem((item: MenuItem) => {
        item.setTitle("Rename tag for this picture")
        item.setIcon("image")
        item.onClick(() => {
            const imageMatch = plugin.figureTagService.parseSelectedImage(selectedText, imagePrefix);
            if (!imageMatch?.tag) {
                Debugger.log("No figure tag found in selection");
                return;
            }

            const filePath = plugin.app.workspace.getActiveFile()?.path;
            if (!filePath) {
                Debugger.log("No active file to rename figure tag");
                return;
            }
            const modal = new TagRenameModal(plugin, imageMatch.tag, filePath, "Rename figure tag to:");
            modal.setEditor(editor);
            modal.setIsFigureTag(true); // Mark this as a figure tag rename
            modal.onSubmit = (newName: string) => {
                // Replace the tag in the selected image line (like equations do)
                const oldLabel = `${imagePrefix}${imageMatch.tag}`;
                const newLabel = `${imagePrefix}${newName}`;
                const updatedText = selectedText.replace(oldLabel, newLabel);
                editor.replaceSelection(updatedText);
                
                // Invalidate image cache for this file since the tag changed
                if (filePath) {
                    plugin.imageCache.delete(filePath);
                }
            }
            modal.open();
        })
    })
    return true;
}
