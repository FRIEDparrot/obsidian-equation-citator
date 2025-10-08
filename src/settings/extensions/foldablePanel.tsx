import { setIcon } from "obsidian";

export function createFoldablePanel(
    containerEl: HTMLElement,
    title: string,
    renderCallback: (panelEl: HTMLElement) => void,
    defaultOpenState = true,
) {
    let openState = defaultOpenState;
    // Title bar
    const titleEl = containerEl.createEl("div", {
        text: title,
        cls: "ec-settings-title ec-concise-title"
    });

    // Fold icon
    const iconEl = titleEl.createDiv({ cls: "ec-settings-icon" });
    setIcon(iconEl, openState ? 'chevron-down' : 'chevron-right');

    // create panel element 
    const panelEl = containerEl.createDiv({ cls: "ec-settings-panel" }); 
    const renderPanel = () => {
        panelEl.empty();
        if (openState) {
            renderCallback(panelEl);
        }
        setIcon(iconEl, openState ? 'chevron-down' : 'chevron-right');
    };

    renderPanel();

    // Toggle behavior
    iconEl.onclick = () => {
        openState = !openState;
        
        renderPanel();
    };

    return { titleEl, panelEl };
}
