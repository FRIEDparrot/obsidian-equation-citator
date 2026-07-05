import type * as FsPromises from "fs/promises";
import type * as Path from "path";
import Debugger from "@/debug/debugger";

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
    } catch (error) {
        Debugger.error("Failed to load Node filesystem modules.", error);
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
