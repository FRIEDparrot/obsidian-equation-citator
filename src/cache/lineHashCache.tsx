import { fastHash } from "@/utils/hash_utils";
import { BaseCache } from "@/cache/baseCache";
import { find_array } from "@/utils/array_utils";

export interface LineHash {
    line: number;
    hash: number;
}

export class LineHashCache extends BaseCache<LineHash> {
    protected getCacheTypeName(): string {
        return "linehash";
    }
    protected parseMarkdown(markdown: string): LineHash[] {
        const lineHashes = makeLineHash(markdown);
        return lineHashes;
    }
    // alias 
    async getLineHashForFile(sourcePath: string): Promise<LineHash[] | undefined> {
        return this.getDataForFile(sourcePath);
    }
}


function makeLineHash(content: string): LineHash[] {
    const lines = content.split('\n');
    const lineHashes = lines.map(line => fastHash(line));
    return lineHashes.map((hash, index) => ({ line: index, hash: hash }));
}

export function testLineHash(
    content: string,
    lineHashes: LineHash[],
    lineStart: number,
    lineEnd: number,
): boolean {
    const lines = content.split('\n');
    if (lines.length !== lineEnd - lineStart + 1) {
        return false;
    }
    const hashMap = new Map(lineHashes.map(lh => [lh.line, lh.hash]));
    for (let i = lineStart; i <= lineEnd; i++) {
        if (!hashMap.has(i)) return false;
        const hash = hashMap.get(i);
        const textHash = fastHash(lines[i - lineStart]);
        if (hash !== textHash) {
            return false;
        }
    }
    return true;
}

/**
 * using KMP algorithm for find the location of line hash in the content. 
 * return the index of the first line hash if found. 
 * return -1 if not found. 
 * better worst-case performance
 */
export function findLineHashLocation(content: string, lineHash: LineHash[]): number {
    if (lineHash.length === 0) return -1;
    const sortedLineHash = [...lineHash].sort((a, b) => a.line - b.line);
    const target = sortedLineHash.map(item => item.hash);

    const lines = content.split('\n');
    if (lines.length === 0) return -1;
    const pattern = lines.map(line => fastHash(line));
    
    const idx = find_array(pattern, target);
    return idx;
}