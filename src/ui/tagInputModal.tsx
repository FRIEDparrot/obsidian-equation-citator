import { Modal, App } from "obsidian";

// Modal for tag input
export default class TagInputModal extends Modal {
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
