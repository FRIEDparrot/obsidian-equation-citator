import { Modal, App } from "obsidian";
import { t } from "@/i18n/getLocale";

// Modal for tag input
export default class TagInputModal extends Modal {
    private readonly onSubmit: (tag: string | null) => void;
    private inputEl: HTMLInputElement; 
    
    constructor(app: App, onSubmit: (tag: string | null) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h3', { text: t("modal.tagInput.title") });
        contentEl.createEl('p', {
            text: t("modal.tagInput.description"),
            cls: 'ec-modal-description'
        });

        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: t("modal.tagInput.placeholder"),
            cls: 'ec-tag-input-modal'
        });

        const buttonContainer = contentEl.createDiv({ cls: 'ec-modal-buttons' });

        const submitBtn = buttonContainer.createEl('button', { text: t("modal.tagInput.submit"), cls: 'mod-cta' });
        submitBtn.addEventListener('click', () => {
            const tag = this.inputEl.value.trim();
            if (tag) {
                this.onSubmit(tag);
                this.close();
            }
        });

        const cancelBtn = buttonContainer.createEl('button', { text: t("modal.cancel") });
        cancelBtn.addEventListener('click', () => {
            this.onSubmit(null);
            this.close();
        });
        
        // Focus input
        this.inputEl.focus();

        // Submit on Enter
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default behavior in editor
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
