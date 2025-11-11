import EquationCitator from "@/main";
import Debugger from "@/debug/debugger";
import { FootNote } from "@/utils/parsers/footnote_parser";
import { splitFileCitation } from "@/utils/core/citation_utils";
import { CalloutMatch } from "@/utils/parsers/callout_parser";

export interface RenderedCallout {
    type: string;  // type of callout (e.g., "table", "thm", "def")
    tag: string;  // tag of the callout (without prefix)
    prefix: string;  // the prefix used (e.g., "table:", "thm:")
    content: string;  // callout content
    sourcePath: string | null; // source path of the callout file
    filename: string | null;  // filename label (alias) of the callout
    footnoteIndex: string | null; // index of the footnote (if any)
    lineStart: number;  // starting line number
    lineEnd: number;  // ending line number
}

/**
 * Service class for handling callout-related operations
 * Similar to FigureServices but for callouts/quotes
 */
export class CalloutServices {
    constructor(
        private plugin: EquationCitator
    ) { }

    /**
     * Retrieves callouts by their tags from a specified source file
     * Handles both local and cross-file callout references
     * IMPORTANT: All tags must be of the same type/prefix
     *
     * @param calloutTagsAll - An array of callout tags to retrieve (e.g., ["1.1", "1.2"])
     * @param prefix - The prefix that identifies the callout type (e.g., "table:", "thm:")
     * @param sourcePath - The path of the source file where the callouts are referenced
     * @returns A promise that resolves to an array of RenderedCallout objects
     */
    public async getCalloutsByTags(
        calloutTagsAll: string[],
        prefix: string,
        sourcePath: string
    ): Promise<RenderedCallout[]> {
        Debugger.log(`getCalloutsByTags called with tags: ${JSON.stringify(calloutTagsAll)}, prefix: ${prefix}, sourcePath: ${sourcePath}`);
        const settings = this.plugin.settings;
        const footnotes = await this.plugin.footnoteCache.getFootNotesFromFile(sourcePath) || [];

        // Resolve each callout tag (handle cross-file references)
        const callouts: RenderedCallout[] = calloutTagsAll.map(tag => {
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

            // Extract type from prefix (remove trailing colon)
            const type = prefix.endsWith(':') ? prefix.slice(0, -1) : prefix;

            return {
                type,
                tag: local,
                prefix,
                content: '',  // Will be filled by fillCalloutsContent
                sourcePath: path,
                filename: filename,
                footnoteIndex: crossFile,
                lineStart: 0,  // Will be filled by fillCalloutsContent
                lineEnd: 0     // Will be filled by fillCalloutsContent
            };
        });

        const validCallouts = callouts.filter(callout => callout.sourcePath !== null);
        Debugger.log(`Created ${callouts.length} callouts, ${validCallouts.length} valid callouts`);
        if (validCallouts.length === 0) {
            Debugger.log("No valid callouts found");
            return [];
        }

        const result = await this.fillCalloutsContent(validCallouts, prefix);
        Debugger.log(`fillCalloutsContent returned ${result.length} callouts`);
        return result;
    }

    /**
     * Fill callout content by querying the calloutCache
     * Only fetches callouts that match the specified prefix
     */
    private async fillCalloutsContent(
        callouts: RenderedCallout[],
        prefix: string
    ): Promise<RenderedCallout[]> {
        // Get unique file paths
        const uniquePaths = [...new Set(callouts.map(c => c.sourcePath))].filter(p => p !== null);
        const fileCalloutsMap = new Map<string, CalloutMatch[]>();

        for (const filePath of uniquePaths) {
            if (!filePath) continue;
            const cachedCallouts = await this.plugin.calloutCache.getCalloutsForFile(filePath);
            if (cachedCallouts) {
                // Filter to only include callouts with matching prefix
                const matchingCallouts = cachedCallouts.filter(c => c.prefix === prefix);
                fileCalloutsMap.set(filePath, matchingCallouts);
            }
        }

        // Fill content for each callout
        return callouts.map(callout => {
            const fileCallouts = callout.sourcePath ? fileCalloutsMap.get(callout.sourcePath) : undefined;
            const matchedCallout = fileCallouts?.find(cached => cached.tag === callout.tag);

            Debugger.log(`Matching callout tag "${callout.tag}" - found: ${matchedCallout ? 'yes' : 'no'}, available tags: ${fileCallouts?.map(c => c.tag).join(', ') || 'none'}`);

            return {
                ...callout,
                content: matchedCallout?.raw || '', // Use raw content to include tags and title
                lineStart: matchedCallout?.lineStart || 0,
                lineEnd: matchedCallout?.lineEnd || 0
            };
        });
    }

    /**
     * Resolve cross-file reference using footnote cache
     * Returns the file path and filename for the reference
     */
    private resolveCrossFileRef(
        sourcePath: string,
        crossFileIndex: string,
        footnotes: FootNote[]
    ): { path: string | null; filename: string | null } {
        const footnote = footnotes.find(fn => fn.num === crossFileIndex);
        if (!footnote) {
            Debugger.log(`Footnote [^${crossFileIndex}] not found in ${sourcePath}`);
            return { path: null, filename: null };
        }

        const refFilePath = footnote.path;
        if (!refFilePath) {
            Debugger.log(`Footnote [^${crossFileIndex}] does not link to a file`);
            return { path: null, filename: null };
        }

        const refFile = this.plugin.app.vault.getAbstractFileByPath(refFilePath);
        if (!refFile) {
            Debugger.log(`Referenced file ${refFilePath} not found`);
            return { path: null, filename: null };
        }

        return {
            path: refFilePath,
            filename: footnote.label || refFile.name
        };
    }
}
