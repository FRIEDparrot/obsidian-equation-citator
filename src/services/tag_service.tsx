import EquationCitator from "@/main";
import { FootNote } from "@/utils/footnote_utils";
import { resolveBackLinks } from "@/utils/link_utils";
import { TFile, Editor } from "obsidian";
import { CitationRef, combineContinuousCitationTags, parseCitationsInMarkdown, splitContinuousCitationTags } from "@/utils/citation_utils";

export interface TagRenamePair {
    oldTag: string;
    newTag: string;
}

export class TagService {
    constructor(
        private plugin: EquationCitator
    ) { }

    public async checkRepeatedTags(
        sourceFile: string,
        pairs: TagRenamePair[]
    ): Promise<boolean> {
        const file = this.plugin.app.vault.getAbstractFileByPath(sourceFile);
        if (!(file instanceof TFile)) {
            return false;
        }

        const effectivePairs = pairs.filter(pair => pair.oldTag !== pair.newTag);
        if (effectivePairs.length === 0) {
            return false; 
        }

        // check all new tag Names 
        const newTagNames = new Set(effectivePairs.filter((p) => p.oldTag !== p.newTag).map(p => p.newTag));
        const hasRepeatedInCurrentFile = await this.checkRepeatedTagsInFile(sourceFile, newTagNames);
        if (hasRepeatedInCurrentFile) {
            return true;
        }

        const linksAll = this.plugin.app.metadataCache.resolvedLinks;
        const backLinks = resolveBackLinks(linksAll, sourceFile);
        const fileCiteDelimiter = this.plugin.settings.fileCiteDelimiter || "^";
        for (const backLinkPath of backLinks) {
            const footNotes: FootNote[] | undefined = await this.plugin.footnoteCache.getFootNotesFromFile(backLinkPath);
            if (!footNotes) {
                continue;
            }
            const currentFootNoteNums = footNotes
                .filter((ft) => {
                    const dstFile = this.plugin.app.metadataCache.getFirstLinkpathDest(ft.path, sourceFile);
                    if (!(dstFile instanceof TFile)) {
                        return false;
                    }
                    return dstFile.path === sourceFile
                })
                .map((ft) => ft.num);
            if (currentFootNoteNums.length === 0) {
                continue;
            }

            // create a set of cross file citations 
            const crossFileNewTags = new Set<string>();
            effectivePairs.forEach(pair => {
                for (const num of currentFootNoteNums) {
                    const newCrossFileTag = `${num}${fileCiteDelimiter}${pair.newTag}`;
                    crossFileNewTags.add(newCrossFileTag);
                }
            });
            // check for repeated cross file citations in backlink file  
            const hasRepeatedInBackLink = await this.checkRepeatedTagsInFile(backLinkPath, crossFileNewTags);
            if (hasRepeatedInBackLink) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Checks if there are any tags in the specified file that duplicate the given set of target tags
     * @param filePath Path to the file
     * @param targetTags Set of target tags to check against
     * @returns Promise<boolean> - returns true if a duplicate exists
     */
    private async checkRepeatedTagsInFile(
        filePath: string,
        targetTags: Set<string>
    ): Promise<boolean> {
        const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) {
            return false;
        }

        const fileContent = await this.plugin.app.vault.read(file);
        const prefix = this.plugin.settings.citationPrefix || "eq:";

        // Parse all citations in the file
        const citationsAll: CitationRef[] = parseCitationsInMarkdown(fileContent)
            .filter(c => c.label.startsWith(prefix));

        if (citationsAll.length === 0) {
            return false;
        }

        // Get separator configurations
        const multiEqDelimiter = this.plugin.settings.multiCitationDelimiter || ",";
        const rangeSymbol = this.plugin.settings.continuousRangeSymbol || "~";
        const citeDelimiters = this.plugin.settings.continuousDelimiters.split(" ") || ["-", ".", ":", "\\_"];
        const fileDelimiter = this.plugin.settings.fileCiteDelimiter || "^";

        // Collect all existing tags from the file
        const existingTags = new Set<string>();

        for (const citation of citationsAll) {
            // Get all tags in the citation group
            const citations = citation.label.substring(prefix.length)
                .split(multiEqDelimiter)
                .map(t => t.trim());

            // Split continuous citation tags into discrete tags
            const splittedCitations = splitContinuousCitationTags(
                citations, rangeSymbol, citeDelimiters, fileDelimiter
            ) as string[];

            // Add to existing tags set
            splittedCitations.forEach(tag => existingTags.add(tag));
        }

        // Check for duplicates
        for (const targetTag of targetTags) {
            if (existingTags.has(targetTag)) {
                return true; // Duplicate tag found
            }
        }

        return false;
    }

    /**
     * rename tag in current file and its backlinks 
     * @param sourceFile 
     * @param pairs 
     * @param deleteRepeatCitations 
     * @param deleteUnusedCitations 
     * @returns 
     */
    public async renameTags(
        sourceFile: string,
        pairs: TagRenamePair[],
        deleteRepeatCitations = false,
        deleteUnusedCitations = false,
        editor?: Editor  // optional current editor instance, prevent lose focus of cursor 
    ): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(sourceFile);
        if (!(file instanceof TFile)) {
            return;
        }
        // no need to rename if old tag is the same as new tag  
        const effectivePairs = pairs.filter(pair => pair.oldTag !== pair.newTag);
        if (effectivePairs.length === 0) {
            return;  // no effective pairs, do nothing 
        }
        /********  update the citation in current file  ********/
        const currentFileTagMapping = new Map<string, string>();
        effectivePairs.forEach(pair => {
            currentFileTagMapping.set(pair.oldTag, pair.newTag);
        })
        const currentFileContent = await this.plugin.app.vault.read(file);
        if (editor) {
            const currentFileLines = currentFileContent.split('\n');
            const updatedLineMap = await this.updateCitationLines(
                currentFileLines, currentFileTagMapping, deleteRepeatCitations, deleteUnusedCitations
            );
            updatedLineMap.forEach((newline, lineNum) => {
                editor.replaceRange(newline, { line: lineNum, ch: 0 }, { line: lineNum, ch: currentFileLines[lineNum].length })
            })
        } else {
            // no editor instance, update the citation in current file without editor instance 
            const updatedContent = await this.updateCitations(
                currentFileContent, currentFileTagMapping, deleteRepeatCitations, deleteUnusedCitations
            );
            await this.plugin.app.vault.modify(file, updatedContent);
        }

        /****  update the citation in backlink files ******/
        const linksAll = this.plugin.app.metadataCache.resolvedLinks;
        const backLinks = resolveBackLinks(linksAll, sourceFile);
        const fileCiteDelimiter = this.plugin.settings.fileCiteDelimiter || "^";
        for (const link of backLinks) {
            const file = this.plugin.app.vault.getAbstractFileByPath(link);
            if (!(file instanceof TFile)) continue;  // file not found, skip it 

            const footNotes: FootNote[] | undefined = await this.plugin.footnoteCache.getFootNotesFromFile(link);
            if (!footNotes) continue;

            // get the footnote number of current file in this file, e.g. 1, 2, .... 
            const currentFootNoteNums = footNotes
                .filter((ft) => {
                    const dstFile = this.plugin.app.metadataCache.getFirstLinkpathDest(ft.path, sourceFile);
                    if (!(dstFile instanceof TFile)) {
                        return false;
                    }
                    return dstFile.path === sourceFile
                })
                .map((ft) => ft.num);
            if (currentFootNoteNums.length === 0) {
                continue; // no footnote of current file in this file
            }

            // construct cross file tag mapping 
            const crossFileTagMapping = new Map<string, string>();
            effectivePairs.forEach(pair => {
                for (const num of currentFootNoteNums) {
                    const oldTag = `${num}${fileCiteDelimiter}${pair.oldTag}`
                    const newTag = `${num}${fileCiteDelimiter}${pair.newTag}`
                    crossFileTagMapping.set(oldTag, newTag);
                }
            });
            const md = await this.plugin.app.vault.read(file);
            const updatedContent = await this.updateCitations(md, crossFileTagMapping, deleteRepeatCitations, deleteUnusedCitations);
            await this.plugin.app.vault.modify(file, updatedContent);
        }
    }

    /**
     * For current Editor, use updateCitationLines to avoid lose focus of cursor 
     */
    async updateCitationLines(
        lines: string[],
        nameMapping: Map<string, string>,   // mapping from old tag to new tag 
        deleteRepeatCitations = false,
        deleteUnusedCitations = false
    ): Promise<Map<number, string>> {
        const lineMap = new Map<number, string>();
        const prefix = this.plugin.settings.citationPrefix || "eq:";  // default citation prefix 
        const citationsAll: CitationRef[] = parseCitationsInMarkdown(lines.join('\n')).filter(c => c.label.startsWith(prefix));
        if (citationsAll.length === 0) return lineMap;  // not do anyhing if no citations found

        // get the delimiter configurations 
        const multiEqDelimiter = this.plugin.settings.multiCitationDelimiter || ",";
        const rangeSymbol = this.plugin.settings.continuousRangeSymbol || "~";
        const citeDelimiters = this.plugin.settings.continuousDelimiters.split(" ") || ["-", ".", ":", "\\_"];
        const fileDelimiter = this.plugin.settings.fileCiteDelimiter || "^";
        // get old tags and new tags   
        const oldTags = new Set(nameMapping.keys());
        const newTags = new Set(nameMapping.values());

        for (const c of citationsAll.reverse() as CitationRef[]) {
            // citations in 1 group 
            const citations = c.label.substring(prefix.length).split(multiEqDelimiter).map(t => t.trim());
            // replace the corresponding line with the new citation text 
            const before = lines[c.line].substring(0, c.position.start);
            const after = lines[c.line].substring(c.position.end);
            // split citations into discrete ciitations  
            const splittedCitations = splitContinuousCitationTags(
                citations, rangeSymbol, citeDelimiters, fileDelimiter
            ) as string[];
            // process each discrete citation 
            const processedCitations = splittedCitations.map(ct => this.processTag(
                ct, nameMapping, oldTags, newTags, deleteUnusedCitations, deleteRepeatCitations)
            ).filter(s => s !== "");

            // no citations found, delete the citation
            if (processedCitations.length === 0) {
                lineMap.set(c.line, before + after);  // delete the citation if no valid citations found 
                continue;
            }
            // combine the citations to continuous form.  
            const newCitations = combineContinuousCitationTags(
                processedCitations, rangeSymbol, citeDelimiters, fileDelimiter
            );
            const newCitationRaw = `$\\ref{${prefix}${newCitations.join(multiEqDelimiter)}}$`;
            lineMap.set(c.line, before + newCitationRaw + after);  // update the citation with new tag 
        }
        return lineMap;
    }

    async updateCitations(md: string,
        nameMapping: Map<string, string>,   // mapping from old tag to new tag
        deleteRepeatCitations = false,
        deleteUnusedCitations = false
    ): Promise<string> {
        if (!md.trim()) return md;  // not do anyhing if md is empty 
        const lines = md.split('\n');  // split the markdown into lines 
        const lineMap = await this.updateCitationLines(
            lines, nameMapping, deleteRepeatCitations, deleteUnusedCitations
        );
        // for Map.forEach, it use map.forEach(value, key)
        lineMap.forEach((newLine: string, lineNum: number) => {
            lines[lineNum] = newLine;
        })
        return lines.join('\n');
    }

    /**
     * Process a single tag and update it if necessary 
     * @param tag 
     * @param nameMapping 
     * @param oldTags 
     * @param newTags 
     * @param deleteUnusedCitations 
     * @param deleteRepeatCitations 
     * @returns 
     */
    private processTag(
        tag: string,
        nameMapping: Map<string, string>,
        oldTags: Set<string>,
        newTags: Set<string>,
        deleteUnusedCitations: boolean,
        deleteRepeatCitations: boolean
    ): string {
        const newTagName = nameMapping.get(tag) || tag;
        // if old tag has no this tag, this is a unused tag, delete it if deleteUnusedCitations is true  
        if (!oldTags.has(tag) && deleteUnusedCitations) {
            return "";
        }
        // if new tag has this tag, this is a repeat tag if not renamed, delete it if deleteRepeatCitations is true  
        if (tag === newTagName && newTags.has(newTagName) && deleteRepeatCitations) {
            return "";
        }
        return newTagName;
    }
}

