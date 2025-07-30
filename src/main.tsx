import {
    Plugin, loadMathJax, MarkdownView,
    MarkdownPostProcessorContext,
    Notice, TFile
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
    processPrintMarkdown,
    injectPDFStyles,
    removePDFStyles
} from '@/views/citation_render';
import { CitationCache } from '@/cache/citationCache';
import Debugger from '@/debug/debugger';


export default class EquationCitator extends Plugin {
    settings: EquationCitatorSettings;
    extensions: Extension[] = [];
    private mathCitationCompartment = new Compartment();
    private citationCache: CitationCache;   // citation cache instance 
    private observer: MutationObserver;     // observer for pdf print 

    async onload() {
        await this.loadSettings();
        this.citationCache = new CitationCache(this);

        loadMathJax();
        this.addSettingTab(new SettingsTabView(this.app, this));
        registerRibbonButton(this);
        registerCommands(this);
        // Register Live Preview extension and Reading Mode extension 
        this.loadEditorExtensions();
        this.loadReadingModeExtensions();
        this.setupPrinterInterceptor();
    }
    onunload() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.upDateEditorExtensions();
    }
    async loadEditorExtensions() {
        this.registerEditorExtension(
            this.mathCitationCompartment.of(
                createMathCitationExtension(this.settings)
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
        const newExt = createMathCitationExtension(this.settings);
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

    setupPrinterInterceptor() {
        this.registerDomEvent(window, 'beforeprint', this.handleBeforePrint.bind(this));
        this.registerDomEvent(window, 'afterprint', this.handleAfterPrint.bind(this));
    }

    /** when exporting, currentPrintFilePath must be null to avoid race condition */
    private currentPrintFilePath: string | null = null;
    private currentPrintFileContent = "";

    async handleBeforePrint() {
        if (!this.settings.enableInPdfExport) return;
        // get the current active file 
        const file = this.app.workspace.getActiveFile();
        if (!file) return;  // only allow export pdf for active file

        if (this.currentPrintFilePath != null) {
            // race exporting start, ignore this event
            this.failExportPdf("Race export condition detected, ignore exporting");
            return;
        }
        this.currentPrintFilePath = file.path;
        const originalFileContent = await this.app.vault.read(file);
        this.currentPrintFileContent = originalFileContent;    // cache the original content 
        
        new Notice("Equation Citator: pdf exporting, please not close obsidian");
        let proceededContent = originalFileContent; 
        Debugger.log("Pdf exporting, file:", file.path);
        try {
            injectPDFStyles();
            // render the markdown content with citations HTML blocks 
            proceededContent = processPrintMarkdown(originalFileContent, this.settings);
        }
        catch (error) {
            Debugger.error("Error processing markdown for print:", error);
        }
        finally {
            // await this.app.vault.modify(file, proceededContent);
            console.log("Pdf exporting, content:", proceededContent);
        }
    }

    async handleAfterPrint() {
        if (!this.settings.enableInPdfExport) return;
        if (!this.currentPrintFilePath) return;  // ignore if not start exporting pdf  

        // in all case, write back the original content  
        try {
            // Remove PDF-specific styles
            removePDFStyles(); 
            // in all case, write back the original content  
            const file_origin = this.app.vault.getAbstractFileByPath(this.currentPrintFilePath);
            if (!file_origin || !(file_origin instanceof TFile)) {
                console.log("Pdf exporting, file not found:", this.currentPrintFilePath)
                return;  // file not found, ignore 
            }
            await this.app.vault.modify(file_origin, this.currentPrintFileContent);
        } catch (error) {
            Debugger.error("Error restoring file after print:", error); 
            new Notice("Error restoring file. Turn on debug mode for more details.");
        } finally {
            this.currentPrintFilePath = null;  // reset the cache
            this.currentPrintFileContent = "";
        }
    }

    failExportPdf(error: string) {
        new Notice("Equation Citator: failed to render citation, turn on debug mode for details");
        Debugger.error("Failed to render citation in pdf:", error);
    }
}
