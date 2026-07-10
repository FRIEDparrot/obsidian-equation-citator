import { Modal, Setting, Editor, Notice } from "obsidian";
import { TagRenamePair } from "@/services/tag_service";
import { PromiseOptionsModal, ModalOption } from "@/ui/modals/optionsModal";
import EquationCitator from "@/main";
import { assemblyCitationUpdateMessage } from "@/func/autoNumber";
import { t } from "@/i18n/getLocale";


export class TagRenameModal extends Modal {
    private newTag!: string;
    private editor?: Editor;
    private isFigureTag = false;
    
    constructor(
        private readonly plugin: EquationCitator,
        private readonly oldTag: string, sourceFile: string,
        private readonly heading = t("modal.tagRename.heading")
    ) {
        super(plugin.app);
    }

    public setEditor(editor: Editor): void {
        this.editor = editor;
    }

    public setIsFigureTag(isFigure: boolean): void {
        this.isFigureTag = isFigure;
    }

    onOpen(): void {
        this.titleEl.setText(t("modal.tagRename.title"));
        this.contentEl.addClass("ec-tag-rename-modal");
        this.newTag = this.oldTag;
        // helper to perform rename (shared by button & Enter key)
        const triggerRename = async () => {
            const pair: TagRenamePair = { oldTag: this.oldTag, newTag: this.newTag };
            const filePath = this.app.workspace.getActiveFile()?.path;
            if (!filePath) return;
            await this.renameTag(filePath, pair);
            this.close();
        };
        new Setting(this.contentEl)
            .setName(this.heading)
            .addText((text) => {
                text.setPlaceholder(t("modal.tagRename.placeholder"));
                text.setValue(this.oldTag);
                text.inputEl.focus();
                text.inputEl.select();
                text.onChange((value) => {
                    this.newTag = value;
                })
                // Press Enter inside input to trigger rename
                text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        void triggerRename(); 
                    }
                });
            });

        new Setting(this.contentEl)
            .addButton((button) => {
                button.setButtonText(t("modal.confirm"));
                button.setCta();
                button.onClick(triggerRename);
                // Allow Enter when button focused (some Obsidian themes may swallow it)
                button.buttonEl.addEventListener('keydown', (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        void triggerRename();
                    }
                });
            })
            .addButton((button) => {
                button.setButtonText(t("modal.cancel"));
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
        // Use different service based on tag type
        if (this.isFigureTag) {
            await this.renameFigureTag(filePath, pair);
        } else {
            await this.renameEquationTag(filePath, pair);
        }
    }

    // Rename equation tag
    async renameEquationTag(filePath: string, pair: TagRenamePair) {
        // firstly, search all links to find if there's 
        const haveRepetedTags = await this.plugin.tagService.checkRepeatedTags(filePath, [pair]);

        const callRenameTagService = async (deleteRepeat: boolean, deleteUnused: boolean) => {
            const result = await this.plugin.tagService.renameTags(
                filePath, [pair], deleteRepeat, deleteUnused, this.editor, this.plugin.settings.citationPrefix
            );
            if (result) {
                const msg = assemblyCitationUpdateMessage(result);
                new Notice(msg);
            }
            this.onSubmit(this.newTag); // call onSubmit method to rename selected tag
        }
        
        if (haveRepetedTags) {
            const deleteOption: ModalOption = {
                label: t("modal.delete"),
                cta: true,
                action: ()=> callRenameTagService(true, false)
            }
            const keepOption: ModalOption = {
                label: t("modal.keep"),
                cta: false,
                action: ()=> callRenameTagService(false, false)
            }
            const cancelOption: ModalOption = {
                label: t("modal.cancel"),
                cta: false,
                action: async() => {
                    return new Promise(resolve => resolve());
                } // do nothing when cancel button is clicked
            }
            const modal = new PromiseOptionsModal(this.app,
                t("modal.citationConflict.title"),
                t("modal.citationConflict.question"),
                [deleteOption, keepOption, cancelOption])
            await modal.openWithPromise();
        }
        else {
            await callRenameTagService(false, false);
        } 
    }

    // Rename figure tag
    async renameFigureTag(filePath: string, pair: TagRenamePair) {
        const imagePrefix = this.plugin.settings.figCitationPrefix || "fig:";
        const haveRepetedTags = await this.plugin.tagService.checkRepeatedTags(filePath, [pair], imagePrefix);

        const callRenameFigureService = async (deleteRepeat: boolean, deleteUnused: boolean) => {
            const result = await this.plugin.figureTagService.renameFigureTags(filePath, [pair], deleteRepeat, deleteUnused, this.editor);
            if (result) {
                const msg = assemblyCitationUpdateMessage(result);
                new Notice(msg);
            }
            this.onSubmit(this.newTag); // call onSubmit method to rename selected tag
        }

        if (haveRepetedTags) {
            const deleteOption: ModalOption = {
                label: t("modal.delete"),
                cta: true,
                action: ()=> callRenameFigureService(true, false)
            }
            const keepOption: ModalOption = {
                label: t("modal.keep"),
                cta: false,
                action: ()=> callRenameFigureService(false, false)
            }
            const cancelOption: ModalOption = {
                label: t("modal.cancel"),
                cta: false,
                action: async() => {
                    return new Promise(resolve => resolve());
                } // do nothing when cancel button is clicked
            }
            const modal = new PromiseOptionsModal(this.app,
                t("modal.citationConflict.title"),
                t("modal.citationConflict.question"),
                [deleteOption, keepOption, cancelOption])
            await modal.openWithPromise();
        }
        else {
            await callRenameFigureService(false, false);
        }
    }
}
