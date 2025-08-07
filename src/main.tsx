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
import { ColorManager } from '@/settings/colorManager';
import { EquationServices } from '@/services/equation_services';
import { TagService } from '@/services/tag_service';
import { AutoCompleteSuggest } from '@/views/auto_completete_suggest';
import { registerRightClickMenu } from '@/ui/rightButtonMenu';


export default class EquationCitator extends Plugin {
    settings: EquationCitatorSettings;
    extensions: Extension[] = [];
    equationServices: EquationServices;
    tagService: TagService;

    // initialize caches
    public citationCache: CitationCache;   // citation cache instance 
    public equationCache: EquationCache;     // equation cache instance
    public footnoteCache: FootNoteCache;     // footnote cache instance

    private autoCompleteSuggest: AutoCompleteSuggest;
    private mathCitationCompartment = new Compartment();

    async onload() {
        await this.loadSettings();
        ColorManager.updateAllColors(this.settings);
        this.addSettingTab(new SettingsTabView(this.app, this));
        // initialize caches
        this.citationCache = new CitationCache(this);
        this.equationCache = new EquationCache(this);
        this.footnoteCache = new FootNoteCache(this);

        // load caches and register services class 
        this.loadCaches();
        this.registerServices();
        
        // Register Live Preview extension and Reading Mode extension 
        this.loadEditorExtensions();
        this.loadReadingModeExtensions();

        // Register auto-complete suggestion widget
        this.autoCompleteSuggest = new AutoCompleteSuggest(this);
        this.registerEditorSuggest(this.autoCompleteSuggest);

        // register ribbon button and commands 
        registerRibbonButton(this);
        registerRightClickMenu(this);
        registerCommands(this);
    }

    onunload() {
        this.citationCache?.destroy();
        this.equationCache?.destroy();
        this.footnoteCache?.destroy();
        ColorManager.cleanup(); // remove the style element 
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.upDateEditorExtensions();
    }

    loadCaches() { 
        this.citationCache = new CitationCache(this);
        this.equationCache = new EquationCache(this);
        this.footnoteCache = new FootNoteCache(this); 
    }

    registerServices() {
        // sheared services instance  
        this.equationServices = new EquationServices(this);
        this.tagService = new TagService(this);
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
                await mathCitationPostProcessor(this, el, ctx, this.citationCache);
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
