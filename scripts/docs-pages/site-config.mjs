export const DOCS_ROUTE_PREFIX = "/obsidian-equation-citator";
export const SOURCE_REPOSITORY = "FRIEDparrot/obsidian-equation-citator";

export const SITE_BASE_URL = `https://friedparrot.github.io${DOCS_ROUTE_PREFIX}/`;
export const SOURCE_REPOSITORY_URL = `https://github.com/${SOURCE_REPOSITORY}`;
export const TYPE_DOC_SOURCE_LINK_TEMPLATE = `${SOURCE_REPOSITORY_URL}/blob/master/{path}#L{line}`;

export const GENERATED_SOURCE_ROOT = "/src";
export const TUTORIALS_ROOT = "/tutorials";
export const CHANGELOGS_ROOT = "/changelogs";


export const equationCitatorPathMapping =  [
    {  [TUTORIALS_ROOT]:  TUTORIALS_ROOT },
    {  [CHANGELOGS_ROOT]:  CHANGELOGS_ROOT },
];

function normalizeWebPath(filePath) {
    return String(filePath).replaceAll("\\", "/").replace(/^\/+/, "");
}

export function markdownEnvPath(sourcePath, generatedSourceRoot = GENERATED_SOURCE_ROOT) {
    const root = String(generatedSourceRoot).replaceAll("\\", "/").replace(/\/+$/, ""); // nosonar
    return `${root}/${normalizeWebPath(sourcePath)}`;
}
