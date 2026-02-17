import { Notice, TFile, normalizePath } from 'obsidian';
import EquationCitator from '@/main';
import { isMarkdownFilePath } from '@/utils/misc/fileProcessor';
import Debugger from '@/debug/debugger';

/**
 * @internal
 * Internal cache structure for storing data with metadata
 */
export interface CachedData<T> {
    hash: string;
    lastUpdated: number;
    data: T[];
}

export abstract class BaseCacheSimple<T> {
    public isDestroyed = false;

    protected cache: Map<string, CachedData<T>> = new Map();
    protected maxCacheSize = 30;
    protected forceUpdateTimeout: number;
    private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(protected plugin: EquationCitator) {
        this.forceUpdateTimeout = plugin.settings.cacheUpdateTime ?? 5000;
        this.startAutoCleanup();
    }

    get(key: string): T[] | undefined {
        if (this.isDestroyed) return undefined;
        const cached = this.cache.get(key);
        if (!cached) return undefined;

        const cacheUpdateTime = this.plugin.settings.cacheUpdateTime ?? 5000;
        const isExpired = Date.now() - cached.lastUpdated > cacheUpdateTime;

        if (isExpired) {
            this.cache.delete(key);
            return undefined;
        }
        return this.cache.get(key)?.data;
    }

    set(key: string, data: T[]): void {
        if (this.isDestroyed) return;

        this.cache.set(key, {
            hash: key,
            lastUpdated: Date.now(),
            data,
        });
        Debugger.log(`${this.getCacheTypeName()} data cached for key: ${key}`);
    }

    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            Debugger.log(`${this.getCacheTypeName()} data deleted for key: ${key}`);
        }
        return deleted;
    }

    clear(): void {
        this.cache.clear();
    }

    destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        this.stopAutoCleanup();
        this.clear();  // Clear cache to free up memory

        Debugger.log(`${this.getCacheTypeName()} cache destroyed`);
    }

    getValidKeys(): string[] {
        const now = Date.now();
        const cacheUpdateTime = this.plugin.settings.cacheUpdateTime ?? 5000;
        const validKeys: string[] = [];
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.lastUpdated <= cacheUpdateTime) {
                validKeys.push(key);
            }
        }
        return validKeys;
    }

    protected autoCleanCache(): void {
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

    private startAutoCleanup(): void {
        if (this.cleanupTimer || this.isDestroyed) return;

        const cleanTime = this.plugin.settings.cacheCleanTime ?? 90000; // 默认90秒
        this.cleanupTimer = setInterval(() => {
            if (!this.isDestroyed) {
                this.autoCleanCache();
            }
        }, cleanTime);

        Debugger.log(`${this.getCacheTypeName()} cache auto-cleanup started, interval: ${cleanTime}ms`);
    }

    private stopAutoCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            Debugger.log(`${this.getCacheTypeName()} cache auto-cleanup stopped`);
        }
    }

    /**
     * Get statistcs about the cache 
     */
    getCacheStats(): { size: number; oldestEntry?: number; newestEntry?: number } {
        const entries = Array.from(this.cache.values());
        if (entries.length === 0) {
            return { size: 0 };
        }
        const timestamps = entries.map(entry => entry.lastUpdated);
        return {
            size: entries.length,
            oldestEntry: Math.min(...timestamps),
            newestEntry: Math.max(...timestamps),
        };
    }

    // Abstract methods that subclasses need to implement
    /**
     * Get the name of the cache type, used for logging and debugging
     */
    protected abstract getCacheTypeName(): string;
}

export abstract class BaseCache<T> extends BaseCacheSimple<T> {
    protected cache: Map<string, CachedData<T>> = new Map();
    /**
     * Retrieve data for a file, updating the cache if needed
     * @param sourcePath
     * @returns
     */
    async getDataForFile(sourcePath: string): Promise<T[] | undefined> {
        const normalizedPath = normalizePath(sourcePath);
        const key = normalizedPath;
        // Check if file exists in the vault
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        // only use valid markdown files 
        if (!(isMarkdownFilePath(normalizedPath) && file instanceof TFile)) {
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
        if (this.isDestroyed) return;
        this.autoCleanCache();  // Also clean cache before updating 

        const normalizedPath = normalizePath(sourcePath);
        const key = normalizedPath;
        const file = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (!(isMarkdownFilePath(normalizedPath) && file instanceof TFile)) {
            this.cache.delete(key);
            return;
        }
        try {
            // use cachedRead to improve performance
            const markdown = await this.plugin.app.vault.cachedRead(file);
            const data = this.parseMarkdown(markdown);
            this.cache.set(key, { hash: key, lastUpdated: Date.now(), data: data });
        }
        catch (error) {
            this.cache.delete(key);
            new Notice(`Failed to update ${this.getCacheTypeName()} cache, turn on debug mode for details`);
            Debugger.error(error);
        }
    }
    /**
     * If use getDataForFile, this method will be called to parse the markdown into the desired data type
     */
    protected abstract parseMarkdown(markdown: string): T[];
}
