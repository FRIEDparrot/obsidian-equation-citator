import EquationCitator from "@/main";
import { FootNote } from "@/utils/footnote_utils";
import { resolveBackLinks } from "@/utils/link_utils";
import { TFile, Editor } from "obsidian";
import { CitationRef, combineContinuousCitationTags, parseCitationsInMarkdown, splitContinuousCitationTags } from "@/utils/citation_utils";
import { createCitationString } from "@/utils/regexp_utils";
import Debugger from "@/debug/debugger";

export interface TagRenamePair {
    oldTag: string;
    newTag: string;
}

export type FileCitationChangeMap = Map<string, number>;

export interface TagRenameResult {
    totalFilesChanged: number;
    totalCitationsChanged: number;
    details: FileCitationChangeMap;
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
                    if (!ft.path) return false;
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
        const fileContent = await this.plugin.app.vault.cachedRead(file);
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
     * @param editor optional current editor instance, prevent lose focus of cursor 
     * @returns 
     */
    public async renameTags(
        sourceFile: string,
        pairs: TagRenamePair[],
        deleteRepeatCitations = false,
        deleteUnusedCitations = false,
        editor?: Editor
    ): Promise<TagRenameResult | undefined> {
        const file = this.plugin.app.vault.getAbstractFileByPath(sourceFile);
        if (!(file instanceof TFile)) {
            return;
        }
        // no need to update if old tag is the same as new tag 
        if (pairs.filter(pair => pair.oldTag !== pair.newTag).length === 0 &&
            !deleteUnusedCitations) return;  // no effective pairs, do nothing  

        /** record the renaming result */
        const fileChangeMap: FileCitationChangeMap = new Map<string, number>();
        // add a path-number pair to the change map 
        const addToChangeMap = (filePath: string, changedCount: number) => {
            const existingCount = fileChangeMap.get(filePath) || 0;
            fileChangeMap.set(filePath, existingCount + changedCount);
        };
        
        /********  update the citation in current file  ********/
        const currentFileTagMapping = new Map<string, string>();
        pairs.forEach(pair => {
            currentFileTagMapping.set(pair.oldTag, pair.newTag);
        });
        // use read here to get strong consistency (since in many auto-number may change file lines)
        const currentFileContent = await this.plugin.app.vault.read(file);
        let currentFileUpdatedNum = 0;
        if (editor) {
            const currentFileLines = currentFileContent.split('\n');
            const { updatedLineMap, updatedNum } = await this.updateCitationLines(
                currentFileLines, currentFileTagMapping, deleteRepeatCitations, deleteUnusedCitations
            );
            const sortedUpdatedLineMap = new Map(Array.from(updatedLineMap.entries()).sort((a, b) => b[0] - a[0]));
            sortedUpdatedLineMap
                .forEach((newline: string, lineNum: number) => {
                    editor.replaceRange(
                        newline,
                        { line: lineNum, ch: 0 },
                        { line: lineNum, ch: currentFileLines[lineNum].length })
                })
            currentFileUpdatedNum = updatedNum;
        } else {
            // no editor instance, update the citation in current file without editor instance 
            const { updatedContent, updatedNum } = await this.updateCitations(
                currentFileContent, currentFileTagMapping, deleteRepeatCitations, deleteUnusedCitations
            );
            await this.plugin.app.vault.modify(file, updatedContent);
            currentFileUpdatedNum = updatedNum;
        }
        addToChangeMap(sourceFile, currentFileUpdatedNum);  // add the current file to the change map

        /***  update the citation in backlink files ******/
        /****  update the citation in backlink files ******/
        const linksAll = this.plugin.app.metadataCache.resolvedLinks;
        const backLinks = resolveBackLinks(linksAll, sourceFile);
        const fileCiteDelimiter = this.plugin.settings.fileCiteDelimiter || "^";
        for (const link of backLinks) {
            const file = this.plugin.app.vault.getAbstractFileByPath(link);
            if (!(file instanceof TFile)) continue;  // file not found, skip it (not add to change map) 
            const footNotes: FootNote[] | undefined = await this.plugin.footnoteCache.getFootNotesFromFile(link);
            if (!footNotes) {
                addToChangeMap(link, 0);
                continue;
            }
            // get the footnote number of current file in this file, e.g. 1, 2, .... 
            const currentFootNoteNums = footNotes
                .filter((ft) => {
                    if (!ft.path) return false;
                    const dstFile = this.plugin.app.metadataCache.getFirstLinkpathDest(ft.path, sourceFile);
                    if (!(dstFile instanceof TFile)) {
                        return false;
                    }
                    return dstFile.path === sourceFile
                })
                .map((ft) => ft.num);
            if (currentFootNoteNums.length === 0) {
                addToChangeMap(link, 0);  // no footnote of current file in this file
                continue; // no footnote of current file in this file
            }

            // construct cross file tag mapping 
            const crossFileTagMapping = new Map<string, string>();
            pairs.forEach(pair => {
                for (const num of currentFootNoteNums) {
                    const oldTag = `${num}${fileCiteDelimiter}${pair.oldTag}`
                    const newTag = `${num}${fileCiteDelimiter}${pair.newTag}`
                    crossFileTagMapping.set(oldTag, newTag);
                }
            });
            const md = await this.plugin.app.vault.read(file);
            const { updatedContent, updatedNum } = await this.updateCitations(
                md, crossFileTagMapping, deleteRepeatCitations, deleteUnusedCitations
            );
            await this.plugin.app.vault.modify(file, updatedContent);
            addToChangeMap(link, updatedNum);  // add the backlink file to the change map 
        }
        // calculate the total number of updated citations
        const filteredFileChangeMap: FileCitationChangeMap = new Map(
            Array.from(fileChangeMap.entries()).filter(([_, count]) => count > 0)
        );
        const totalCitationChanged = Array.from(filteredFileChangeMap.values()).reduce((sum, cnt) => sum + cnt, 0);
        return {
            totalFilesChanged: filteredFileChangeMap.size,
            totalCitationsChanged: totalCitationChanged,
            details: fileChangeMap  // return not filtered result  
        };
    }

    /**
     * For current Editor, use updateCitationLines to avoid lose focus of cursor 
     */
    async updateCitationLines(
        lines: string[],
        // mapping from old tag to new tag (full -> we remove repeat internally and remove unused)
        nameMappingFull: Map<string, string>,
        deleteRepeatCitations = false,
        deleteUnusedCitations = false
    ): Promise<{
        updatedLineMap: Map<number, string>,
        updatedNum: number
    }> {
        // const newTags = new Set(nameMappingFull.values());
        const nameMapping = new Map(
            [...nameMappingFull.entries()].filter(([oldTag, newTag]) => oldTag !== newTag)
        );
        const oldTagsAll = new Set(nameMappingFull.keys());
        const newTags = new Set(nameMapping.values());
        const lineMap = new Map<number, string>();
        const prefix = this.plugin.settings.citationPrefix || "eq:";  // default citation prefix 
        const citationsAll: CitationRef[] = parseCitationsInMarkdown(lines.join('\n')).filter(c => c.label.startsWith(prefix));

        if (citationsAll.length === 0) return { updatedLineMap: new Map(), updatedNum: 0 };  // not do anyhing if no citations found
        // get the delimiter configurations 
        const multiEqDelimiter = this.plugin.settings.multiCitationDelimiter || ",";
        const rangeSymbol = this.plugin.settings.continuousRangeSymbol || "~";
        const citeDelimiters = this.plugin.settings.continuousDelimiters.split(" ") || ["-", ".", ":", "\\_"];
        const fileDelimiter = this.plugin.settings.fileCiteDelimiter || "^";

        // get old tags and new tags 
        let updatedNum = 0;
        for (const c of citationsAll.reverse() as CitationRef[]) {
            // citations in 1 group 
            const citations = c.label.substring(prefix.length).split(multiEqDelimiter).map(t => t.trim());
            // replace the corresponding line with the new citation text 
            const before = lines[c.line].substring(0, c.position.start);
            const after = lines[c.line].substring(c.position.end);
            // split all citations into discrete citations  
            const splittedCitations = splitContinuousCitationTags(
                citations, rangeSymbol, citeDelimiters, fileDelimiter
            ) as string[];
            
            // process each discrete citation 
            const processedCitations = splittedCitations.map(ct => {
                const processedTag = this.processTag(ct, nameMapping, oldTagsAll, newTags, deleteUnusedCitations, deleteRepeatCitations)
                if (ct !== processedTag) updatedNum++;  // update the number of updated citations 
                return processedTag;
            }).filter(s => s !== "");

            // no citations found, delete the citation
            if (processedCitations.length === 0) {
                lineMap.set(c.line, before + after);  // delete the citation if no valid citations found 
                continue;
            }
            // combine the citations to continuous form.  
            const newCitations = combineContinuousCitationTags(
                processedCitations, rangeSymbol, citeDelimiters, fileDelimiter
            );
            const newCitationRaw = createCitationString(prefix, newCitations.join(multiEqDelimiter));
            lineMap.set(c.line, before + newCitationRaw + after);  // update the citation with new tag 
        }
        return {
            updatedLineMap: lineMap,
            updatedNum
        }
    }

    async updateCitations(md: string,
        nameMapping: Map<string, string>,   // mapping from old tag to new tag
        deleteRepeatCitations = false,
        deleteUnusedCitations = false
    ): Promise<
        {
            updatedContent: string,
            updatedNum: number
        }> {
        if (!md.trim()) return { updatedContent: md, updatedNum: 0 };  // not do anyhing if md is empty 
        const lines = md.split('\n');  // split the markdown into lines 
        const { updatedLineMap, updatedNum } = await this.updateCitationLines(
            lines, nameMapping, deleteRepeatCitations, deleteUnusedCitations
        );
        // for Map.forEach, it use map.forEach(value, key)
        updatedLineMap.forEach((newLine: string, lineNum: number) => {
            lines[lineNum] = newLine;
        })
        return {
            updatedContent: lines.join('\n'),
            updatedNum
        }
    }

    /**
     * Process a single tag and update it if necessary 
     * @param tag 
     * @param nameMapping 
     * @param oldTagsAll // all old tags in the file 
     * @param newTags  // new tags (can both all or unique, used to check conflict) 
     * @param deleteUnusedCitations 
     * @param deleteRepeatCitations 
     * @returns 
     */
    private processTag(
        tag: string,
        nameMapping: Map<string, string>, // mapping from old tag to new tag (remove repeat before that!)
        oldTagsAll: Set<string>,  // all old tags in the file, used to check unused tag  
        newTags: Set<string>,     // new tags (used to check conflict) 
        deleteUnusedCitations: boolean,
        deleteRepeatCitations: boolean
    ): string {
        const newTagName = nameMapping.get(tag) || tag;
        // if old tag has no this tag, this is a unused tag, delete it if deleteUnusedCitations is true  
        if (deleteUnusedCitations && !oldTagsAll.has(tag)) {
            Debugger.log(`Delete unused tag: ${tag},  while old tags are:`, oldTagsAll);
            return "";
        }
        // The current tag will not be renamed, but it is conflict with a new tag 
        if (deleteRepeatCitations && !nameMapping.has(tag) && newTags.has(tag)) {
            return ""; // delete it if deleteRepeatCitations is true  
        }
        return newTagName;
    }
}
