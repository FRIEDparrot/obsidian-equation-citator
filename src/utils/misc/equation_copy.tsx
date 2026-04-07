import { Notice } from "obsidian";
import Debugger from "@/debug/debugger";

/**
 * Copy equation to clipboard based on the copy type setting
 * @param contentWithTag - The equation content with tag
 * @param content - The equation content without tag
 * @param copyType - The copy type from settings
 */
export function copyEquationToClipboard(
    contentWithTag: string,
    content: string,
    copyType: "full" | "noTag" | "eq"
): void {
    let textToCopy = "";

    switch (copyType) {
        case "full":
            textToCopy = `$$${contentWithTag}$$`;
            break;
        case "noTag":
            textToCopy = `$$${content}$$`;
            break;
        case "eq":
            textToCopy = content;
            break;
        default:
            textToCopy = `$$${contentWithTag}$$`;
    }

    // Try navigator.clipboard (async, may be unavailable in some contexts)
    try {
        const cb = navigator?.clipboard;
        if (!cb?.writeText) throw new Error("navigator.clipboard.writeText unavailable");

        cb.writeText(textToCopy)
            .then(() => new Notice("Equation copied to clipboard"))
            .catch((err) => {
                Debugger.error("Failed to copy equation:", err);
                new Notice("Failed to copy equation");
            });
    } catch (err) {
        Debugger.error("Failed to copy equation (sync):", err);
        new Notice("Failed to copy equation");
    }
}
