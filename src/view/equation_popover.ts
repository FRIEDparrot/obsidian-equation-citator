import { Plugin, MarkdownRenderer, MarkdownView, HoverPopover, WorkspaceLeaf } from "obsidian"; 
import { ChangeSpec } from "@codemirror/state";
import { MarkdownParser } from "@lezer/markdown";
import { Tooltip, showTooltip } from "@codemirror/view";
import EquationCitator from "@/main";

const changes: ChangeSpec[] = [];



function createEquationRenderer(app: App) {
    const leaf_window = app.workspace.spl
}


export class EquationRenderView extends HoverPopover {
    plugin : EquationCitator;
    content : string; 
    constructor(leaf: WorkspaceLeaf, content: string) { 
        super(leaf); 
        this.content = content; 
    }
    async onload() {} 
    async onunload() {} 
    
}