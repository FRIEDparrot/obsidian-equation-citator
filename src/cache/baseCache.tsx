import { Notice, TFile } from 'obsidian';
import EquationCitator from '@/main';
import Debugger from '@/debug/debugger';

interface CachedData<T> {
    hash: string;
    lastUpdated: number;
    data: T[];
}

export abstract class BaseCache<T> {
    protected cache: Map<string, CachedData<T>> = new Map();
    private forceUpdateTimeout: number;
    private maxCacheSize = 30;

    constructor(protected plugin: EquationCitator) {
        this.forceUpdateTimeout = plugin.settings.cacheUpdateTime ?? 3000;
    }

    /**
     * Retrieve data for a file, updating the cache if needed
     * @param sourcePath
     * @returns
     */
    async getDataForFile(sourcePath: string): Promise<T[] | undefined> {
        const key = sourcePath;
        // Check if file exists in the vault
        const file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) {
            this.cache.delete(key);
            return [];
        }
        const cached = this.cache.get(key);
        const needsUpdate = !cached || Date.now() - cached.lastUpdated > this.forceUpdateTimeout;
        if (needsUpdate) {
            await this.updateCache(sourcePath);
        }
        return this.cache.get(key)?.data;
    }

    async updateCache(sourcePath: string): Promise<void> {
        this.autoCleanCache();

        const key = sourcePath;
        const file = this.plugin.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof TFile)) {
            this.cache.delete(key);
            return;
        }
        try {
            const markdown = await this.plugin.app.vault.read(file);
            const data = this.parseMarkdown(markdown);
            this.cache.set(key, { hash: key, lastUpdated: Date.now(), data: data });
        }
        catch (error) {
            this.cache.delete(key);
            new Notice(`Failed to update ${this.getCacheTypeName()} cache, turn on debug mode for details in console.`);
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
            if (now - value.lastUpdated > autoClearTime) {
                this.cache.delete(key);
            }
        }
        
        if (this.cache.size > this.maxCacheSize) { 
            const entries = Array.from(this.cache.entries());
            // Sort entries by last updated time
            entries.sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);
            // Remove half of the oldest entries to limit cache size
            for (let i = 0; i < Math.floor(this.maxCacheSize / 2); i++) {
                this.cache.delete(entries[i][0]);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }

    // Abstract methods that subclasses need to implement
    protected abstract parseMarkdown(markdown: string): T[];
    protected abstract getCacheTypeName(): string;
}