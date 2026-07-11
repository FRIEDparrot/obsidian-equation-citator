import EquationCitator from "@/main";
import { makeExportedMarkdownForPdf } from "@/func/exportMarkdown";
import Debugger from "@/debug/debugger";
import { FileSystemAdapter, Notice, Platform, TAbstractFile, TFile, TFolder, Vault, normalizePath } from "obsidian";
import { fileNameMatchesMarkdownPatterns } from "@/utils/misc/file_pattern_utils";
import {
    getNodeFileSystemModules,
    isPathInsideOrEqual,
    normalizeAbsolutePathForComparison,
    removeExternalExportPath,
    resolvePathInsideFolder,
} from "@/utils/misc/desktop_fs_utils";
import { t } from "@/i18n/getLocale";
import type { WebsiteNotesExcludedFolder } from "@/settings/defaultSettings";

/** Name of the JSON file used to track which files were exported in the previous sync run. */
const EXPORT_INDEX_FILE_NAME = ".equation-citator-export-index.json";
/** Human-readable comment written into the export index for discoverability. */
const EXPORT_INDEX_COMMENT = "this file is created to track the exported files by equation citator last time.";

/**
 * Shape of the export-index JSON file persisted in the website-notes folder.
 * Used to detect stale generated files that should be cleaned on the next sync.
 */
interface WebsiteExportIndex {
    /** Explanatory comment so anyone inspecting the file knows its purpose. */
    _comment: string;
    /** Schema version of the index format (currently `1`). */
    version: number;
    /** ISO-8601 timestamp of when the index was written. */
    generatedAt: string;
    /** Vault-relative paths (normalized) of every file exported in the last sync. */
    files: string[];
}

/**
 * Counters returned after a sync completes, surfaced in the success notice.
 */
interface SyncStats {
    /** Number of markdown files that were processed through the export pipeline. */
    exportedMarkdownCount: number;
    /** Number of markdown files that were directly copied (pattern-matched). */
    copiedMarkdownCount: number;
    /** Number of non-markdown asset files copied alongside the exported notes. */
    copiedAssetCount: number;
    /** Number of previously-exported files cleaned because they no longer exist. */
    cleanedStaleCount: number;
}

/**
 * Returns the absolute filesystem path of the Obsidian vault, or `null` when
 * running on a platform (e.g. mobile) that doesn't expose a {@link FileSystemAdapter}.
 */
function getVaultBasePath(plugin: EquationCitator): string | null {
    const adapter = plugin.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }

    return null;
}

/**
 * Normalises a vault-absolute path into the form used as the relative key inside
 * the export folder and export index.
 */
function toExportRelativePath(vaultPath: string): string {
    return normalizePath(vaultPath);
}

/**
 * Resolves a vault-relative path against the export folder, validating that the
 * result stays inside the export root. Returns `null` for path-traversal attempts.
 */
function resolveExportPath(exportFolder: string, relativePath: string): string | null {
    return resolvePathInsideFolder(exportFolder, relativePath);
}

/**
 * Determines whether a markdown file should be copied as-is (binary copy) rather
 * than processed through the export pipeline. Files whose name matches one of the
 * configured {@link ignoredPatterns} are directly copied.
 */
function shouldDirectCopyMarkdown(file: TFile, ignoredPatterns: string[]): boolean {
    return fileNameMatchesMarkdownPatterns(file, ignoredPatterns);
}

function isMarkdownFile(file: TAbstractFile): file is TFile {
    return file instanceof TFile && file.extension === "md";
}

/**
 * Tests whether a vault-relative file path is inside a configured excluded folder.
 * Folder rules are vault-relative and match both the folder path itself and nested children.
 */
function pathIsInsideFolder(filePath: string, folderPath: string): boolean {
    const normalizedFilePath = normalizePath(filePath);
    const normalizedFolderPath = normalizePath(folderPath).replace(/^\/+|\/+$/g, "");  // nosonar

    return normalizedFilePath === normalizedFolderPath || normalizedFilePath.startsWith(`${normalizedFolderPath}/`);
}

function isPathInExcludedWebsiteNotesFolder(
    filePath: string,
    excludedFolders: WebsiteNotesExcludedFolder[]
): boolean {
    return excludedFolders.some(folder => pathIsInsideFolder(filePath, folder.path));
}

function isPathInCompletelyIgnoredWebsiteNotesFolder(
    filePath: string,
    excludedFolders: WebsiteNotesExcludedFolder[]
): boolean {
    return excludedFolders.some(folder => folder.completelyIgnore && pathIsInsideFolder(filePath, folder.path));
}

/**
 * Filters markdown files selected by repository/folder sync before export starts.
 * Excluded folders are only entry-point filters; linked files under those folders
 * can still be exported unless their folder rule is marked as completely ignored.
 */
function getWebsiteNotesEntryMarkdownFiles(plugin: EquationCitator, markdownFiles: TFile[]): TFile[] {
    const excludedFolders = plugin.settings.websiteNotesExcludedFolders ?? [];
    if (excludedFolders.length === 0) {
        return markdownFiles;
    }

    return markdownFiles.filter(file => !isPathInExcludedWebsiteNotesFolder(file.path, excludedFolders));
}

function getFolderScopePredicate(folder: TFolder): (filePath: string) => boolean {
    const folderPath = normalizePath(folder.path);
    if (!folderPath || folderPath === "/") {
        return () => true;
    }

    const folderPrefix = `${folderPath}/`;
    return (filePath: string) => normalizePath(filePath).startsWith(folderPrefix);
}

function getMarkdownFilesInFolder(folder: TFolder): TFile[] {
    const markdownFiles: TFile[] = [];
    Vault.recurseChildren(folder, (file: TAbstractFile) => {
        if (isMarkdownFile(file)) {
            markdownFiles.push(file);
        }
    });

    return markdownFiles;
}

/**
 * Returns markdown files from a folder sync after applying website-note folder exclusions.
 */
function getWebsiteNotesMarkdownFilesInFolder(plugin: EquationCitator, folder: TFolder): TFile[] {
    return getWebsiteNotesEntryMarkdownFiles(plugin, getMarkdownFilesInFolder(folder));
}

/**
 * Validates that the export folder exists, is a directory, and that the Node
 * filesystem APIs are available. Shows a {@link Notice} to the user for each
 * failure case and returns `false`; returns `true` when the folder is usable.
 */
async function ensureExportFolderIsReady(exportFolder: string): Promise<boolean> {
    const { fs } = getNodeFileSystemModules() ?? {};
    if (!fs) {
        new Notice(t("sync.nodeFsUnavailable"));
        return false;
    }

    if (!exportFolder.trim()) {
        new Notice(t("sync.exportFolderNotSet"));
        return false;
    }

    try {
        const stats = await fs.stat(exportFolder);
        if (!stats.isDirectory()) {
            new Notice(t("sync.exportFolderNotFolder"));
            return false;
        }
    } catch (error) {
        Debugger.error("Website notes export folder is not accessible:", exportFolder, error);
        new Notice(t("sync.exportFolderMissing"));
        return false;
    }

    return true;
}

async function getReadyExportFolderOrNotice(plugin: EquationCitator): Promise<string | null> {
    if (!Platform.isDesktopApp) {
        new Notice(t("sync.desktopOnly"));
        return null;
    }

    const exportFolder = plugin.settings.websiteNotesExportFolder.trim();
    if (!await ensureExportFolderIsReady(exportFolder)) {
        return null;
    }

    const vaultBasePath = getVaultBasePath(plugin);
    if (vaultBasePath && isPathInsideOrEqual(vaultBasePath, exportFolder)) {
        new Notice(t("sync.exportFolderMustBeOutsideVault"));
        return null;
    }

    return exportFolder;
}

/**
 * Checks whether website-note sync actions can be shown in the file explorer
 * without doing filesystem I/O or displaying notices.
 *
 * Edge cases handled:
 * - Hides actions on mobile.
 * - Hides actions when the export folder setting is blank.
 * - Leaves full validation to the sync action, which can show a Notice.
 */
export function isWebsiteNotesSyncTargetReady(plugin: EquationCitator): boolean {
    if (!Platform.isDesktopApp) {
        return false;
    }

    return Boolean(plugin.settings.websiteNotesExportFolder.trim());
}

/**
 * Reads the previous export index from the export folder, if it exists.
 * Returns `null` when the file is missing, malformed, or the Node filesystem
 * APIs are unavailable.
 */
async function readPreviousExportIndex(exportFolder: string): Promise<WebsiteExportIndex | null> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        return null;
    }
    const { fs, path } = modules;
    const indexPath = path.join(exportFolder, EXPORT_INDEX_FILE_NAME);

    try {
        const content = await fs.readFile(indexPath, "utf8");
        const parsed = JSON.parse(content) as Partial<WebsiteExportIndex>;
        if (!Array.isArray(parsed.files)) {
            return null;
        }

        return {
            _comment: parsed._comment || EXPORT_INDEX_COMMENT,
            version: parsed.version || 1,
            generatedAt: parsed.generatedAt || "",
            files: parsed.files.filter(file => typeof file === "string"),
        };
    } catch (error) {
        Debugger.log("No readable previous website export index found:", indexPath, error);
        return null;
    }
}

/**
 * Persists the export index JSON file so the next sync run can detect which
 * files have become stale. Throws if the Node filesystem APIs are unavailable.
 */
async function writeExportIndex(exportFolder: string, exportedFiles: Set<string>): Promise<void> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        throw new Error("Node file system APIs are not available.");
    }
    const { fs, path } = modules;
    const index: WebsiteExportIndex = {
        _comment: EXPORT_INDEX_COMMENT,
        version: 1,
        generatedAt: new Date().toISOString(),
        files: Array.from(exportedFiles).sort((a, b) => a.localeCompare(b)),
    };

    await fs.writeFile(
        path.join(exportFolder, EXPORT_INDEX_FILE_NAME),
        `${JSON.stringify(index, null, 2)}\n`,
        "utf8"
    );
}

/**
 * Updates the export index after a partial sync without forgetting unrelated
 * exported files.
 *
 * @param removePredicate - Optional predicate for previous-index paths that
 * should be replaced by this sync. Folder sync uses it to refresh only the
 * selected folder's subtree; file sync leaves it unset so older paths remain.
 *
 * Edge cases handled:
 * - Missing or malformed previous indexes are treated as empty indexes.
 */
async function writeMergedExportIndex(
    exportFolder: string,
    previousIndex: WebsiteExportIndex | null,
    exportedFiles: Set<string>,
    removePredicate?: (filePath: string) => boolean
): Promise<void> {
    const mergedFiles = new Set<string>();

    for (const previousFile of previousIndex?.files ?? []) {
        if (!removePredicate?.(previousFile)) {
            mergedFiles.add(previousFile);
        }
    }

    for (const exportedFile of exportedFiles) {
        mergedFiles.add(exportedFile);
    }

    await writeExportIndex(exportFolder, mergedFiles);
}

/**
 * Writes an exported markdown file to the export folder. Creates intermediate
 * directories as needed. Throws if the resolved path escapes the export root
 * or if the Node filesystem APIs are unavailable.
 *
 * @param exportFolder - Absolute path to the website-notes export root.
 * @param relativePath - Vault-relative path used to derive the output location.
 * @param content - The processed markdown string to write.
 */
async function writeTextFile(exportFolder: string, relativePath: string, content: string): Promise<void> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        throw new Error("Node file system APIs are not available.");
    }
    const { fs, path } = modules;
    const targetPath = resolveExportPath(exportFolder, relativePath);
    if (!targetPath) {
        throw new Error(`Unsafe export path: ${relativePath}`);
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, "utf8");
}

/**
 * Copies a vault file to the export folder as binary data, preserving its
 * vault-relative path structure. Used for directly-copied markdown (pattern
 * match) and referenced asset files. Throws if the resolved path escapes the
 * export root.
 *
 * @param exportFolder - Absolute path to the website-notes export root.
 */
async function copyVaultFile(plugin: EquationCitator, exportFolder: string, file: TFile): Promise<void> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        throw new Error("Node file system APIs are not available.");
    }
    const { fs, path } = modules;
    const relativePath = toExportRelativePath(file.path);
    const targetPath = resolveExportPath(exportFolder, relativePath);
    if (!targetPath) {
        throw new Error(`Unsafe export path: ${relativePath}`);
    }

    const data = await plugin.app.vault.readBinary(file);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, new Uint8Array(data));
}

/**
 * Removes previously-exported files that are not present in the current sync.
 * Compares the previous export index against the set of files written this run
 * and permanently removes stale generated files. Afterwards, it cleans up empty
 * directories that were left behind.
 *
 * @param previousFiles - Export-relative paths recorded in the previous export
 * index.
 * @param currentFiles - Export-relative paths written or copied during this
 * sync run.
 * @param shouldConsiderFile - Optional scope predicate for previous-index paths.
 * Folder sync uses it to clean only stale files inside the selected folder,
 * while repository sync accepts the default and considers every indexed path.
 *
 * Edge cases handled:
 * - Skips previous-index entries whose resolved paths would escape the export folder.
 * - Skips files that were already removed outside the plugin between sync runs.
 * - Skips non-file paths so stale directory entries are not treated as exported files.
 * - Stops the sync if a stale file exists but cannot be removed,
 *   keeping the previous index from silently forgetting an unmanaged leftover.
 *
 * @returns The number of stale files that were cleaned.
 */
async function cleanStaleExportedFiles(
    exportFolder: string,
    previousFiles: string[],
    currentFiles: Set<string>,
    shouldConsiderFile: (filePath: string) => boolean = () => true
): Promise<number> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        throw new Error("Node file system APIs are not available.");
    }
    const { fs, path } = modules;

    let cleanedCount = 0;
    const exportFolderForComparison = normalizeAbsolutePathForComparison(exportFolder);
    const dirsToClean = new Set<string>();

    for (const previousFile of previousFiles) {
        if (!shouldConsiderFile(previousFile) || currentFiles.has(previousFile)) continue;

        const targetPath = resolveExportPath(exportFolder, previousFile);
        if (!targetPath) {
            Debugger.error("Skipped stale export index entry because it resolves outside the export folder:", previousFile);
            continue;
        }

        const targetPathForComparison = normalizeAbsolutePathForComparison(targetPath);
        if (!isPathInsideOrEqual(exportFolderForComparison, targetPathForComparison)) {
            Debugger.error("Skipped stale export path outside export folder:", previousFile, targetPath);
            continue;
        }

        let stats: Awaited<ReturnType<typeof fs.stat>>;
        try {
            stats = await fs.stat(targetPath);
        } catch (error) {
            Debugger.log("Stale exported file was already removed from the filesystem:", previousFile, targetPath, error);
            continue;
        }

        if (!stats.isFile()) continue;

        const removed = await removeExternalExportPath(targetPath);
        if (!removed) {
            Debugger.error("Failed to clean stale exported file:", previousFile, targetPath);
            throw new Error(`Failed to clean stale export: ${previousFile}`);
        }

        Debugger.log("Stale exported file cleaned:", previousFile, targetPath);
        dirsToClean.add(path.dirname(targetPath));
        cleanedCount++;
    }

    await cleanEmptyExportDirectories(exportFolder, dirsToClean);

    return cleanedCount;
}

/**
 * Recursively cleans empty directories inside the export folder, walking
 * upward from each candidate directory until a non-empty ancestor or the
 * export root is reached. Silently skips directories that cannot be cleaned
 * (e.g. because they still contain files).
 *
 * Edge cases handled:
 * - Never moves the export root itself.
 * - Re-checks each directory before cleanup so newly-created files are preserved.
 * - Walks deepest directories first so nested empty folders can be cleaned up.
 * - Stops at the first non-empty, missing, outside-root, or unremovable ancestor.
 */
async function cleanEmptyExportDirectories(exportFolder: string, dirsToClean: Set<string>): Promise<void> {
    const modules = getNodeFileSystemModules();
    if (!modules) {
        return;
    }
    const { fs, path } = modules;
    const exportFolderForComparison = normalizeAbsolutePathForComparison(exportFolder);

    const sortedDirs = Array.from(dirsToClean).sort((a, b) => b.length - a.length);
    for (const dir of sortedDirs) {
        let currentDir = dir;

        while (
            currentDir &&
            normalizeAbsolutePathForComparison(currentDir) !== exportFolderForComparison &&
            isPathInsideOrEqual(exportFolderForComparison, normalizeAbsolutePathForComparison(currentDir))
        ) {
            try {
                const remainingEntries = await fs.readdir(currentDir);
                if (remainingEntries.length > 0) {
                    Debugger.log("Skipped export directory cleanup because directory is not empty:", currentDir, remainingEntries);
                    break;
                }

                const removed = await removeExternalExportPath(currentDir);
                if (!removed) {
                    Debugger.error("Failed to clean empty export directory:", currentDir);
                    break;
                }

                Debugger.log("Empty export directory cleaned:", currentDir);
            } catch (error) {
                Debugger.log("Skipped export directory cleanup after filesystem error:", currentDir, error);
                break;
            }

            currentDir = path.dirname(currentDir);
        }
    }
}

/**
 * Collects every non-markdown file that is linked from the given set of
 * markdown files (images, PDFs, etc.). Uses Obsidian's resolved-link cache
 * so the lookup is synchronous and does not require parsing each file.
 *
 * @returns Deduplicated array of referenced {@link TFile} objects.
 */
function collectReferencedFiles(plugin: EquationCitator, sourceMarkdownFiles: TFile[]): TFile[] {
    const referencedFiles = new Map<string, TFile>();

    for (const sourceFile of sourceMarkdownFiles) {
        const links = plugin.app.metadataCache.resolvedLinks[sourceFile.path];
        if (!links) {
            continue;
        }

        for (const linkedPath of Object.keys(links)) {
            if (isPathInCompletelyIgnoredWebsiteNotesFolder(
                linkedPath,
                plugin.settings.websiteNotesExcludedFolders ?? []
            )) {
                continue;
            }

            const linkedFile = plugin.app.vault.getAbstractFileByPath(linkedPath);
            if (linkedFile instanceof TFile) {
                referencedFiles.set(linkedFile.path, linkedFile);
            }
        }
    }

    return Array.from(referencedFiles.values());
}

/**
 * Iterates the provided markdown files and exports them to the website-notes
 * folder. Files matching the ignored-pattern list are binary-copied as-is; all
 * others are run through {@link makeExportedMarkdownForPdf} to produce the final
 * output.
 *
 * @returns The set of exported vault-relative paths, the count of processed
 *          (pipeline-exported) files, and the count of directly-copied files.
 */
async function exportMarkdownFiles(
    plugin: EquationCitator,
    exportFolder: string,
    markdownFiles: TFile[],
    exportedFiles: Set<string>
): Promise<{
    exportedMarkdownPaths: Set<string>;
    processedCount: number;
    copiedCount: number;
}> {
    const exportedMarkdownPaths = new Set<string>();
    let processedCount = 0;
    let copiedCount = 0;

    for (const file of markdownFiles) {
        const relativePath = toExportRelativePath(file.path);
        exportedMarkdownPaths.add(relativePath);
        exportedFiles.add(relativePath);

        if (shouldDirectCopyMarkdown(file, plugin.settings.websiteNotesExportIgnoredFilePatterns)) {
            await copyVaultFile(plugin, exportFolder, file);
            copiedCount++;
            continue;
        }

        const exportedMarkdown = await makeExportedMarkdownForPdf(plugin, file);
        await writeTextFile(exportFolder, relativePath, exportedMarkdown ?? "");
        processedCount++;
    }

    return { exportedMarkdownPaths, processedCount, copiedCount };
}

async function exportMarkdownFilesAndReferences(
    plugin: EquationCitator,
    exportFolder: string,
    markdownFiles: TFile[],
    exportedFiles: Set<string>
): Promise<Omit<SyncStats, "cleanedStaleCount">> {
    const { exportedMarkdownPaths, processedCount, copiedCount } = await exportMarkdownFiles(
        plugin,
        exportFolder,
        markdownFiles,
        exportedFiles
    );
    const copiedAssetCount = await exportReferencedAssets(
        plugin,
        exportFolder,
        markdownFiles,
        exportedMarkdownPaths,
        exportedFiles
    );

    return {
        exportedMarkdownCount: processedCount,
        copiedMarkdownCount: copiedCount,
        copiedAssetCount,
    };
}

/**
 * Exports non-markdown assets (images, PDFs, etc.) that are linked from the
 * exported markdown files. Skips assets whose vault-relative path would clash
 * with an already-exported markdown path. A file already present in
 * {@link exportedFiles} is also skipped (no duplicate copies).
 *
 * @returns The number of asset files that were copied.
 * @throws If a referenced non-markdown file's path collides with an exported
 *         markdown path (same relative path, different extension).
 */
async function exportReferencedAssets(
    plugin: EquationCitator,
    exportFolder: string,
    sourceMarkdownFiles: TFile[],
    exportedMarkdownPaths: Set<string>,
    exportedFiles: Set<string>
): Promise<number> {
    const referencedFiles = collectReferencedFiles(plugin, sourceMarkdownFiles);
    let copiedAssetCount = 0;

    for (const referencedFile of referencedFiles) {
        const relativePath = toExportRelativePath(referencedFile.path);

        if (exportedMarkdownPaths.has(relativePath)) {
            if (referencedFile.extension !== "md") {
                throw new Error(`Referenced asset conflicts with exported markdown path: ${relativePath}`);
            }
            continue;
        }

        if (exportedFiles.has(relativePath)) {
            continue;
        }

        await copyVaultFile(plugin, exportFolder, referencedFile);
        exportedFiles.add(relativePath);
        copiedAssetCount++;
    }

    return copiedAssetCount;
}

/**
 * Syncs the entire vault's markdown content (and its referenced assets) to a
 * designated website-notes export folder on disk.
 *
 * ## What it does
 *
 * 1. Validates the export folder exists and is outside the vault.
 * 2. Reads the previous export index so stale files can be cleaned up.
 * 3. Exports every markdown file; files matching the configured ignore
 *    patterns are binary-copied; all others are processed through
 *    {@link makeExportedMarkdownForPdf}.
 * 4. Copies non-markdown assets (images, PDFs, etc.) referenced by the
 *    exported notes.
 * 5. Cleans files from the previous run that are no longer present.
 * 6. Writes a fresh export index for the next run.
 *
 * Only available on desktop (relies on Node.js `fs` APIs). Shows a
 * {@link Notice} on success (with counts) or failure (with the error message).
 */
export async function syncRepositoryToWebsiteNotesFolder(plugin: EquationCitator): Promise<void> {
    const exportFolder = await getReadyExportFolderOrNotice(plugin);
    if (!exportFolder) {
        return;
    }

    const previousIndex = await readPreviousExportIndex(exportFolder);
    const exportedFiles = new Set<string>();
    const markdownFiles = getWebsiteNotesEntryMarkdownFiles(plugin, plugin.app.vault.getMarkdownFiles());

    try {
        const exportStats = await exportMarkdownFilesAndReferences(plugin, exportFolder, markdownFiles, exportedFiles);
        const cleanedStaleCount = previousIndex ?
            await cleanStaleExportedFiles(exportFolder, previousIndex.files, exportedFiles) :
            0;

        await writeExportIndex(exportFolder, exportedFiles);

        const stats: SyncStats = {
            ...exportStats,
            cleanedStaleCount,
        };
        new Notice(t("sync.repositorySynced", {
            exported: stats.exportedMarkdownCount,
            copied: stats.copiedMarkdownCount,
            assets: stats.copiedAssetCount,
            cleaned: stats.cleanedStaleCount,
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Debugger.error("Website notes sync failed:", error);
        new Notice(t("sync.repositoryFailed", { message }));
    }
}

export async function syncCurrentFileToWebsiteNotesFolder(plugin: EquationCitator): Promise<void> {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile || !isMarkdownFile(activeFile)) {
        new Notice(t("sync.noActiveMarkdownFile"));
        return;
    }

    await syncFileToWebsiteNotesFolder(plugin, activeFile);
}

/**
 * Syncs one markdown file and its referenced assets without stale cleanup.
 *
 * Edge cases handled:
 * - Rejects non-markdown files before touching the export folder.
 * - Merges exported paths into the previous index without removing older paths,
 *   because single-file sync cannot infer which other exports are stale.
 * - Uses the same ignored-file direct-copy behavior as repository sync.
 */
export async function syncFileToWebsiteNotesFolder(plugin: EquationCitator, file: TFile): Promise<void> {
    if (!isMarkdownFile(file)) {
        new Notice(t("sync.onlyMarkdownFiles"));
        return;
    }

    const exportFolder = await getReadyExportFolderOrNotice(plugin);
    if (!exportFolder) {
        return;
    }

    const previousIndex = await readPreviousExportIndex(exportFolder);
    const exportedFiles = new Set<string>();

    try {
        const exportStats = await exportMarkdownFilesAndReferences(plugin, exportFolder, [file], exportedFiles);
        await writeMergedExportIndex(exportFolder, previousIndex, exportedFiles);

        new Notice(t("sync.fileSynced", {
            exported: exportStats.exportedMarkdownCount,
            copied: exportStats.copiedMarkdownCount,
            assets: exportStats.copiedAssetCount,
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Debugger.error("Website note file sync failed:", file.path, error);
        new Notice(t("sync.fileFailed", { message }));
    }
}

/**
 * Syncs every markdown file in a folder and performs folder-scoped cleanup.
 *
 * Edge cases handled:
 * - Exports nested markdown files recursively through Obsidian's folder tree.
 * - Removes stale indexed files only when their paths are inside the selected
 *   folder scope and were not overwritten by this sync.
 * - Keeps indexed files outside the selected folder intact.
 * - Merges newly exported referenced assets into the index, even when those
 *   assets live outside the folder cleanup scope.
 */
export async function syncFolderToWebsiteNotesFolder(plugin: EquationCitator, folder: TFolder): Promise<void> {
    const exportFolder = await getReadyExportFolderOrNotice(plugin);
    if (!exportFolder) {
        return;
    }

    const markdownFiles = getWebsiteNotesMarkdownFilesInFolder(plugin, folder);
    if (markdownFiles.length === 0) {
        new Notice(t("sync.noMarkdownInFolder"));
        return;
    }

    const previousIndex = await readPreviousExportIndex(exportFolder);
    const exportedFiles = new Set<string>();
    const folderScopePredicate = getFolderScopePredicate(folder);

    try {
        const exportStats = await exportMarkdownFilesAndReferences(plugin, exportFolder, markdownFiles, exportedFiles);
        const cleanedStaleCount = previousIndex ?
            await cleanStaleExportedFiles(exportFolder, previousIndex.files, exportedFiles, folderScopePredicate) :
            0;

        await writeMergedExportIndex(exportFolder, previousIndex, exportedFiles, folderScopePredicate);

        new Notice(t("sync.folderSynced", {
            exported: exportStats.exportedMarkdownCount,
            copied: exportStats.copiedMarkdownCount,
            assets: exportStats.copiedAssetCount,
            cleaned: cleanedStaleCount,
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Debugger.error("Website note folder sync failed:", folder.path, error);
        new Notice(t("sync.folderFailed", { message }));
    }
}
