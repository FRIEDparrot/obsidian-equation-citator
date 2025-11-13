import { Setting } from "obsidian";


/**
 * 
 * @param setting 
 * @param initVal 
 * @param onToggleChange 
 * @param subPanelCreationCallback 
 * @param reverse 
 * @param insertAfter 
 * @param renderPanel when set to false, the option is used as a common toggle without subpanels 
 */
export function addSubPanelToggle(
    setting: Setting,
    initVal: boolean,
    onToggleChange: (value: boolean) => Promise<void>,
    subPanelCreationCallback: (panel: HTMLElement) => void,
    renderPanel = true, // optional: render subpanel initially 
    reverse = false,
    insertAfter = true, // optional: place subpanel after settingEl
) {
    let subPanel : HTMLElement| null = null;
    
    setting.setClass("ec-settings-subpanel-toggle");
    setting.addToggle((toggle) => {
        const parent = setting.settingEl.parentElement;
        const createSubPanel = (value: boolean) => {
            if (renderPanel && value && parent && !subPanel) {
                subPanel = document.createElement("div");
                subPanel.classList.add("ec-settings-subpanel");
                if (insertAfter) {
                    parent.insertBefore(subPanel, setting.settingEl.nextSibling);
                } else {
                    parent.insertBefore(subPanel, setting.settingEl);
                }
                subPanelCreationCallback(subPanel);
            }
            else if (subPanel) {
                subPanel.remove();
                subPanel = null;
            }
        };
        // Set initial toggle value
        toggle.setValue(initVal);
        // **Render initial subpanel state**
        createSubPanel(reverse ? !initVal : initVal);
        toggle.onChange((value) => {
            // call the callback function 
            onToggleChange(value);
            const display = reverse ? !value : value;
            createSubPanel(display);
        });
    });
}
