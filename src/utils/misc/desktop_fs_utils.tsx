import type * as FsPromises from "fs/promises";
import type * as Path from "path";

export interface NodeFileSystemModules {
    fs: typeof FsPromises;
    path: typeof Path;
}

export function getNodeFileSystemModules(): NodeFileSystemModules | null {
    try {
        return {
            // Node APIs are only available in the desktop app.
            fs: require("fs/promises") as typeof FsPromises,
            path: require("path") as typeof Path,
        };
    } catch {
        return null;
    }
}

export function normalizeAbsolutePathForComparison(filePath: string): string {
    const { path } = getNodeFileSystemModules() ?? {};
    if (!path) {
        return filePath.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    }

    return path.resolve(filePath).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function isPathInsideOrEqual(parentPath: string, targetPath: string): boolean {
    const parent = normalizeAbsolutePathForComparison(parentPath);
    const target = normalizeAbsolutePathForComparison(targetPath);

    return target === parent || target.startsWith(`${parent}/`);
}

export function resolvePathInsideFolder(parentFolder: string, relativePath: string): string | null {
    const { path } = getNodeFileSystemModules() ?? {};
    if (!path) {
        return null;
    }

    const absoluteParentFolder = path.resolve(parentFolder);
    const targetPath = path.resolve(absoluteParentFolder, ...relativePath.split("/"));

    if (isPathInsideOrEqual(absoluteParentFolder, targetPath)) {
        return targetPath;
    }

    return null;
}
