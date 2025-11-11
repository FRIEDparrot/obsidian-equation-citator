import { parseAllCalloutsFromMarkdown, CalloutMatch } from '@/utils/parsers/callout_parser';
import { BaseCache } from '@/cache/baseCache';
import EquationCitator from '@/main';

/**
 * Cache for parsed callouts/quotes in markdown files
 * Stores callout data including type, tag, content, and line range
 */
export class CalloutCache extends BaseCache<CalloutMatch> {
    constructor(plugin: EquationCitator) {
        super(plugin);
    }

    protected parseMarkdown(markdown: string): CalloutMatch[] {
        return parseAllCalloutsFromMarkdown(markdown, this.plugin.settings.quoteCitationPrefixes);
    }

    protected getCacheTypeName(): string {
        return 'callout';
    }

    /**
     * Get callouts for a specific file
     * @param sourcePath - Path to the file
     * @returns Array of CalloutMatch objects
     */
    async getCalloutsForFile(sourcePath: string): Promise<CalloutMatch[] | undefined> {
        return this.getDataForFile(sourcePath);
    }

    /**
     * Find a specific callout by its tag in a file
     * @param sourcePath - Path to the file
     * @param tag - The tag to search for (without prefix, e.g., "1.1" not "table:1.1")
     * @returns The matched CalloutMatch or undefined
     */
    async getCalloutByTag(sourcePath: string, tag: string): Promise<CalloutMatch | undefined> {
        const callouts = await this.getCalloutsForFile(sourcePath);
        return callouts?.find(callout => callout.tag === tag);
    }

    /**
     * Find callouts by type in a file
     * @param sourcePath - Path to the file
     * @param type - The type to filter by (e.g., "table", "thm", "def")
     * @returns Array of CalloutMatch objects of the specified type
     */
    async getCalloutsByType(sourcePath: string, type: string): Promise<CalloutMatch[]> {
        const callouts = await this.getCalloutsForFile(sourcePath);
        return callouts?.filter(callout => callout.type === type) || [];
    }
}
