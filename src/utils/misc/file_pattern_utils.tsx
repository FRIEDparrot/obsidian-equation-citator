import { TFile } from "obsidian";

export function normalizeMarkdownFilePattern(pattern: string): string | null {
    const trimmedPattern = pattern.trim();

    if (!trimmedPattern || /[\\/]/.test(trimmedPattern)) {
        return null;
    }

    if (trimmedPattern.toLowerCase().endsWith(".md")) {
        return trimmedPattern;
    }

    return `${trimmedPattern}.md`;
}

export function wildcardPatternToRegExp(pattern: string): RegExp {
    const escaped = pattern.replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`).replaceAll("*", ".*").replaceAll("?", ".");
    return new RegExp(`^${escaped}$`, "i");
}

export function fileNameMatchesMarkdownPatterns(file: TFile, patterns: string[]): boolean {
    const normalizedPatterns = patterns
        .map(pattern => normalizeMarkdownFilePattern(pattern))
        .filter((pattern): pattern is string => pattern !== null);

    return normalizedPatterns.some(pattern => wildcardPatternToRegExp(pattern).test(file.name));
}
