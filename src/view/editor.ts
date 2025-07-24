import { Editor } from "obsidian";
import { EditorState } from "@codemirror/state"; 
import { EditorView, keymap } from "@codemirror/view"; 
import { syntaxTree } from "@codemirror/language"; 


export function getEquationNumber(eqn:  string) {
    const match = /tag\{([A-Za-z0-9-.]+)\}/.exec(eqn);  
    if (match && match[1]) {
        return match[1];
    }
}

export function showSyntaxTree(state: EditorState) {
    const tree = syntaxTree(state); 
    tree.iterate({
        enter: (node) => {
            console.log(
                "Node:",
                node.type.name,
                "from",
                node.from,
                "to",
                node.to,
                "text:",
                state.sliceDoc(node.from, node.to)
            );
        }
    });
}

export class ContextDetector {
    state: EditorState;
    
}