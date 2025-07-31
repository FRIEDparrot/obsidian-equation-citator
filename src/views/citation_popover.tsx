import { MarkdownRenderer } from "obsidian";
import { 
    HoverPopover,
    HoverParent,
    PopoverState,
    WorkspaceLeaf
} from "obsidian";

import { Tooltip, showTooltip } from "@codemirror/view";
import Debugger from "@/debug/debugger";

export class CitationPopover extends HoverPopover {
    tags: string[] = []; // list of tags to be cited  
    equationsMarkdown: string[] = []; // list of equations to render 

    constructor(
        parent: HoverParent,
        targetEl: HTMLElement | null,
        equationsMarkdown: string[],
        waitTime?: number
    ) {
        super(parent, targetEl, waitTime, null);
        this.equationsMarkdown = equationsMarkdown; //   list of equations to render
    }

    async onload(): Promise<void> {
        Debugger.log("load Citation Popover"); 
        await this.renderEquations(); 
    }
    async onunload(): Promise<void> {
        
    }
    async renderEquations(): Promise<void> {


    }
    setContent(content: string) {
        this.content = content;
    }
}



// export class CiteRendererPopupWidget extends WidgetType {
//     plugin: EquationCitator;
//     citePattern: RegExp;
//     mathString: string;
//     constructor(prefix: string, delimiter: string, plugin: EquationCitator) {
//         super();
//         this.plugin = plugin;
//         const escapedPrefix = escapeRegExp(plugin.settings.citePrefix);
//         this.citePattern = new RegExp(`\\$\\\\ref\\{\\s*${escapedPrefix}([^}]+)\\}[^\\s]$`, "g");
//     }

//     toDOM(view: EditorView): HTMLElement {
//         const el = document.createSpan();
//         el.setAttribute("class", "cm-math-citation");

//     }
//     eq(widget: WidgetType): boolean {

//     }
//     show() {
//         const mathEl = renderMath(this.mathString, false);

//         const mathCitationWrapper = document.createDiv();
//         mathCitationWrapper.setAttribute("class", "cm-math-citation-wrapper");
//         mathCitationWrapper.appendChild(mathEl);
//         mathCitationWrapper.onclick = (event: MouseEvent) => {
//             event.preventDefault();

//         }
//     }
// }
