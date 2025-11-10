import {
    Plugin, MarkdownView, WorkspaceLeaf,
    MarkdownPostProcessorContext
} from 'obsidian';
import { cleanUpStyles, SettingsTabView } from "@/settings/SettingsTab";
import { DEFAULT_SETTINGS } from "@/settings/defaultSettings";
import { EquationCitatorSettings } from "@/settings/defaultSettings";
import { Extension, Compartment } from '@codemirror/state';
import registerCommands from '@/commands/command_list';
import registerRibbonButton from '@/ui/ribbon';
import {
    createMathCitationExtension,
    mathCitationPostProcessor,
    calloutCitationPostProcessor,
} from '@/views/citation_render';
import { EquationCache } from '@/cache/equationCache';
import { CitationCache } from '@/cache/citationCache';
import { FootNoteCache } from '@/cache/footnoteCache';
import { ColorManager } from '@/settings/styleManagers/colorManager';
import { EquationServices } from '@/services/equation_services';
import { TagService } from '@/services/tag_service';
import { AutoCompleteSuggest } from '@/views/auto_complete_suggest';
import { registerRightClickHandler } from '@/handlers/rightButtonHandler';
import { LineHashCache } from '@/cache/lineHashCache';
import { WidgetSizeManager } from '@/settings/styleManagers/widgetSizeManager';
import { isUpdateAvailable } from './api/updateChecking';
import { EquationArrangePanel, EQUATION_MANAGE_PANEL_TYPE } from '@/ui/panels/equationManagePanel';
import Debugger from './debug/debugger';
import { dropCursorField } from '@/utils/workspace/drag_drop_event';

export default class EquationCitator extends Plugin {
    settings: EquationCitatorSettings;
    extensions: Extension[] = [];
    equationServices: EquationServices;
    tagService: TagService;

    // initialize caches
    public citationCache: CitationCache;   // citation cache instance 
    public equationCache: EquationCache;     // equation cache instance
    public footnoteCache: FootNoteCache;     // footnote cache instance
    public lineHashCache: LineHashCache;     // line hash cache instance 

    private autoCompleteSuggest: AutoCompleteSuggest;
    private mathCitationCompartment = new Compartment();
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        Debugger.debugMode = this.settings.debugMode;  // set debug mode from settings 
        this.upDateEditorExtensions();
    }
    
    async onload() {
        await this.loadSettings();
        ColorManager.updateAllColors(this.settings);
        WidgetSizeManager.updateAllSizes(this.settings);
        this.addSettingTab(new SettingsTabView(this.app, this));
        
        // initialize caches
        this.loadCaches();
        
        this.registerViews();  
        // load caches and register services class
        this.registerServices();
        
        // Register Live Preview extension and Reading Mode extension 
        // Register auto-complete suggestion widget
        this.autoCompleteSuggest = new AutoCompleteSuggest(this);

        this.loadEditorExtensions();
        this.loadReadingModeExtensions();
        this.registerEditorSuggest(this.autoCompleteSuggest);
        
        // register ribbon button and commands 
        registerRibbonButton(this);
        registerRightClickHandler(this);
        registerCommands(this);
    }

    onunload() {
        cleanUpStyles();
        this.destroyCaches();
    }
    
    loadCaches() {
        this.citationCache = new CitationCache(this);
        this.equationCache = new EquationCache(this);
        this.footnoteCache = new FootNoteCache(this);
        this.lineHashCache = new LineHashCache(this);
    }

    clearCaches() {
        this.citationCache.clear();
        this.equationCache.clear();
        this.footnoteCache.clear();
        this.lineHashCache.clear();
    }

    destroyCaches() {
        this.citationCache?.destroy();
        this.equationCache?.destroy();
        this.footnoteCache?.destroy();
        this.lineHashCache?.destroy();
    }

    registerViews(){
        this.registerView(
            EQUATION_MANAGE_PANEL_TYPE,
            (leaf: WorkspaceLeaf) => {
                return new EquationArrangePanel(this, leaf);
            }
        )
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
        );
        // Register drag cursor field for equation drag-drop visual feedback
        this.registerEditorExtension(dropCursorField);
    }

    loadReadingModeExtensions() {
        this.registerMarkdownPostProcessor(
            async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                // const isReadingMode = activeView.getMode() === "preview"; 
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView) return; 
                // also register in live preview mode to render citations in link preview  
                await mathCitationPostProcessor(this, el, ctx, this.citationCache);
                
                if (this.settings.enableCiteWithCodeBlockInCallout) {
                    // wait for the callout to be rendered 
                    await calloutCitationPostProcessor(this, el, ctx, this.citationCache);
                }
            }
        )
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.upDateEditorExtensions();
    }

    /**
     * Updates the CodeMirror editor extensions for all open views in the workspace.
     *
     * This method creates a new math citation extension using the current settings,
     * then iterates over all workspace leaves to update their CodeMirror instances
     * with the new extension. It also dispatches an empty change to trigger a refresh
     * of each editor.
     *
     * @remarks
     * - Assumes that each view's editor exposes a `cm` property referencing the CodeMirror instance.
     * - Uses a compartment to reconfigure the extension dynamically.
     */
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

    async checkForUpdates(showNotice: boolean) {
        await isUpdateAvailable(this, showNotice);
    }
}
