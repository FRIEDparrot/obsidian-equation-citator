import EquationCitator from "@/main";
import { Editor, MarkdownView, TFile, normalizePath } from "obsidian";
import { parseImageLine } from "@/utils/parsers/image_parser";
import { TagRenamePair, TagRenameResult, FileCitationChangeMap } from "@/services/tag_service";
import Debugger from "@/debug/debugger";
import { addTagToImage } from "@/utils/core/auto_number_figures";

export type AddFigureTagResult =
    | { success: true }
    | { success: false; reason: "view-not-found" | "line-changed" | "invalid-line" | "invalid-image" };

/**
 * Service for handling figure tag renaming operations
 * Handles updating inline figure tags in image metadata `(![[...]] and ![...](...))`
 */
export class FigureTagService {
    constructor(
        private readonly plugin: EquationCitator
    ) { }
    
    /**
     * Update figure tag definitions in image metadata
     * @param fileContent - File content to update
     * @param tagMapping - Map of old tag -> new tag
     * @param imagePrefix - Image prefix (e.g., "fig:")
     * @returns Updated content and count of changes
     */
    public updateFigureTagDefinitions(
        fileContent: string,
        tagMapping: Map<string, string>,
        imagePrefix: string
    ): { updatedContent: string, updatedCount: number } {
        const lines = fileContent.split('\n');
        let updatedCount = 0;

        const updatedLines = lines.map((line, lineNum) => {
            const imageMatch = parseImageLine(line, lineNum, imagePrefix);
            
            if (!imageMatch?.tag) {
                return line; // Not an image line or no tag
            }

            const newTag = tagMapping.get(imageMatch.tag);
            if (!newTag || newTag === imageMatch.tag) {
                return line; // No rename needed
            }

            // Replace the old tag with new tag in the image line
            const oldLabel = `${imagePrefix}${imageMatch.tag}`;
            const newLabel = `${imagePrefix}${newTag}`;
            
            const updatedLine = line.replace(oldLabel, newLabel);
            
            if (updatedLine !== line) {
                updatedCount++;
                Debugger.log(`Updated figure tag: ${oldLabel} -> ${newLabel}`);
            }
            
            return updatedLine;
        });

        return {
            updatedContent: updatedLines.join('\n'),
            updatedCount
        };
    }

    /**
     * Check if the selected text is a valid figure with a tag
     * @param selectedText - The selected text
     * @param imagePrefix - Image prefix (e.g., "fig:")
     * @returns true if it's a valid figure with a tag
     */
    public isValidFigureWithTag(selectedText: string, imagePrefix: string): boolean {
        const imageMatch = parseImageLine(selectedText, 0, imagePrefix);
        return Boolean(imageMatch?.tag !== undefined);
    }

    /**
     * Adds a figure tag to the cached image line after verifying the editor line
     * still represents the same figure. Width metadata stays last because
     * {@link addTagToImage} reconstructs tags before trailing numeric size parts.
     */
    public addTagToFigureLine(
        filePath: string,
        line: number,
        tag: string,
        expectedRaw: string
    ): AddFigureTagResult {
        const normalizedPath = normalizePath(filePath);
        const view = this.getMarkdownViewByPath(normalizedPath);
        if (!view?.editor) {
            Debugger.log("Cannot find editor for figure file:", normalizedPath);
            return { success: false, reason: "view-not-found" };
        }

        const editor = view.editor;
        if (line < 0 || line >= editor.lineCount()) {
            Debugger.log("Invalid figure line:", normalizedPath, line);
            return { success: false, reason: "invalid-line" };
        }

        const currentLine = editor.getLine(line);
        if (currentLine.trim() !== expectedRaw.trim()) {
            Debugger.log("Figure line changed before adding tag:", normalizedPath, line, expectedRaw, currentLine);
            return { success: false, reason: "line-changed" };
        }

        const imagePrefix = this.plugin.settings.figCitationPrefix || "fig:";
        const imageMatch = parseImageLine(currentLine, line, imagePrefix);
        if (!imageMatch) {
            Debugger.log("Figure line no longer parses as an image:", normalizedPath, line, currentLine);
            return { success: false, reason: "invalid-image" };
        }

        const addResult = addTagToImage(imageMatch, tag, imagePrefix);
        if (!addResult.valid) {
            Debugger.log("Failed to add tag to figure:", normalizedPath, line, tag, imageMatch);
            return { success: false, reason: "invalid-image" };
        }

        editor.replaceRange(
            addResult.processedLine,
            { line, ch: 0 },
            { line, ch: currentLine.length }
        );

        return { success: true };
    }

    /**
     * Rename figure tags in a file and update all citations
     * @param sourceFile - Source file path
     * @param tagPairs - Array of tag rename pairs
     * @param deleteRepeatCitations - Whether to delete repeated citations
     * @param deleteUnusedCitations - Whether to delete unused citations
     * @returns Rename result statistics
     * @remarks Figure tag definition (the image line itself) is updated directly
     *       by the onSubmit callback in rightButtonHandler.tsx, similar to how 
     *       equation tags are updated. We only handle citation updates here.
     */
    public async renameFigureTags(
        sourceFile: string,
        tagPairs: TagRenamePair[],
        deleteRepeatCitations = false,
        deleteUnusedCitations = false,
        editor?: Editor
    ): Promise<TagRenameResult | undefined> {
        const normalizedPath = normalizePath(sourceFile);
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(file instanceof TFile)) {
            return;
        }

        const imagePrefix = this.plugin.settings.figCitationPrefix || "fig:";
        const fileChangeMap: FileCitationChangeMap = new Map<string, number>();

        // Update all citations using the existing TagService
        // The TagService already handles citation updates for any prefix
        const citationUpdateResult = await this.plugin.tagService.renameTags(
            sourceFile,
            tagPairs,
            deleteRepeatCitations,
            deleteUnusedCitations,
            editor, // current editor to apply changes
            imagePrefix // use figure prefix instead of equation prefix
        );

        // Use citation update results directly
        if (citationUpdateResult) {
            citationUpdateResult.details.forEach((count, path) => {
                fileChangeMap.set(path, count);
            });
        }

        const filteredFileChangeMap: FileCitationChangeMap = new Map(
            Array.from(fileChangeMap.entries()).filter(([_, count]) => count > 0)
        );

        const totalCitationChanged = Array.from(filteredFileChangeMap.values()).reduce((sum, cnt) => sum + cnt, 0);

        return {
            totalFilesChanged: filteredFileChangeMap.size,
            totalCitationsChanged: totalCitationChanged,
            details: fileChangeMap
        };
    }

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
