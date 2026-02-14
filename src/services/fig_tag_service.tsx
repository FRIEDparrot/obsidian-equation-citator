import EquationCitator from "@/main";
import { TFile } from "obsidian";
import { parseImageLine, ImageMatch } from "@/utils/parsers/image_parser";
import { TagRenamePair, TagRenameResult, FileCitationChangeMap } from "@/services/tag_service";
import Debugger from "@/debug/debugger";

/**
 * Service for handling figure tag renaming operations
 * Handles updating inline figure tags in image metadata (![[...]] and ![...](...))
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
     * Parse an image line from selected text to extract tag information
     * @param selectedText - The selected text (should be an image line)
     * @param imagePrefix - Image prefix (e.g., "fig:")
     * @returns ImageMatch or null if not a valid image
     */
    public parseSelectedImage(selectedText: string, imagePrefix: string): ImageMatch | null {
        const trimmed = selectedText.trim();
        return parseImageLine(trimmed, 0, imagePrefix);
    }

    /**
     * Check if the selected text is a valid figure with a tag
     * @param selectedText - The selected text
     * @param imagePrefix - Image prefix (e.g., "fig:")
     * @returns true if it's a valid figure with a tag
     */
    public isValidFigureWithTag(selectedText: string, imagePrefix: string): boolean {
        const imageMatch = this.parseSelectedImage(selectedText, imagePrefix);
        return Boolean(imageMatch?.tag !== undefined);
    }

    /**
     * Rename figure tags in a file and update all citations
     * @param sourceFile - Source file path
     * @param tagPairs - Array of tag rename pairs
     * @param deleteRepeatCitations - Whether to delete repeated citations
     * @param deleteUnusedCitations - Whether to delete unused citations
     * @returns Rename result statistics
     */
    public async renameFigureTags(
        sourceFile: string,
        tagPairs: TagRenamePair[],
        deleteRepeatCitations = false,
        deleteUnusedCitations = false
    ): Promise<TagRenameResult | undefined> {
        const file = this.plugin.app.vault.getAbstractFileByPath(sourceFile);
        if (!(file instanceof TFile)) {
            return;
        }

        const imagePrefix = this.plugin.settings.figCitationPrefix || "fig:";
        const fileChangeMap: FileCitationChangeMap = new Map<string, number>();

        // Note: Figure tag definition (the image line itself) is updated directly
        // by the onSubmit callback in rightButtonHandler.tsx, similar to how
        // equation tags are updated. We only handle citation updates here.

        // Update all citations using the existing TagService
        // The TagService already handles citation updates for any prefix
        const citationUpdateResult = await this.plugin.tagService.renameTags(
            sourceFile,
            tagPairs,
            deleteRepeatCitations,
            deleteUnusedCitations,
            undefined, // editor parameter
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
}
