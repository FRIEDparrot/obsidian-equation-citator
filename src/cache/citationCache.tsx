import { parseCitationsInMarkdown, CitationRef } from '@/utils/citation_utils';
import { BaseCache } from '@/cache/baseCache';

export class CitationCache extends BaseCache<CitationRef> {
    protected parseMarkdown(markdown: string): CitationRef[] {
        return parseCitationsInMarkdown(markdown);
    }

    protected getCacheTypeName(): string {
        return 'citation';
    }

    // Keep the original method name for compatibility
    async getCitationsForFile(sourcePath: string): Promise<CitationRef[] | undefined> {
        return this.getDataForFile(sourcePath);
    }
}