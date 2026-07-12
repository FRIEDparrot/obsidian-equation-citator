import { promises as fs } from "node:fs";
import path from "node:path";

export function normalizePath(filePath) {
    return filePath.replaceAll("\\", "/");
}

export function prettyTitleFromName(name) {
    return name
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function ensureTrailingSlash(filePath) {
    if (!filePath || filePath.endsWith("/")) {
        return filePath;
    }

    return `${filePath}/`;
}

export function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
}

export function encodeHrefPath(href) {
    if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) {
        return href;
    }

    const [pathAndQuery, hashPart] = href.split("#", 2);
    const [pathPart, queryPart] = pathAndQuery.split("?", 2);
    const encodedPath = pathPart
        .split("/")
        .map(segment => segment === "." || segment === ".." ? segment : encodeURIComponent(segment))
        .join("/");
    const querySuffix = queryPart === undefined ? "" : `?${queryPart}`;
    const hashSuffix = hashPart === undefined ? "" : `#${encodeURIComponent(hashPart)}`;

    return `${encodedPath}${querySuffix}${hashSuffix}`;
}

export function stripHtmlTags(text) {
    return text.replace(/<[^>]+>/g, "").trim();  // nosonar
}

export function stripLeadingHeading(contentHtml) {
    return contentHtml.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, "").trim();
}

export function stripFrontmatter(markdown) {
    const normalizedMarkdown = markdown.replaceAll('\r\n', "\n");
    if (!normalizedMarkdown.startsWith("---\n")) {
        return markdown;
    }

    const endIndex = normalizedMarkdown.indexOf("\n---", 4);
    if (endIndex < 0) {
        return markdown;
    }

    return normalizedMarkdown.slice(endIndex + "\n---".length);
}

export async function writeFile(filePath, content) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
}

export async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Recursively collects files under `rootDirectoryPath` that satisfy
 * `includeFile`. Directory traversal is depth-first and returns absolute paths
 * because callers compare and write files relative to explicit source roots.
 */
export async function collectFiles(rootDirectoryPath, { includeFile }) {
    const files = [];
    const entries = await fs.readdir(rootDirectoryPath, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(rootDirectoryPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(entryPath, { includeFile }));
            continue;
        }

        if (includeFile(entryPath)) {
            files.push(entryPath);
        }
    }

    return files;
}
