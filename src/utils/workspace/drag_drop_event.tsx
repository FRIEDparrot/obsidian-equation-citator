import { Editor, EditorRange, MarkdownView } from "obsidian";
import { Line, StateEffect, StateField } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate, EditorView, WidgetType, DecorationSet } from "@codemirror/view";
import Debugger from "@/debug/debugger";

/// define a drag cursor decoration
class DragCursor extends WidgetType {
    constructor() {
        super();
    }

    toDOM(): HTMLElement {
        const el = document.createElement('div');
        el.classList.add('ec-drag-cursor');
        return el;
    }
}

const setDropCursorEffect = StateEffect.define<number | null>();

export const dropCursorField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
        for (const e of tr.effects) {
            if (e.is(setDropCursorEffect)) {
                const pos = e.value;
                if (pos == null) return Decoration.none;
                const deco = Decoration.widget({
                    widget: new DragCursor(),
                    side: 1
                }).range(pos);
                return Decoration.set([deco]);
            }
        }
        return value;
    },
    provide: f => EditorView.decorations.from(f)
});

export function getEditorDropLocation(
    editor: Editor,
    evt: DragEvent,
): EditorRange | null {
    // @ts-ignore
    const cm6View = editor.cm;

    if (!cm6View) {
        return null;
    }

    const pos = cm6View.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (!pos) {
        return null;
    }

    const lineInfo = cm6View.state.doc.lineAt(pos.pos);
    const line = lineInfo.number - 1; // CM6 uses 1-based line numbers
    const ch = pos.pos - lineInfo.from;

    return {
        from: { line, ch },
        to: { line, ch }
    };
}


export function updateCursorToDragPosition(
    evt: DragEvent,
    targetView: MarkdownView
): void {
    const editor = targetView.editor;
    // @ts-ignore
    const cm6View = editor.cm;
    if (!cm6View) return;

    const pos = cm6View.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (pos === null) return;

    try {
        const lineInfo: Line = cm6View.state.doc.lineAt(pos);
        const line = lineInfo.number - 1; // CM6 uses 1-based, Editor uses 0-based
        const ch = pos - lineInfo.from;

        // Dispatch the state effect to show the drag cursor
        cm6View.dispatch({
            effects: setDropCursorEffect.of(pos)
        });

        // Also move the editor cursor for visual feedback
        editor.setCursor({ line, ch });
        editor.scrollIntoView({ from: { line, ch }, to: { line, ch } });

        Debugger.log("Updated cursor to: " + line + ":" + ch);
    }
    catch (error) {
        Debugger.error("Error updating cursor: " + error);
    }
}

export function clearDragCursor(targetView: MarkdownView): void {
    const editor = targetView.editor;
    // @ts-ignore
    const cm6View = editor.cm;
    if (!cm6View) return;

    // Clear the drag cursor decoration
    cm6View.dispatch({
        effects: setDropCursorEffect.of(null)
    });
}

