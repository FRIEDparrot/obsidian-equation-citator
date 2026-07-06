import type * as FsPromises from "node:fs/promises";
import type * as Path from "node:path";
import Debugger from "@/debug/debugger";

type SafeWindow  = Window &  {
    require?: (moduleName: string) => unknown;
}

export interface NodeFileSystemModules {
    fs: typeof FsPromises;
    path: typeof Path;
}

let cachedModules: NodeFileSystemModules | null | undefined; 

function safeRequire<T>(moduleName: string): T | null {
    try {
        return ((window as SafeWindow).require?.(moduleName) as T | undefined) ?? null;
    } catch {
        Debugger.error(`Failed to require Node module: ${moduleName}`);
        return null;
    }
}

export function getNodeFileSystemModules() :  NodeFileSystemModules | null {
    if (cachedModules !== undefined) {
        return cachedModules;
    }

    const fs =
        safeRequire<typeof FsPromises>("node:fs/promises") ??
        safeRequire<typeof FsPromises>("fs/promises");
    const path =
        safeRequire<typeof Path>("node:path") ??
        safeRequire<typeof Path>("path");

    cachedModules = fs && path ? { fs, path } : null;
    return cachedModules;
}

export function normalizeAbsolutePathForComparison(filePath: string): string {
    const { path } = getNodeFileSystemModules() ?? {};
    if (!path) {
        return filePath.replaceAll('\\', "/").replace(/\/+$/, "").toLowerCase();
    }

    return path.resolve(filePath).replaceAll('\\', "/").replace(/\/+$/, "").toLowerCase();
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

/**
 * Removes an absolute desktop filesystem path produced by website-note export.
 *
 * Edge cases handled:
 * - Uses `fs.rm` because website-note outputs are generated artifacts.
 * - Does not call shell, PowerShell, or command-runner fallbacks.
 * - Logs whether the path was permanently removed.
 * - Returns `false` only when permanent removal fails.
 */
export async function removeExternalExportPath(filePath: string): Promise<boolean> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        Debugger.error("Cannot permanently remove external export path because Node filesystem modules are unavailable:", filePath);
        return false;
    }

    try {
        await modules.fs.rm(filePath, { recursive: true, force: true });
        Debugger.log("Permanently removed external export path:", filePath);
        return true;
    } catch (error) {
        Debugger.error("Failed to permanently remove external export path:", filePath, error);
        return false;
    }
}
