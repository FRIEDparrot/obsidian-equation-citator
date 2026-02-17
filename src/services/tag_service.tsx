import EquationCitator from "@/main";
import { FootNote } from "@/utils/parsers/footnote_parser";
import { resolveBackLinks } from "@/utils/misc/fileLink_utils";
import { TFile, Editor, normalizePath } from "obsidian";
import { buildCrossFileCitation, CitationRef, combineContinuousCitationTags, parseCitationsInMarkdown, splitContinuousCitationTags, splitFileCitation } from "@/utils/core/citation_utils";
import { createCitationString } from "@/utils/string_processing/regexp_utils";
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

/**
 * Service for managing tag operations in the EquationCitator plugin
 * 
 * Handles tag renaming across files and their backlinks, with support for:
 * - Validating tag renames to prevent duplicates
 * - Single and cross-file citation updates
 * - Deletion of repeated and unused citations
 * - Cursor position preservation when editing with an active editor
 * 
 * @class TagService
 * @example
 * ```
 * const tagService = new TagService(plugin);
 * const canRename = await tagService.checkRepeatedTags(filePath, renamePairs);
 * if (canRename) {
 *   const result = await tagService.renameTags(filePath, renamePairs);
 * }
 * ```
 */
export class TagService {
    constructor(
        private readonly plugin: EquationCitator
    ) { }

    public async checkRepeatedTags(
        sourceFile: string,
        pairs: TagRenamePair[],
        prefix?: string
    ): Promise<boolean> {
        const normalizedPath = normalizePath(sourceFile);
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(file instanceof TFile)) {
            return false;
        }

        const effectivePairs = pairs.filter(pair => pair.oldTag !== pair.newTag);
        if (effectivePairs.length === 0) {
            return false;
        }

        // check all new tag Names 
        const newTagNames = new Set(effectivePairs.filter((p) => p.oldTag !== p.newTag).map(p => p.newTag));
        const hasRepeatedInCurrentFile = await this.checkRepeatedTagsInFile(normalizedPath, newTagNames, prefix);
        if (hasRepeatedInCurrentFile) {
            return true;
        }

        const linksAll = this.plugin.app.metadataCache.resolvedLinks;
        const backLinks = resolveBackLinks(linksAll, normalizedPath);
        const fileCiteDelimiter = this.plugin.settings.fileCiteDelimiter || "^";
        for (const backLinkPath of backLinks) {
            const footNotes: FootNote[] | undefined = await this.plugin.footnoteCache.getFootNotesFromFile(backLinkPath);
            if (!footNotes) {
                continue;
            }
            const currentFootNoteNums = footNotes
                .filter((ft) => {
                    if (!ft.path) return false;
                    const dstFile = this.plugin.app.metadataCache.getFirstLinkpathDest(ft.path, normalizedPath);
                    if (!(dstFile instanceof TFile)) {
                        return false;
                    }
                    return dstFile.path === normalizedPath
                })
                .map((ft) => ft.num);
            if (currentFootNoteNums.length === 0) {
                continue;
            }

            // create a set of cross file citations 
            const crossFileNewTags = new Set<string>();
            effectivePairs.forEach(pair => {
                for (const num of currentFootNoteNums) {
                    // attention -> add brace to construct new cross file tag 
                    // **standard : old citations and new citations should all have brace**
                    const newCrossFileTag = buildCrossFileCitation(num, pair.newTag, fileCiteDelimiter);
                    crossFileNewTags.add(newCrossFileTag);
                }
            });
            // check for repeated cross file citations in backlink file
            const hasRepeatedInBackLink = await this.checkRepeatedTagsInFile(backLinkPath, crossFileNewTags, prefix);
            if (hasRepeatedInBackLink) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if there are any tags in the specified file that duplicate the given set of target tags
     * 
     * This is used in check repeated if the new tag name already exists in the current file or backlink files, 
     *       to avoid creating duplicate citations after renaming (leading to wrong citation number after renaming)
     * @param filePath Path to the file
     * @param targetTags Set of target tags to check against
     * @param citationPrefix Optional citation prefix (defaults to equation prefix from settings)
     * @returns Promise<boolean> - returns true if a duplicate exists
     */
    private async checkRepeatedTagsInFile(
        filePath: string,
        targetTags: Set<string>,
        citationPrefix?: string
    ): Promise<boolean> {
        const normalizedPath = normalizePath(filePath);
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(file instanceof TFile)) {
            return false;
        }
        const { citationPrefix: defaultPrefix = "eq:",
            multiCitationDelimiter: multiEqDelimiter = ",",
            continuousRangeSymbol: rangeSymbol = "~",
            continuousDelimiters: citeDelimiters = String.raw`- . : \_`,
            fileCiteDelimiter: fileDelimiter = "^" } = this.plugin.settings;
        const prefix = citationPrefix || defaultPrefix;        const fileContent = await this.plugin.app.vault.cachedRead(file);
        if (targetTags.size === 0 || !fileContent.trim() || !prefix.trim()) {
            return false;
        }

        // Parse all citations in the file
        const citationsAll: CitationRef[] = parseCitationsInMarkdown(fileContent)
            .filter(c => c.label.startsWith(prefix));
        if (citationsAll.length === 0) return false;

        // Collect all existing tags from the file
        const existingTags = new Set<string>();
        for (const citation of citationsAll) {
            // Get all tags in the citation group
            const citations = citation.label.substring(prefix.length)
                .split(multiEqDelimiter)
                .map(t => t.trim());

            // Split continuous citation tags into discrete tags
            const splittedCitations = splitContinuousCitationTags(
                citations, rangeSymbol, citeDelimiters.split(" "), fileDelimiter
            );
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
     * The name `renameTags` is misleading (since this is for update citations, so it may be renamed in future)
     * update citations in current file and its backlinks (reused for equations and figures)
     * @param sourceFile 
     * @param tagPairs 
     * @param deleteRepeatCitations 
     * @param deleteUnusedCitations 
     * @param editor optional current editor instance, prevent lose focus of cursor 
     * @returns 
     */
    public async renameTags(
        sourceFile: string,
        tagPairs: TagRenamePair[],
        deleteRepeatCitations = false,
        deleteUnusedCitations = false,
        editor?: Editor,
        prefix?: string
    ): Promise<TagRenameResult | undefined> {
        const normalizedPath = normalizePath(sourceFile);
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(file instanceof TFile)) {
            return;
        }
        // no need to update if old tag is the same as new tag 
        if (tagPairs.filter(pair => pair.oldTag !== pair.newTag).length === 0 &&
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
        tagPairs.forEach(pair => {
            currentFileTagMapping.set(pair.oldTag, pair.newTag);
        });
        // use read here to get strong consistency (since in many auto-number may change file lines)
        const currentFileContent = await this.plugin.app.vault.read(file);
        let currentFileUpdatedNum = 0;
        if (editor) {
            const currentFileLines = currentFileContent.split('\n');
            const { updatedLineMap, updatedNum } = this.updateCitationLines(
                currentFileLines, currentFileTagMapping, deleteRepeatCitations, deleteUnusedCitations, prefix
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
            const { updatedContent, updatedNum } = this.updateCitations(
                currentFileContent, currentFileTagMapping, deleteRepeatCitations, deleteUnusedCitations, prefix
            );
            await this.plugin.app.vault.modify(file, updatedContent);
            currentFileUpdatedNum = updatedNum;
        }
        addToChangeMap(sourceFile, currentFileUpdatedNum);  // add the current file to the change map

        /****  update the citation in backlink files ******/
        const linksAll = this.plugin.app.metadataCache.resolvedLinks;
        const backLinks = resolveBackLinks(linksAll, normalizedPath);
        const fileCiteDelimiter = this.plugin.settings.fileCiteDelimiter || "^";
        for (const link of backLinks) {
            const normalizedLink = normalizePath(link);
            const file = this.plugin.app.vault.getAbstractFileByPath(normalizedLink);
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
                    const dstFile = this.plugin.app.metadataCache.getFirstLinkpathDest(ft.path, normalizedPath);
                    if (!(dstFile instanceof TFile)) {
                        return false;
                    }
                    return dstFile.path === normalizedPath
                })
                .map((ft) => ft.num);
            if (currentFootNoteNums.length === 0) {
                addToChangeMap(link, 0);  // no footnote of current file in this file
                continue; // no footnote of current file in this file
            }

            // construct cross file tag mapping 
            const crossFileTagMapping = new Map<string, string>();

            // standard : old citations and new citations should all have brace  
            tagPairs.forEach(pair => {
                for (const num of currentFootNoteNums) {
                    const oldTag = buildCrossFileCitation(num, pair.oldTag, fileCiteDelimiter);
                    const newTag = buildCrossFileCitation(num, pair.newTag, fileCiteDelimiter);
                    crossFileTagMapping.set(oldTag, newTag);
                }
            });
            const md = await this.plugin.app.vault.read(file);
            const { updatedContent, updatedNum } = this.updateCitations(
                md, crossFileTagMapping, deleteRepeatCitations, deleteUnusedCitations, prefix
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
    updateCitationLines(
        lines: string[],
        // mapping from old tag to new tag (full -> we remove repeat internally and remove unused)
        nameMappingFull: Map<string, string>,
        deleteRepeatCitations = false,
        deleteUnusedCitations = false,
        prefixOverride?: string
    ): {
        updatedLineMap: Map<number, string>,
        updatedNum: number
    } {
        const prefix = prefixOverride ?? this.plugin.settings.citationPrefix ?? "eq:";  // delimiter configuration
        const multiEqDelimiter = this.plugin.settings.multiCitationDelimiter || ",";
        const rangeSymbol = this.plugin.settings.continuousRangeSymbol || "~";
        const citeDelimiters = this.plugin.settings.continuousDelimiters.split(" ") || ["-", ".", ":", String.raw`\_`];
        const fileDelimiter = this.plugin.settings.fileCiteDelimiter || "^";

        const nameMapping = new Map(
            [...nameMappingFull.entries()].filter(([oldTag, newTag]) => oldTag !== newTag)
        ); // remove pairs whose old/new are identical
        const lineMap = new Map<number, string>();

        // collect ALL citations in the file first  
        const citationsAll: CitationRef[] = parseCitationsInMarkdown(lines.join('\n'))
            .filter(c => c.label.startsWith(prefix));
        if (citationsAll.length === 0) return { updatedLineMap: new Map(), updatedNum: 0 };

        // Split citations into discrete tags and collect all existing tags (for unused check grouping) 
        const allExistingDiscrete: string[] = [];
        for (const c of citationsAll) {
            const citations = c.label.substring(prefix.length).split(multiEqDelimiter).map(t => t.trim());
            const splitted = splitContinuousCitationTags(citations, rangeSymbol, citeDelimiters, fileDelimiter);
            allExistingDiscrete.push(...splitted);
        }
        const oldTagsByCrossFile = this.groupCitationsByCrossFile(allExistingDiscrete, fileDelimiter);
        const newTagsByCrossFile = this.groupCitationsByCrossFile(nameMapping.values(), fileDelimiter);

        let updatedNum = 0;
        for (const c of citationsAll.slice().reverse()) {
            const currentLine = lineMap.get(c.line) ?? lines[c.line];
            const before = currentLine.substring(0, c.position.start);
            const after = currentLine.substring(c.position.end);

            const body = c.label.substring(prefix.length);
            const citations = body.split(multiEqDelimiter).map(t => t.trim());

            const splittedCitations = splitContinuousCitationTags(
                citations, rangeSymbol, citeDelimiters, fileDelimiter
            );
            
            const processedCitations = splittedCitations.map(ct => {
                const pc = this.processCitation(
                    ct,
                    nameMapping,
                    oldTagsByCrossFile,
                    newTagsByCrossFile,
                    deleteUnusedCitations,
                    deleteRepeatCitations,
                    fileDelimiter
                );
                if (ct !== pc) updatedNum++;
                return pc;
            }).filter(s => s !== "");

            // no citations found, delete the citation
            if (processedCitations.length === 0) {
                const newLine = before + after;
                lineMap.set(c.line, newLine);
                continue;
            }
            const newCitations = combineContinuousCitationTags(
                processedCitations, rangeSymbol, citeDelimiters, fileDelimiter
            );
            const newCitationRaw = createCitationString(prefix, newCitations.join(multiEqDelimiter));
            lineMap.set(c.line, before + newCitationRaw + after);
        }
        return { updatedLineMap: lineMap, updatedNum };
    }

    updateCitations(md: string,
        nameMapping: Map<string, string>,   // mapping from old tag to new tag
        deleteRepeatCitations = false,
        deleteUnusedCitations = false,
        prefixOverride?: string
    ):  {
            updatedContent: string,
            updatedNum: number
        } {
        if (!md.trim()) return { updatedContent: md, updatedNum: 0 };  // not do anyhing if md is empty 
        const lines = md.split('\n');  // split the markdown into lines 
        const { updatedLineMap, updatedNum } = this.updateCitationLines(
            lines, nameMapping, deleteRepeatCitations, deleteUnusedCitations, prefixOverride
        );
        // for Map.forEach, it use map.forEach(value, key)
        updatedLineMap.forEach((newLine: string, lineNum: number) => {
            lines[lineNum] = newLine;
        });
        return {
            updatedContent: lines.join('\n'),
            updatedNum
        }
    }

    /**
     * Process a single citation tag and apply renaming, deletion, and deduplication rules.
     * 
     * This method handles individual citation tags within a citation string, applying transformations
     * based on the provided mapping and deletion rules. It maintains cross-file citation integrity
     * by grouping tags by their cross-file prefix and checking for duplicates within those groups.
     * 
     * @param ct - The citation tag to process (e.g., "1.2.3" or "12^1.2.3")
     * @param nameMapping - Map from old tag names to new tag names for renaming operations
     * @param oldTagsByCrossFile - Map grouping original tags by their cross-file prefix (e.g., "12^" -> Set{"1.2.3", "4.5.6"})
     * @param newTagsByCrossFile - Map grouping new/renamed tags by their cross-file prefix for duplicate detection
     * @param deleteUnusedCitations - If true, remove citations that don't exist in oldTagsByCrossFile
     * @param deleteRepeatCitations - If true, remove duplicate citations within the same cross-file group
     * @param fileDelimiter - Delimiter separating cross-file prefix from local tag (typically "^")
     * 
     * @returns The processed citation tag (renamed if mapped, or original), or empty string if deleted
     * 
     * @example
     * ```ts
     * // Rename citation from "1.2" to "1.3"
     * processCitation("1.2", new Map([["1.2", "1.3"]]), ...) // returns "1.3"
     * 
     * // Delete unused citation
     * processCitation("1.2", new Map(), new Map(), ..., true, false, "^") // returns "" if "1.2" not in oldTags
     * 
     * // Delete duplicate citation
     * processCitation("1.2", new Map(), ..., new Map([["", new Set(["1.2"])]]), false, true, "^") // returns "" if duplicate
     * ```
     */
    private processCitation(
        ct: string,
        nameMapping: Map<string, string>,
        oldTagsByCrossFile: Map<string, Set<string>>,
        newTagsByCrossFile: Map<string, Set<string>>,
        deleteUnusedCitations: boolean,
        deleteRepeatCitations: boolean,
        fileDelimiter: string
    ): string {
        const original = ct;
        const newTagName = nameMapping.get(ct) || ct;
        const { local: newLocal, crossFile: newCrossFile } = splitFileCitation(newTagName, fileDelimiter);
        const { local: originalLocal, crossFile: originalCrossFile } = splitFileCitation(original, fileDelimiter);
        const originalKey = originalCrossFile || "";
        const newKey = newCrossFile || "";

        if (deleteUnusedCitations) {
            const oldLocalSet = oldTagsByCrossFile.get(originalKey);
            if (!oldLocalSet?.has(originalLocal)) {
                Debugger.log(`Delete unused tag (group=${originalKey}): ${original}`);
                return "";
            }
        }
        if (deleteRepeatCitations) {
            const newLocalSet = newTagsByCrossFile.get(newKey);
            const wasRenamed = nameMapping.has(ct);
            if (!wasRenamed && newLocalSet?.has(newLocal)) {
                return ""; // duplicate in same cross-file group
            }
        }
        return newTagName;
    }

    /**
     * Group citation strings by cross-file prefix.
     * @param tags iterable of discrete citation tags (already split, e.g. "12^{1.2.3}" or "1.2.3")
     * @param fileDelimiter delimiter between crossFile and local (e.g. '^')
     */
    private groupCitationsByCrossFile(tags: Iterable<string>, fileDelimiter: string): Map<string, Set<string>> {
        const map = new Map<string, Set<string>>();
        for (const t of tags) {
            if (!t) continue;
            const { local, crossFile } = splitFileCitation(t, fileDelimiter);
            const key = crossFile || "";
            let set = map.get(key);
            if (!set) {
                set = new Set<string>();
                map.set(key, set);
            }
            set.add(local);
        }
        return map;
    }
}
