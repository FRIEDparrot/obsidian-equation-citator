import { Platform } from "obsidian";
import Debugger from "@/debug/debugger";

type SafeWindow = Window & {
    require?: (moduleName: string) => unknown;
};

export interface NodeFileSystemModules {
    fs: {
        stat(filePath: string): Promise<{ isDirectory(): boolean; isFile(): boolean }>;
        readFile(filePath: string, encoding: "utf8"): Promise<string>;
        writeFile(filePath: string, data: string | Uint8Array, encoding?: "utf8"): Promise<void>;
        mkdir(directoryPath: string, options: { recursive: true }): Promise<string | undefined>;
        readdir(directoryPath: string): Promise<string[]>;
        rm(filePath: string, options: { recursive: boolean; force: boolean }): Promise<void>;
    };
    path: {
        resolve(...paths: string[]): string;
        join(...paths: string[]): string;
        dirname(filePath: string): string;
    };
}

let cachedModules: NodeFileSystemModules | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isFileSystemModule(value: unknown): value is NodeFileSystemModules["fs"] {
    return isRecord(value) &&
        typeof value.stat === "function" &&
        typeof value.readFile === "function" &&
        typeof value.writeFile === "function" &&
        typeof value.mkdir === "function" &&
        typeof value.readdir === "function" &&
        typeof value.rm === "function";
}

function isPathModule(value: unknown): value is NodeFileSystemModules["path"] {
    return isRecord(value) &&
        typeof value.resolve === "function" &&
        typeof value.join === "function" &&
        typeof value.dirname === "function";
}

function normalizePathSeparators(pathText: string): string {
    let normalizedPath = pathText.replaceAll('\\', "/");
    while (normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath.slice(0, -1);
    }

    return normalizedPath;
}

function safeRequire(moduleName: string): unknown {
    if (!Platform.isDesktop) {
        return null;
    }

    try {
        return (window as SafeWindow).require?.(moduleName) ?? null;
    } catch (error) {
        Debugger.error(`Failed to require Node module: ${moduleName}`, error);
        return null;
    }
}

/**
 * Returns the desktop Node modules needed for external export cleanup, or null on mobile.
 */
export function getNodeFileSystemModules(): NodeFileSystemModules | null {
    if (cachedModules !== undefined) {
        return cachedModules;
    }

    const fs = safeRequire("node:fs/promises") ?? safeRequire("fs/promises");
    const path = safeRequire("node:path") ?? safeRequire("path");

    cachedModules = isFileSystemModule(fs) && isPathModule(path) ? { fs, path } : null;
    return cachedModules;
}

export function normalizeAbsolutePathForComparison(filePath: string): string {
    const { path } = getNodeFileSystemModules() ?? {};
    if (!path) {
        return normalizePathSeparators(filePath).toLowerCase();
    }

    return normalizePathSeparators(path.resolve(filePath)).toLowerCase();
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
