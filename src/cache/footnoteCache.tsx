import { FootNote, parseFootnoteInMarkdown } from "@/utils/footnote_utils";
import { BaseCache } from "@/cache/baseCache";

export class FootNoteCache extends BaseCache<FootNote> {
    protected parseMarkdown(markdown: string): FootNote[] {
        return parseFootnoteInMarkdown(markdown);
    }
    protected getCacheTypeName(): string {
        return "footnote"; 
    }
    async  getFootNotesFromFile(sourcePath: string) : Promise<FootNote[] | undefined> {
        return this.getDataForFile(sourcePath);
    }
}
