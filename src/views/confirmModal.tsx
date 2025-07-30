import { App, Modal, Setting } from "obsidian";

export class ConfirmModal extends Modal {
    private title: string;
    private question: string;
    private onConfirm: () => void;
    private onCancel: () => void;

    constructor(app: App, title: string, question: string, onConfirm: () => void, onCancel: () => void) {
        super(app);
        this.title = title; 
        this.question = question;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    onOpen() {
        this.titleEl.setText(this.title);
        this.contentEl.createEl("p", { text: this.question });

        new Setting(this.contentEl)
            .addButton(btn =>
                btn
                    .setButtonText("Confirm")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onConfirm();
                    })
            )
            .addButton(btn =>
                btn
                    .setButtonText("Cancel")
                    .onClick(() => {
                        this.close();
                        this.onCancel();
                    })
            );
    }

    onClose() {
        this.contentEl.empty();
    }
}
