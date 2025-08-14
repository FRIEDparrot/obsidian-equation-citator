import { Modal, Setting, Editor, Notice } from "obsidian";
import { TagRenamePair } from "@/services/tag_service";
import { PromiseOptionsModal, ModalOption } from "@/ui/optionsModal";
import EquationCitator from "@/main";
import { assemblyCitationUpdateMessage } from "@/func/autoNumber";


export class TagRenameModal extends Modal {
    private newTag: string;
    private editor?: Editor;
    constructor(
        private plugin: EquationCitator,
        private oldTag: string, sourceFile: string,
        private heading = "Rename This Tag to :"
    ) {
        super(plugin.app);
    }

    public setEditor(editor: Editor): void {
        this.editor = editor;
    }

    onOpen(): void {
        this.titleEl.setText("Rename Tag");
        this.contentEl.addClass("ec-tag-rename-modal");
        this.newTag = this.oldTag;
        new Setting(this.contentEl)
            .setName(this.heading)
            .addText((text) => {
                text.setPlaceholder("New Tag Name");
                text.setValue(this.oldTag);
                text.inputEl.focus();
                text.inputEl.select();
                text.onChange((value) => {
                    this.newTag = value;
                })
            });

        new Setting(this.contentEl)
            .addButton((button) => {
                button.setButtonText("Rename Tag");
                button.setCta();
                button.onClick(async () => {
                    const pair: TagRenamePair = {
                        oldTag: this.oldTag,
                        newTag: this.newTag,
                    }
                    const filePath = this.app.workspace.getActiveFile()?.path;
                    if (!filePath) {
                        return
                    }
                    await this.renameTag(filePath, pair);
                    this.close();
                });
            })
            .addButton((button) => {
                button.setButtonText("Cancel");
                button.onClick(() => this.close());
            });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    // override this method to handle submit event  
    public onSubmit(newName: string): void { }

    // rename tag by modal 
    async renameTag(filePath: string, pair: TagRenamePair) {
        // firstly, search all links to find if there's 
        const haveRepetedTags = await this.plugin.tagService.checkRepeatedTags(filePath, [pair]);

        const callRenameTagService = async (deleteRepeat: boolean, deleteUnused: boolean) => {
            const result = await this.plugin.tagService.renameTags(filePath, [pair], deleteRepeat, deleteUnused, this.editor);
            if (result) {
                const msg = assemblyCitationUpdateMessage(result);
                new Notice(msg);
            }
        }
        
        if (haveRepetedTags) {
            const deleteOption: ModalOption = {
                label: "Delete",
                cta: true,
                action: callRenameTagService.bind(this, true, false)
            }
            const keepOption: ModalOption = {
                label: "Keep",
                cta: false,
                action: callRenameTagService.bind(this, false, false)
            }
            const cancelOption: ModalOption = {
                label: "Cancel",
                cta: false,
                action: () => {} // do nothing when cancel button is clicked
            }
            const modal = new PromiseOptionsModal(this.app,
                "Citation Conflict",
                "There are citations with this name already, delete them or keep them?",
                [deleteOption, keepOption, cancelOption])
            await modal.openWithPromise();
        }
        else {
            await callRenameTagService(false, false);
            this.onSubmit(this.newTag); // call onSubmit method to rename selected tag 
        } 
    }
}