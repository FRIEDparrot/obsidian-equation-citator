import { Notice, TFile } from 'obsidian';
import { parseCitationsInMarkdown, EquationRef } from '@/utils/citation_utils';
import EquationCitator from '@/main';
import Debugger from '@/debug/debugger';

interface CachedCitations {
    hash: string;
    lastUpdateTime: number;
    citations: EquationRef[];
}

export class CitationCache {
    private cache: Map<string, CachedCitations> = new Map();
    private forceUpdateTimeout: number;
    private maxCacheSize = 30;

    constructor(private plugin: EquationCitator) {
        // update cache every 3 seconds if access 
        this.forceUpdateTimeout = plugin.settings.cacheUpdateTime ?? 3000;
    }

    /**
     * Get citations for a file, which is called in postProcessor  
     * @param sourcePath 
     * @returns 
     */
    async getCitationsForFile(sourcePath: string): Promise<EquationRef[] | undefined> {
        const key = sourcePath;
        // check if file exists in vault 
        const file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) {
            this.cache.delete(key);
            return [];
        }

        const cached = this.cache.get(key);  // try get citation from cache 
        const needsUpdate = !cached || Date.now() - cached.lastUpdateTime > this.forceUpdateTimeout; // check if cache need to update  
        if (needsUpdate) {
            await this.updateCache(sourcePath); // update cache if needed 
        }
        return this.cache.get(key)?.citations;
    }

    async updateCache(sourcePath: string): Promise<void> {
        this.autoCleanCache(); // clean cache when update 

        const key = sourcePath; // just use the file path as the hash 
        const file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) {
            // file has been deleted or not parsed yet, delete cache 
            this.cache.delete(key);
            return;
        }
        try {
            const markdown = await this.plugin.app.vault.read(file);
            const citations = parseCitationsInMarkdown(markdown);
            this.cache.set(key, { hash: key, lastUpdateTime: Date.now(), citations: citations });
        }
        catch (error) {
            this.cache.delete(key);
            new Notice('Failed to update citation cache, turn on debug mode for details in console.');
            Debugger.error(error);
        }
    }

    async deleteCache(sourcePath: string): Promise<void> {
        this.cache.delete(sourcePath);
    }

    private autoCleanCache(): void {
        const now = Date.now();
        const autoClearTime = this.plugin.settings.cacheCleanTime ?? 300000;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.lastUpdateTime > autoClearTime) {
                this.cache.delete(key);
            }
        }
        // If cache size is too large, remove oldest entries 
        if (this.cache.size > this.maxCacheSize) { 
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].lastUpdateTime - b[1].lastUpdateTime);
            for (let i = 0; i < Math.floor(this.maxCacheSize / 2); i++) {
                this.cache.delete(entries[i][0]);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}
