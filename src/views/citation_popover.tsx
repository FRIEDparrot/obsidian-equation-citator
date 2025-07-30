import {HoverPopover,
        HoverParent,
        PopoverState,
        WorkspaceLeaf } from "obsidian"; 
import { ChangeSpec } from "@codemirror/state";
import { MarkdownParser } from "@lezer/markdown";
import { Tooltip, showTooltip } from "@codemirror/view";
import EquationCitator from "@/main";

const changes: ChangeSpec[] = [];

export class EquationPopover extends HoverPopover {
    plugin : EquationCitator;
    equations: string[] = []; 
    constructor(parent: HoverParent, 
                targetEl: HTMLElement | null, 
                waitTime?: number) 
                { 
                    super(parent, targetEl, waitTime, null);  
                }
    
    async onload(): void {
    }
    async onunload(): void {
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
