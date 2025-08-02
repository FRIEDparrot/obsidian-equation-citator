import {
    Plugin, MarkdownView,
    MarkdownPostProcessorContext
} from 'obsidian';
import {
    EquationCitatorSettings,
    DEFAULT_SETTINGS,
    SettingsTabView
} from '@/settings/settingsTab';
import { Extension, Compartment } from '@codemirror/state';
import registerCommands from '@/commands/command_list';
import registerRibbonButton from '@/ui/ribbon';
import {
    createMathCitationExtension,
    mathCitationPostProcessor,
} from '@/views/citation_render';
import { EquationCache } from '@/cache/equationCache';
import { CitationCache } from '@/cache/citationCache';
import { FootNoteCache } from '@/cache/footnoteCache';

export default class EquationCitator extends Plugin {
    settings: EquationCitatorSettings;
    extensions: Extension[] = [];
    
    // initialize caches
    public citationCache: CitationCache;   // citation cache instance 
    public equationCache: EquationCache;     // equation cache instance
    public footnoteCache: FootNoteCache;     // footnote cache instance
    
    private mathCitationCompartment = new Compartment();
    private observer: MutationObserver;     // observer for pdf print 

    async onload() {
        await this.loadSettings();
        // initialize caches
        this.citationCache = new CitationCache(this);
        this.equationCache = new EquationCache(this);
        this.footnoteCache = new FootNoteCache(this);
        this.addSettingTab(new SettingsTabView(this.app, this));
        registerRibbonButton(this);
        registerCommands(this);
        // Register Live Preview extension and Reading Mode extension 
        this.loadEditorExtensions();
        this.loadReadingModeExtensions();
    }
    
    onunload() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.citationCache?.destroy();
        this.equationCache?.destroy();
        this.footnoteCache?.destroy();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.upDateEditorExtensions();
    }
    async loadEditorExtensions() {
        this.registerEditorExtension(
            this.mathCitationCompartment.of(
                createMathCitationExtension(this)
            )
        )
    }
    loadReadingModeExtensions() {
        this.registerMarkdownPostProcessor(
            async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView) return;
                const isReadingMode = activeView.getMode() === "preview";
                // only update the post processor in reading mode 
                if (!isReadingMode) return;
                await mathCitationPostProcessor(el, ctx, this.citationCache, this.settings);
            }
        )
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.upDateEditorExtensions();
    }
    upDateEditorExtensions() {
        // create a new extension with the new settings
        const newExt = createMathCitationExtension(this);
        // iterate over all the views and update the extensions  
        this.app.workspace.iterateAllLeaves((leaf) => {
            const view = leaf.view;
            // @ts-ignore
            const cm = view?.editor?.cm; // get the CodeMirror instance 
            if (cm && !cm.state.destroyed) {
                // reload the extension for each view 
                cm.dispatch({
                    effects: this.mathCitationCompartment.reconfigure(newExt)
                });
                cm.dispatch({
                    // empty opertion, for trigger a refresh of the editor 
                    changes: { from: 0, to: 0, insert: "" }
                });
            }
        });
    }

    /** when exporting, currentPrintFilePath must be null to avoid race condition */
    private currentPrintFilePath: string | null = null;
    private currentPrintFileContent = "";

}
