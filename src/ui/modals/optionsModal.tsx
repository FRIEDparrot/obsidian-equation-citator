import { App, Modal, Setting } from "obsidian";

export type ModalOption = {
    label: string;
    cta?: boolean;   // cta button  
    action: () => Promise<void> ;
};

export class OptionsModal extends Modal {
    constructor(
        app: App,
        private title: string,
        private question: string,
        private options: ModalOption[]) {
        super(app);
    }
    onOpen() {
        this.titleEl.setText(this.title);
        this.contentEl.createEl("p", { text: this.question });

        const setting = new Setting(this.contentEl);
        this.options.forEach(opt => {
            setting.addButton(btn => {
                btn
                    .setButtonText(opt.label)
                    .onClick(async() => {
                        this.close();
                        await opt.action?.();  // do action after close 
                    });

                if (opt.cta) {
                    btn.setCta();
                }
            });
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}


export class PromiseOptionsModal extends Modal {
    private resolver!: (value: string | null) => void;

    constructor(app: App,
        private title: string,
        private question: string,
        private options: ModalOption[]) {
        super(app);
    }
    
    public async openWithPromise(): Promise<string | null> {
        this.open();
        return new Promise(resolve => {
            this.resolver = resolve;
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        new Setting(this.containerEl).setName("Beta features").setHeading();
        contentEl.createEl("p", { text: this.question });
        const setting = new Setting(this.contentEl);
        this.options.forEach(opt => {
            setting.addButton(btn => {
                btn
                    .setButtonText(opt.label)
                    .onClick(async() => {
                        await opt.action?.(); // do action after close
                        this.close(); 
                        this.resolver(null); // resolve promise 
                    });

                if (opt.cta) {
                    btn.setCta();
                }
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
