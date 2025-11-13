import { Editor,  MarkdownView } from "obsidian";
import { Line, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, DecorationSet } from "@codemirror/view";

const setDropCursorEffect = StateEffect.define<number | null>();

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

export const dropCursorField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
        for (const e of tr.effects) {
            if (e.is(setDropCursorEffect)) {
                const pos = e.value;
                if (pos === null) return Decoration.none;
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

export function clearDragCursor(targetView: MarkdownView): void {
    const editor = targetView.editor;
    // @ts-expect-error editor.cm exists
    const cm6View = editor.cm;
    if (!cm6View) return;

    // Clear the drag cursor decoration
    cm6View.dispatch({
        effects: setDropCursorEffect.of(null)
    });
}

export function getEditorDropLocation(
    editor: Editor,
    evt: DragEvent,
): { line: number, ch: number } | null {
    // @ts-expect-error editor.cm exists

    const cm6View = editor.cm;
    if (!cm6View) return null;

    const pos = cm6View.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (pos === null) return null;

    const lineInfo: Line = cm6View.state.doc.lineAt(pos); 
    const line = lineInfo.number - 1; // CM6 uses 1-based line numbers
    const ch = pos - lineInfo.from;

    return { line, ch };
}

let lastDropPos: number | null = null;
export function drawCursorAtDragPosition(
    evt: DragEvent,
    targetView: MarkdownView
): void {
    const editor = targetView.editor;
    // @ts-expect-error editor.cm exists

    const cm6View = editor.cm;
    if (!cm6View) return;

    const pos = cm6View.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (pos === null || pos === lastDropPos) return;

    lastDropPos = pos;
    cm6View.dispatch({
        // use a common effect for the drag effect to render. 
        effects: setDropCursorEffect.of(pos)
    });
}

