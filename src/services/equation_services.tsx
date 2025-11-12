import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { FootNote } from "@/utils/parsers/footnote_parser";
import { splitFileCitation } from "@/utils/core/citation_utils";
import { EquationMatch } from "@/utils/parsers/equation_parser";
import { MarkdownView } from "obsidian";
import { createEquationTagString } from "@/utils/string_processing/regexp_utils";

export interface RenderedEquation {
    tag: string;  // tag of the equation 
    md: string;   // markdown equation content 
    sourcePath: string | null; // source path of the equation file (if no valid footnote, its null) 
    filename: string | null;  // filename label (alias) of the equation
    footnoteIndex: string | null; // index of the footnote (if any)
}

/** 
 * Common class processing logic for equation files.
 * 
 * Services class need plugin instance to access settings and cache data, 
 *   and provide common functions for equation files. 
 */
export class EquationServices {
    constructor(
        private plugin: EquationCitator
    ) { }

    /**
     * Retrieves equations by their tags from a specified source file. 
     * Used in rename tags 
     * 
     * This method processes both local and cross-file equation references based on plugin settings.
     * For cross-file references, it resolves the actual file path using footnotes.
     * It filters out invalid equations and fills in the equation content for valid ones.
     * 
     * @param eqNumbersAll - An array of equation tags to retrieve
     * @param sourcePath - The path of the source file where the equations are referenced
     * @returns A promise that resolves to an array of RenderedEquation objects containing equation details
     * 
     * @remarks
     * - Uses footnote information to resolve cross-file references when enabled in settings
     * - Filters out equations with invalid source paths
     * - Populates equation content by matching tags with cached equation data
     * - Returns an empty array if no valid equations are found
     */
    public async getEquationsByTags(eqNumbersAll: string[], sourcePath: string): Promise<RenderedEquation[]> {
        const settings = this.plugin.settings;
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(sourcePath);

        const equations: RenderedEquation[] = eqNumbersAll.map(tag => {
            const { local, crossFile } = settings.enableCrossFileCitation
                ? splitFileCitation(tag, settings.fileCiteDelimiter)
                : { local: tag, crossFile: null };

            const { path, filename } = crossFile
                ? this.resolveCrossFileRef(sourcePath, crossFile, footnotes)
                : {
                    path: sourcePath,
                    filename: this.plugin.settings.enableRenderLocalFileName ?
                        this.plugin.app.workspace.getActiveFile()?.name || null : null
                };
            return {
                tag: local,
                md: "",
                sourcePath: path,
                filename: filename,
                footnoteIndex: crossFile
            };
        });
        const validEquations = equations.filter(eq => eq.sourcePath !== null);
        if (validEquations.length === 0) {
            Debugger.log("No valid equations found");
            return [];
        }
        return this.fillEquationsContent(validEquations);
    }

    private async fillEquationsContent(equations: RenderedEquation[]): Promise<RenderedEquation[]> {
        // filter out duplicate file paths 
        const uniquePaths = [...new Set(equations.map(eq => eq.sourcePath))].filter(p => p !== null);
        const fileEquationsMap = new Map<string, EquationMatch[]>();
        for (const filePath of uniquePaths) {
            if (!filePath) continue;
            const eqs = await this.plugin.equationCache.getEquationsForFile(filePath);
            if (eqs) {
                fileEquationsMap.set(filePath, eqs);
            }
        }
        // fill content for each equation
        return equations.map(eq => {
            const fileEquations = eq.sourcePath ? fileEquationsMap.get(eq.sourcePath) : undefined;
            const matchedEquation = fileEquations?.find(cached => cached.tag === eq.tag);
            return {
                ...eq,
                md: matchedEquation?.raw || "",
            };
        });
    }

    public async getEquationsForAutocomplete(tag: string, sourcePath: string): Promise<RenderedEquation[]> {
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(sourcePath);
        const { local, crossFile } = this.plugin.settings.enableCrossFileCitation ?
            splitFileCitation(tag, this.plugin.settings.fileCiteDelimiter) :
            { local: tag, crossFile: null };

        const { path, filename } = crossFile !== null ?
            this.resolveCrossFileRef(sourcePath, crossFile, footnotes) :
            { path: sourcePath, filename: this.plugin.app.workspace.getActiveFile()?.name || null };

        if (!path) return [];

        const equationsAll = await this.plugin.equationCache.getEquationsForFile(path);
        const equations = equationsAll?.filter(eq => eq.tag && eq.tag.startsWith(local)) || [];
        if (equations.length === 0) return [];

        return equations.map(eq => ({
            tag: eq.tag,
            md: eq.raw,
            sourcePath: path,
            filename,
            footnoteIndex: crossFile
        }) as RenderedEquation);
    }

    private resolveCrossFileRef(sourcePath: string, crossFile: string, footnotes: FootNote[] | undefined) {
        const match = footnotes?.find(f => f.num === crossFile);
        if (!match?.path) return { path: null, filename: null };
        const file = this.plugin.app.metadataCache.getFirstLinkpathDest(match.path, sourcePath);
        if (!file) {
            Debugger.log("Invalid footnote file path: ", match.path);
            return { path: null, filename: null };
        }

        return { path: file.path, filename: match.label || null };
    }

    /**
     * Adds a tag to an equation at a specific line range in a file
     * @param filePath - The path of the file containing the equation
     * @param lineStart - The starting line number of the equation
     * @param lineEnd - The ending line number of the equation
     * @param tag - The tag to add (without \tag{} wrapper)
     * @returns true if successful, false otherwise
     */
    public addTagToEquation(filePath: string, lineStart: number, lineEnd: number, tag: string): boolean {
        // Find the MarkdownView for this file
        const view = this.getMarkdownViewByPath(filePath);
        if (!view?.editor) {
            Debugger.log("Cannot find editor for file: ", filePath);
            return false;
        }

        const editor = view.editor;
        const tagString = createEquationTagString(tag, this.plugin.settings.enableTypstMode);

        // Read the equation lines
        const equationLines: string[] = [];
        for (let i = lineStart; i <= lineEnd; i++) {
            equationLines.push(editor.getLine(i));
        }

        // Handle single-line vs multi-line equations
        if (lineStart === lineEnd) {
            // Single-line equation: $$ content $$
            const line = equationLines[0];
            // Insert tag before the closing $$
            const closingIndex = line.lastIndexOf('$$');
            if (closingIndex === -1) {
                Debugger.log("Cannot find closing $$ in single-line equation");
                return false;
            }

            const newLine = line.slice(0, closingIndex).trimEnd() + ' ' + tagString + ' ' + line.slice(closingIndex);
            editor.replaceRange(
                newLine,
                { line: lineStart, ch: 0 },
                { line: lineStart, ch: line.length }
            );
        } else {
            // Multi-line equation: find the line before $$
            const lastLineIndex = equationLines.length - 1;
            const lastLine = equationLines[lastLineIndex];

            // Insert tag on the line before the closing $$
            if (lastLine.trim() === '$$') {
                // Tag goes on the previous line
                const tagLineIndex = lineStart + lastLineIndex - 1;
                const tagLine = editor.getLine(tagLineIndex);
                const newTagLine = tagLine.trimEnd() + ' ' + tagString;
                editor.replaceRange(
                    newTagLine,
                    { line: tagLineIndex, ch: 0 },
                    { line: tagLineIndex, ch: tagLine.length }
                );
            } else {
                Debugger.log("Multi-line equation does not have proper closing $$");
                return false;
            }
        }

        return true;
    }

    /**
     * Gets the MarkdownView for a file by its path
     * @param filePath - The path of the file
     * @returns The MarkdownView if found, null otherwise
     */
    private getMarkdownViewByPath(filePath: string): MarkdownView | null {
        const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            if (view.file?.path === filePath) {
                return view;
            }
        }
        return null;
    }
}