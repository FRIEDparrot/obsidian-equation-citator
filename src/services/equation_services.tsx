import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { FootNote } from "@/utils/footnote_utils";
import { splitFileCitation } from "@/utils/citation_utils";
import { EquationMatch } from "@/utils/equation_utils";

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
                    filename: this.plugin.settings.renderLocalFileName ?
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
}