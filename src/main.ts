import { App, Editor, ItemView, MarkdownView, MarkdownRenderer, Modal, Notice, Plugin, Workspace, WorkspaceLeaf, loadMathJax } from 'obsidian';
import {
    EquationCitatorSettings,
    DEFAULT_SETTINGS,
    SettingsTabView
} from './settings/settingsTab'; 
import { Extension } from '@codemirror/state';
import { showSyntaxTree } from '@/view/editor';
import { EquationRenderView } from '@/view/reference';

export default class EquationCitator extends Plugin {
    settings: EquationCitatorSettings; 
    extensions: Extension[] = []; 
    
    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SettingsTabView(this.app, this));

        loadMathJax();  // Load MathJax for rendering equations.
        

        this.registerView(
            'equation-render-view',
            (leaf) => new EquationRenderView(leaf, '$$x^2$$') 
        )
        this.addRibbonIcon('dice', 'Open Equation Citation View', () => {
            new Notice('This is equation citator plugin.');
            // new EquationRenderView(this.app.workspace.getLeaf(''), '$$x^2$$'); 
            const leaf = this.app.workspace.getLeaf("split", "horizontal");
            leaf.setViewState({
                type: "my-preview-view",
                active: true,
            });
            console.log(leaf.view); 
        });
    }
    onunload() {}
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async loadExtensions() {
        this.extensions.push([ 

        ])
    }
    async loadEditorListeners() { 
        this.app.workspace.onLayoutReady(() => { 
        });
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class EquationCiteView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }
    getViewType(): string {
        return 'equation-cite-view'; 
    }

    getDisplayText(): string {
        return "test equation"; 
    } 

    async onOpen(): Promise<void> {
        const container = this.containerEl; 
        container.empty();
        container.createEl('h4', { text: 'Example view' }); 
        return Promise.resolve(); 
    }

    async onClose(): Promise<void> {
        return Promise.resolve();
    }
}


class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        // const {contentEl} = this;
        // contentEl.empty();
        this.contentEl.empty();
    }
}
