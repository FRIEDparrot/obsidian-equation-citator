import EquationCitator from "@/main"
import { Menu, App, Editor, MarkdownView, MenuItem } from "obsidian"
import { EditorSelectionInfo, tagSelectedField } from "@/views/citation_render";
import { EditorState } from "@codemirror/state";
import Debugger from "@/debug/debugger";
import { TagRenameModal } from "@/ui/modals/tagRenameModal";

export function registerRightClickHandler(plugin: EquationCitator) {
    const app: App = plugin.app;
    plugin.registerEvent(
        //  right click menu for tag rename 
        app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView): void => {
            let tagInfo: EditorSelectionInfo;
            try {
                // @ts-ignore
                const state: EditorState = editor.cm?.state
                tagInfo = state.field(tagSelectedField);  // get the selected tag  
            }
            catch (e) {
                Debugger.error("Can't get selected tag: ", e);
                return;
            }
            if (tagInfo.range && tagInfo?.tagSelected) {
                // add the rename option to the menu
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
                        modal.setEditor(editor);  // set the editor for the modal 
                        modal.onSubmit = (newName: string) => {
                            const newTag = `\\tag{${newName}}`; 
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
            }
        })
    )
}

