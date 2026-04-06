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
            // Full equation with braces and tags
            textToCopy = `$$${contentWithTag}$$`;
            break;
        case "noTag":
            // Equation without tags but with braces
            textToCopy = `$$${content}$$`;
            break;
        case "eq":
            // Equation without braces and tags
            textToCopy = content;
            break;
        default:
            textToCopy = `$$${contentWithTag}$$`;
    }
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            new Notice("Equation copied to clipboard");
        })
        .catch((err) => {
            Debugger.error("Failed to copy equation:", err);
            new Notice("Failed to copy equation");
        });
}
