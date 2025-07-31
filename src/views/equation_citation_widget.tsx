import { EditorView,  WidgetType} from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { HoverParent, WorkspaceLeaf} from "obsidian";
import { renderEquationCitation } from "@/views/citation_render";
import { EquationCitatorSettings } from "@/settings/settingsTab";
import { CitationPopover } from "@/views/citation_popover"; 
import EquationCitator from "@/main";

export class EquationCitationWidget extends WidgetType {
    public citeEquationTags: string[];
    constructor(
        citeEquationTags: string[],
        public range: { from: number; to: number },
        private settings: EquationCitatorSettings
    ) {
        super();
        this.citeEquationTags = citeEquationTags.map(t => t.trim());
    }

    eq(other: EquationCitationWidget) {
        return this.citeEquationTags === other.citeEquationTags &&
            this.range.from === other.range.from &&
            this.range.to === other.range.to;
    }

    toDOM(view: EditorView): HTMLElement {
        const el = renderEquationCitation(this.citeEquationTags, this.settings, true);

        // Add interactive behavior for Live Preview mode
        el.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const setSelectionRange = (view: EditorView, from: number, to: number) => {
                view.dispatch({
                    selection: EditorSelection.range(from, to)
                });
            };
            view.focus();
            setSelectionRange(view, this.range.from, this.range.to);
        });

        el.addEventListener('mouseenter', (event) => {
            const ctrlKey = event.ctrlKey || event.metaKey; 
            if (ctrlKey) {
                event.preventDefault();
                event.stopPropagation();
            }
        })

        return el;
    }

    ignoreEvent() {
        return false;
    }
}


// export class EquationCitationWidget extends WidgetType {
//     private plugin: EquationCitator;
//     private view: EditorView; 
//     private settings: EquationCitatorSettings;
//     public citeEquationTags: string[] = [];
//     private renderedTags: RenderedCitationTag[] = [];

//     private popover: CitationPopover | null = null;
//     private isCtrlPressed = false; 

//     constructor(
//         plugin: EquationCitator,
//         citeEquationTags: string[],
//         public range: { from: number; to: number }
//     ) {
//         super();
//         this.plugin = plugin;
//         this.settings = plugin.settings;
//         // this.citeEquationTags = citeEquationTags.map(t => t.trim());
//         this.renderedTags = citeEquationTags.map(
//             (tag) => this.settings.enableCrossFileCitation ?
//                 splitFileCitation(tag, this.settings.fileCiteDelimiter) :
//                 { local: tag, crossFile: null }
//         );
//     }
//     eq(other: EquationCitationWidget) {
//         return this.renderedTags === other.renderedTags &&
//             this.range.from === other.range.from &&
//             this.range.to === other.range.to;
//     }
    
//     // view is the editor view to create the widget in  
//     toDOM(view: EditorView): HTMLElement {
//         const el = renderEquationCitation(this.citeEquationTags, this.settings, true);

//         // Add interactive behavior for Live Preview mode
//         el.addEventListener('pointerdown', (event) => {
//             event.preventDefault();
//             event.stopPropagation();
//             const setSelectionRange = (view: EditorView, from: number, to: number) => {
//                 view.dispatch({
//                     selection: EditorSelection.range(from, to)
//                 });
//             };
//             view.focus();
//             setSelectionRange(view, this.range.from, this.range.to);
//         });

//         // // Show popover when hover with ctrl key pressed 
//         // el.addEventListener('keydown', async (event) => {
//         //     // may be other key pressed, so use last keydown event  
//         //     const ctrlKey = event.ctrlKey || event.metaKey;
//         //     if (ctrlKey && !this.isCtrlPressed) {
//         //         this.isCtrlPressed = true;
//         //         await this.showEquationPopover(el, event);
//         //     }
//         // })

//         // el.addEventListener('keyup', (event) => {
//         //     if (!(event.ctrlKey || event.metaKey) && this.isCtrlPressed) {
//         //         this.isCtrlPressed = false;
//         //         this.hideEquationPopover();
//         //     }
//         // });
//         // // also render when mouse enter with ctrl key pressed 
//         // el.addEventListener('mouseenter', async (event) => {
//         //     this.isCtrlPressed = event.ctrlKey || event.metaKey;
//         //     if (this.isCtrlPressed) {
//         //         event.preventDefault();
//         //         event.stopPropagation();
//         //         await this.showEquationPopover(el, event);
//         //     }
//         // })
//         // // consider the case mouse leave to popover, not hide it immediately  
//         // el.addEventListener('mouseleave', (event) => {
//         //     setTimeout(() => {
//         //         if (this.popover && !this.isMouseOverPopover(event)) {
//         //             this.hideEquationPopover();
//         //         }
//         //     }, 100);
//         // });
//         return el;
//     }

//     // private async showEquationPopover(el: HTMLElement, event: KeyboardEvent | MouseEvent): Promise<void> {
//     //     if (this.popover) {
//     //         this.hideEquationPopover();
//     //     }
//     //     // NOW : only show preview of equations in current file, not cross-file references 
//     //     try {
//     //         const sourcePath = this.plugin.app.workspace.activeEditor?.file?.path;
//     //         if (!sourcePath) return;

//     //         const equationsAll = await this.plugin.equationCache.getEquationsForFile(sourcePath);
//     //         if (!equationsAll) return;

//     //         const equationsMarkdown = this.renderedTags
//     //             .filter(tag => !tag.crossFile)
//     //             .map(tag => equationsAll.find(eq => eq.content === tag.local)?.raw)
//     //             .filter((raw): raw is string => !!raw);  // keep only valid equations 
//     //         if (equationsMarkdown.length === 0) return;
//     //         const leaf = this.getActiveLeaf() as HoverParent|null; 
//     //         if (!leaf) {
//     //             // only output messages when in debug mode 
//     //             Debugger.error("Failed to get active leaf for equation popover.");
//     //             return; 
//     //         }
//     //         this.popover = new CitationPopover(leaf, el, equationsMarkdown, 200);
//     //         await this.popover.onload();  // show the equation popover to render the equation preview  
//     //     }
//     //     catch (error) {
//     //         new Notice("Failed to load equation data from cache.");
//     //         Debugger.error("Error in showEquationPopover:", error)
//     //     }
//     // }

//     // private async hideEquationPopover() {
//     //     if (this.popover) {
//     //         await this.popover.onunload();  // hide the equation popover to remove the equation preview 
//     //         this.popover = null;
//     //     }
//     // }

//     // private getActiveLeaf(): WorkspaceLeaf | null {
//     //     const mdView = this.view.state.field(editorInfoField, false) as MarkdownView | undefined;
//     //     if (mdView && mdView.leaf) {
//     //         return mdView.leaf;
//     //     }
//     //     return this.plugin.app.workspace.getMostRecentLeaf(); // fallback to most recent leaf  
//     // } 

//     // private isMouseOverPopover(event: MouseEvent): boolean {
//     //     if (!this.popover) return false;
//     //     const rect = this.popover.getBoundingClientRect();
//     //     return (
//     //         event.clientX >= rect.left &&
//     //         event.clientX <= rect.right &&
//     //         event.clientY >= rect.top &&
//     //         event.clientY <= rect.bottom
//     //     );
//     // }

//     ignoreEvent() {
//         return false;
//     }
// }
