import type * as FsPromises from "fs/promises";
import type * as Path from "path";

export interface NodeFileSystemModules {
    fs: typeof FsPromises;
    path: typeof Path;
}

interface ElectronShell {
    trashItem?: (path: string) => Promise<void>;
    moveItemToTrash?: (path: string) => boolean;
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

function getElectronShell(): ElectronShell | null {
    try {
        const electron = require("electron") as { shell?: ElectronShell };
        return electron.shell ?? null;
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

/**
 * Moves an absolute desktop filesystem path to the OS trash through Electron.
 *
 * Edge cases handled:
 * - Supports both `trashItem` and older `moveItemToTrash` Electron APIs.
 * - Returns `false` when Electron is unavailable, which can happen on mobile
 *   or in non-desktop test environments.
 * - Returns `false` on trash failures instead of falling back to hard deletion.
 */
export async function movePathToSystemTrash(filePath: string): Promise<boolean> {
    const shell = getElectronShell();
    if (shell?.trashItem) {
        try {
            await shell.trashItem(filePath);
            return true;
        } catch {
            return false;
        }
    }

    if (shell?.moveItemToTrash) {
        try {
            return shell.moveItemToTrash(filePath);
        } catch {
            return false;
        }
    }

    return false;
}
