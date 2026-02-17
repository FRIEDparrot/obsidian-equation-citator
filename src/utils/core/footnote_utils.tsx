import Debugger from "@/debug/debugger";
import EquationCitator from "@/main";
import { Notice, normalizePath } from "obsidian";


/**
 * Check if a footnote that referencing the source file already exists in the target file,
 * 
 * create a new footnote if it doesn't exist and creation is requested
 * 
 * @param plugin - The EquationCitator plugin instance
 * @param targetFilePath - The target file path where the footnote will be searched or created
 * @param sourceFilePath - The source file path that is referenced by the footnote
 * @param createIfNotExist - Whether to create a new footnote if it doesn't exist, defaults to false
 * @returns Returns the existing footnote number or the newly created footnote number, 
 *          or null if not found and not created
 */
export async function checkFootnoteExists(
    plugin: EquationCitator,
    targetFilePath: string, 
    sourceFilePath: string,
    createIfNotExist = false,
): Promise < string | null > {
    const normalizedTargetPath = normalizePath(targetFilePath);
    const normalizedSourcePath = normalizePath(sourceFilePath);
    
    // Get existing footnotes in target file
    const existingFootnotes = await plugin.footnoteCache.getFootNotesFromFile(normalizedTargetPath);
    if (!existingFootnotes) return null; 
    
    // Check if footnote for this source file already exists
    const existingFootnote = existingFootnotes.find((fn) => {
        if(!fn?.path) return false;
        const file = plugin.app.metadataCache.getFirstLinkpathDest(fn.path, normalizedTargetPath);
        return file?.path === normalizedSourcePath;
    });
    if(existingFootnote) {
        return existingFootnote.num;
    }

    // Need to create a new footnote
    if (!createIfNotExist) return null;
    const sourceFile = plugin.app.vault.getAbstractFileByPath(normalizedSourcePath);
    if(!sourceFile) return null;

    // Find next available footnote number
    const maxNum = existingFootnotes?.reduce((max, fn) => {
        const num = Number.parseInt(fn.num);
        return Number.isNaN(num) ? max : Math.max(max, num);
    }, 0) || 0;
    const newNum = (maxNum + 1).toString();

    if (Number.isNaN(maxNum)) {
        new Notice("Invalid footnote number");
        Debugger.error(`Invalid footnote number: ${maxNum}, existing Footnotes are : ${JSON.stringify(existingFootnotes)}`);
        return null;
    }

    // Append footnote to target file
    const targetFileContent = await plugin.app.vault.adapter.read(normalizedTargetPath);
    const footnoteText = `[^${newNum}]: [[${normalizedSourcePath}]]`;
    
    const delm = targetFileContent.endsWith("\n") ? "\n" : "\n\n";
    
    const newContent = targetFileContent + delm + footnoteText;
    await plugin.app.vault.adapter.write(normalizedTargetPath, newContent);

    // Refresh cache
    await plugin.footnoteCache.updateFileFootnotes(normalizedTargetPath);

    return newNum;
}