import { EquationMatch, parseEquationsInMarkdown } from "@/utils/parsers/equation_parser";
import { BaseCache } from '@/cache/baseCache';

export class EquationCache extends BaseCache<EquationMatch> {
    protected parseMarkdown(markdown: string): EquationMatch[] {
        return parseEquationsInMarkdown(markdown, true); 
    }
    
    protected getCacheTypeName(): string {
        return 'equation';
    }
    
    // also parse the whole file 
    async getEquationsForFile(sourcePath: string): Promise<EquationMatch[] | undefined> {
        return this.getDataForFile(sourcePath);
    }
}
